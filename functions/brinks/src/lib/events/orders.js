import { EventEmitter } from 'events';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import slackNotification from '../notifications/slack';
import setFollowPurchasedEvents from '../setFollowPurchasedEvents';
import { SetFollowError, SendEmailError } from '../errors';
import constants from '../../constants';
import sendTransactionEmail from '../postmark/sendTransactional';

const dlog = debug('that:api:brinks:events:order');
const eventStore = dataSources.cloudFirestore.event;
const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

export default function orderEvents() {
  const orderEventEmitter = new EventEmitter();
  dlog('order event emitter created');

  function sendNewOrderSlack({ order, products, member }) {
    dlog('sendNewOrderSlack called');
    slackNotification.newOrder({ order, products, member });
  }

  function sendSubChangedSlack({ member, subscriptionId, cancelAtPeriodEnd }) {
    dlog('send subscription changed slack');
    slackNotification.subscriptionChanged({
      member,
      subscriptionId,
      cancelAtPeriodEnd,
    });
  }

  function sendSubRenewalSlack({ member, subscriptionId }) {
    dlog('send subscription renewed slack');
    slackNotification.subscriptionRenewed({
      member,
      subscriptionId,
    });
  }

  function setFollowEventOnPurchase({ firestore, orderAllocations }) {
    dlog('setFollowEventOnPurcase called');
    setFollowPurchasedEvents({ orderAllocations, firestore }).catch(err =>
      process.nextTick(() => orderEventEmitter.emit('setFollowError', err)),
    );
  }

  // Assuming non-bulk oders only
  async function sendTicketThankYou({ orderAllocations, member, firestore }) {
    dlog('sendTicketThankYou called');
    if (!member || !member.email) {
      dlog('Skipped, no member object'); // manual order, don't send thank you email
      return undefined;
    }
    const ticket = orderAllocations.find(
      oa =>
        oa.allocatedTo && oa.productType === constants.THAT.PRODUCT_TYPE.TICKET,
    );
    if (!ticket) {
      dlog('Skipped, no tickets in orderAllocations');
      return undefined;
    }
    if (ticket.allocatedTo !== member.id) {
      dlog('Skipped, allocatedTo and memberId mismatch');
      return undefined;
    }
    let event;
    try {
      event = await eventStore(firestore).get(ticket.event);
    } catch (err) {
      process.nextTick(() => orderEventEmitter.emit('sendEmailError', err));
      return undefined;
    }

    if (!event) {
      Sentry.configureScope(scope => {
        scope.setTag('ticketEventId', ticket.event);
        scope.setContext('ticket', { ticket });
        scope.setLevel(Sentry.Severity.Info);
        Sentry.captureMessage(
          `Event ${ticket.event} not found for sending ticket thank you`,
        );
      });
      return `Skipped, event ${ticket.event} not found`;
    }

    if (!event.emailTemplateTicketPurchased) {
      Sentry.configureScope(scope => {
        scope.setTag('ticketEventId', ticket.event);
        scope.setContext('ticket', { ticket });
        scope.setLevel(Sentry.Severity.Warning);
        Sentry.captureMessage(
          `Event ${event.name} (${event.id}), doesn't have an ticket thank you email template set`,
        );
      });
      return undefined;
    }

    const templateModel = {
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
      },
      event: {
        name: event.name,
        startDate: event.startDate,
        stopDate: event.stopDate,
        slug: event.slug,
        type: event.type,
      },
    };

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias: event.emailTemplateTicketPurchased,
      templateModel,
    })
      .then(r => dlog('sendTicketThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('sendEmailError', err)),
      );
  }

  // Assuming non-bulk orders only
  function sendMembershipThankYou({ orderAllocations, member }) {
    dlog('sendMembershipThankYou called');
    if (!member || !member.email) {
      dlog('Skipped, no member object'); // manual order, don't send thank you email
      return undefined;
    }

    const membership = orderAllocations.find(
      oa =>
        oa.allocatedTo &&
        oa.productType === constants.THAT.PRODUCT_TYPE.MEMBERSHIP,
    );
    if (!membership) {
      dlog('Skipped, no memberships in orderAllocations');
      return undefined;
    }

    if (membership.allocatedTo !== member.id) {
      Sentry.configureScope(scope => {
        scope.setTag('membershipThankYouEmail', 'failed');
        scope.setLevel(Sentry.Severity.Info);
        scope.setContext('orderAllocation', { membership });
        scope.setContext('member', { member });
        Sentry.captureMessage('Skipped, allocatedTo and memberId mismatch');
      });
      dlog('Skipped, allocatedTo and memberId mismatch');
      return undefined;
    }

    const templateModel = {
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
        membershipExpirationDate: member.membershipExpirationDate,
      },
    };

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias: constants.POSTMARK.TEMPLATES.PURCHASE_MEMBERSHIP,
      templateModel,
    })
      .then(r => dlog('sendjMembershipThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('sendEmailError', err)),
      );
  }

  async function setOrderOnAcceptedSpeaker({ order, firestore }) {
    dlog('setOrderOnAcceptedSpeaker called');
    if (order.orderType === 'SPEAKER') {
      let eventSpeaker;
      try {
        eventSpeaker = await eventSpeakerStore(firestore).get({
          eventId: order.event,
          memberId: order.member,
        });
      } catch (err) {
        process.nextTick(() => orderEventEmitter.emit('error', err));
      }

      if (!eventSpeaker) {
        Sentry.configureScope(scope => {
          scope.setContext('order', { order });
          scope.setLevel(Sentry.Severity.Warning);
          Sentry.captureMessage(
            `Event accepted speaker not found writing orderId back to acceptedSpeakers collection`,
          );
        });
        return undefined;
      }

      Sentry.withScope(scope => {
        Sentry.setContext('order stringified', {
          orderString: JSON.stringify(order) ?? 'undefined',
        });
        Sentry.setContext('order', { orderRaw: order });
        scope.setTag('orderId', order.id ?? 'undefined');
        scope.setLevel(Sentry.Severity.Info);
        Sentry.captureMessage(`Speaker order created information.`);
      });

      const esUpdate = { orderId: order.id || 'do manual lookup' };
      return eventSpeakerStore(firestore)
        .update({
          eventId: order.event,
          memberId: order.member,
          updateObj: esUpdate,
        })
        .catch(err => {
          process.nextTick(() => orderEventEmitter.emit('error', err));
        });
    }
    return undefined;
  }

  function sendEventErrorToSentry(error) {
    dlog('orderEventEmitter error:: %o', error);
    console.log('orderEventEmitter error:: %o', error.message);
    Sentry.configureScope(scope => {
      scope.setTag('eventEmitter', 'functionError');
      scope.setLevel(Sentry.Severity.Warning);
      Sentry.captureException(error);
    });
  }

  orderEventEmitter.on('orderCreated', sendNewOrderSlack);
  orderEventEmitter.on('orderCreated', setFollowEventOnPurchase);
  orderEventEmitter.on('orderCreated', sendTicketThankYou);
  orderEventEmitter.on('orderCreated', sendMembershipThankYou);
  orderEventEmitter.on('orderCreated', setOrderOnAcceptedSpeaker);
  orderEventEmitter.on('subscriptionChange', sendSubChangedSlack);
  orderEventEmitter.on('subscriptionRenew', sendSubRenewalSlack);

  orderEventEmitter.on('setFollowError', err =>
    sendEventErrorToSentry(new SetFollowError(err.message)),
  );
  orderEventEmitter.on('sendEmailError', err =>
    sendEventErrorToSentry(new SendEmailError(err.message)),
  );
  orderEventEmitter.on('error', err => sendEventErrorToSentry(err));

  return orderEventEmitter;
}
