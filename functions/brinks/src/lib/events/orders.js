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

export default function orderEvents() {
  const orderEventEmitter = new EventEmitter();
  dlog('order event emitter created');

  function sendNewOrderSlack({ order, products, member }) {
    dlog('sendNewOrderSlack called');
    slackNotification.newOrder({ order, products, member });
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
        scope.setContext({ ticket });
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

  orderEventEmitter.on('setFollowError', err =>
    sendEventErrorToSentry(new SetFollowError(err.message)),
  );
  orderEventEmitter.on('sendEmailError', err =>
    sendEventErrorToSentry(new SendEmailError(err.message)),
  );
  orderEventEmitter.on('error', err => sendEventErrorToSentry(err));

  return orderEventEmitter;
}
