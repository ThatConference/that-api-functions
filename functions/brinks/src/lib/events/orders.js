import { EventEmitter } from 'events';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources, orbitLove } from '@thatconference/api';
import dateformat from 'dateformat';
import slackNotification from '../notifications/slack';
import setFollowPurchasedEvents from '../setFollowPurchasedEvents';
import { SetFollowError, SendEmailError } from '../errors';
import constants from '../../constants';
import sendTransactionEmail from '../postmark/sendTransactional';

const dlog = debug('that:api:brinks:events:order');
const eventStore = dataSources.cloudFirestore.event;
const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

// Event Emitter
export default function orderEvents() {
  const orderEventEmitter = new EventEmitter();
  dlog('order event emitter created');

  // Supporting Functions
  // Assuming non-bulk orders only
  function validateIsMembershipOrder({ orderAllocations, member }) {
    dlog('validating order contains membership purchase');
    if (!member || !member.email) {
      dlog('Skipped, no member object'); // manual order, don't send thank you email
      return false;
    }

    const membership = orderAllocations.find(
      oa =>
        oa.allocatedTo &&
        oa.productType === constants.THAT.PRODUCT_TYPE.MEMBERSHIP,
    );
    if (!membership) {
      dlog('Skipped, no memberships in orderAllocations');
      return false;
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
      return false;
    }

    return true;
  }

  async function validateIsSpeakerOrder({ order, firestore }) {
    // This call duplicates get to datastore for the two functions which call
    // this. It's still the cleanest way to do this currently, though there is
    // an extra call.
    dlog('validating that order is a speaker order');

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
            `Event accepted speaker not found while writing orderId back to acceptedSpeakers collection`,
          );
        });
        return false;
      }

      return true;
    }

    return false;
  }

  // Emitter functions
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

  function sendPreValidatedTicketThankYou({ member, event }) {
    // Means ticket order was validated okay for sending an email for the order
    dlog('sendPreValidatedTicketThankYou called');

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
      tag: 'ticket-purchase',
    })
      .then(r => dlog('sendTicketThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('sendEmailError', err)),
      );
  }

  function sendOrbitLovePurchaseActivity({
    firestore,
    member,
    order,
    orderAllocations,
    event,
  }) {
    dlog('sendOrbitLovePurchase activity for %s', member.id);
    // Speaker orders are included, not a purchase
    if (order.orderType === 'SPEAKER') return undefined;

    const orbitLoveApi = orbitLove.orbitLoveApi({ firestore });
    const olActivityType = orbitLove.activityTypes;
    let activityType;
    if (
      orderAllocations.filter(p => p.uiReference.includes('VIRTUAL')).length > 0
    ) {
      activityType = olActivityType.purchase.onThat();
    } else if (
      orderAllocations.filter(p => p.uiReference.includes('CAMPER')).length > 0
    ) {
      activityType = olActivityType.purchase.atThat();
    } else {
      // not a camper ticket
      return undefined;
    }
    return orbitLoveApi
      .addPurchaseActivity({
        activityType,
        member,
        event,
      })
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('error', err)),
      );
  }

  // Assuming non-bulk orders only
  async function validateOrderForThankYou({
    member,
    firestore,
    order,
    orderAllocations,
  }) {
    dlog('sendTicketThankYou called');
    if (!member || !member.email) {
      dlog('Skipped, no member object'); // manual order, don't send thank you email
      return undefined;
    }
    if (order.orderType === 'SPEAKER') {
      dlog('Skip, not sending purchase email on speaker order');
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

    orderEventEmitter.emit('orderValidatedForThankyou', {
      member,
      event,
      order,
      orderAllocations,
      firestore,
    });
    return true;
  }

  // Assuming non-bulk orders only
  function sendMembershipThankYou({ orderAllocations, member }) {
    dlog('sendMembershipThankYou called');

    const checkResult = validateIsMembershipOrder({ orderAllocations, member });
    if (checkResult === false) return undefined;

    const templateModel = {
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
        membershipExpirationDate: dateformat(
          member.membershipExpirationDate,
          'mmmm d, yyyy',
        ),
      },
    };

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias: constants.POSTMARK.TEMPLATES.PURCHASE_MEMBERSHIP,
      templateModel,
      tag: 'membership-purchase',
    })
      .then(r => dlog('sendMembershipThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('sendEmailError', err)),
      );
  }

  function sendMembershipRenewalThankyou({ member }) {
    dlog('sendMembershipRenewalThankYou called');

    const templateModel = {
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
        membershipExpirationDate: dateformat(
          member.membershipExpirationDate,
          'mmmm d, yyyy',
        ),
      },
    };

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias: constants.POSTMARK.TEMPLATES.RENEW_MEMBERSHIP,
      templateModel,
      tag: 'membership-renewal',
    })
      .then(r => dlog('sendMembershipRenewalThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('sendEmailError', err)),
      );
  }

  function sendMembershipCancelEmail({ member, cancelAtPeriodEnd }) {
    dlog('sendMembershipCancelEmail called');

    // We only on
    if (cancelAtPeriodEnd === false) {
      dlog(
        `Subscriptiong doesn't end at period end, not sending cancellation email`,
      );
      return undefined;
    }

    const templateModel = {
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
        membershipExpirationDate: dateformat(
          member.membershipExpirationDate,
          'mmmm d, yyyy',
        ),
      },
    };

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias: constants.POSTMARK.TEMPLATES.CANCEL_MEMBERSHIP,
      templateModel,
      tag: 'membership-renewal',
    })
      .then(r => dlog('sendMembershipCencelEmail result: %o', r))
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('sendEmailError', err)),
      );
  }

  // assuming non-bulk orders only
  function sendOrbitLoveMembershipActivity({
    order,
    orderAllocations,
    member,
    firestore,
  }) {
    dlog('sendOrbitLoveMembershipAcivity for %s', member.id);
    const checkResult = validateIsMembershipOrder({ orderAllocations, member });
    if (checkResult === false) return undefined;

    const orbitLoveApi = orbitLove.orbitLoveApi({ firestore });

    return orbitLoveApi
      .addPurchaseActivity({
        activityType: orbitLove.activityTypes.purchase.membership(),
        order,
        member,
      })
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('error', err)),
      );
  }

  async function setOrderOnAcceptedSpeaker({ order, firestore }) {
    dlog('setOrderOnAcceptedSpeaker called');
    const checkResult = await validateIsSpeakerOrder({ order, firestore });
    if (checkResult === false) return undefined;

    Sentry.withScope(scope => {
      Sentry.setContext('order stringified', {
        orderString: JSON.stringify(order),
      });
      Sentry.setContext('order', { orderRaw: order });
      scope.setTag('orderId', order.id);
      scope.setLevel(Sentry.Severity.Info);
      Sentry.captureMessage(`Speaker Order created information.`);
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

  async function sendOrbitLoveSpeakerActivity({
    order,
    orderAllocations,
    member,
    firestore,
  }) {
    dlog('sendOrbitLoveSpeakerActivity for %s', member.id);
    const checkResult = await validateIsSpeakerOrder({ order, firestore });
    if (checkResult === false) return undefined;

    const orbitLoveApi = orbitLove.orbitLoveApi({ firestore });
    const olActivities = orbitLove.activityTypes;
    let activityType;
    if (orderAllocations.find(a => a.uiReference === 'COUNSELOR_AT_THAT')) {
      activityType = olActivities.speaker.acceptedAtThat();
    } else if (
      orderAllocations.find(a => a.uiReference === 'COUNSELOR_ON_THAT')
    ) {
      activityType = olActivities.speaker.acceptedOnThat();
    } else {
      Sentry.withScope(scope => {
        Sentry.setContext(
          'order allocations',
          JSON.stringify(orderAllocations),
        );
        scope.setTags({
          memberId: member.id,
          orderId: order.id,
        });
        scope.setLevel(Sentry.Severity.Warning);
        Sentry.captureMessage('Speaker order found without AT or ON ticket');
      });
      return undefined;
    }

    return orbitLoveApi
      .addSpeakerActivity({
        activityType,
        order,
        member,
      })
      .catch(err =>
        process.nextTick(() => orderEventEmitter.emit('error', err)),
      );
  }

  function sendEventErrorToSentry(error) {
    dlog('orderEventEmitter error:: %o', error);
    console.log('orderEventEmitter error:: %o', error.message);
    Sentry.configureScope(scope => {
      scope.setTag('eventEmitter', 'functionError');
      scope.setLevel(Sentry.Severity.Error);
      Sentry.captureException(error);
    });
  }

  orderEventEmitter.on('orderCreated', sendNewOrderSlack);
  orderEventEmitter.on('orderCreated', setFollowEventOnPurchase);
  orderEventEmitter.on('orderCreated', validateOrderForThankYou);
  orderEventEmitter.on('orderCreated', sendMembershipThankYou);
  orderEventEmitter.on('orderCreated', sendOrbitLoveMembershipActivity);
  orderEventEmitter.on('orderCreated', setOrderOnAcceptedSpeaker);
  orderEventEmitter.on('orderCreated', sendOrbitLoveSpeakerActivity);
  orderEventEmitter.on('subscriptionChange', sendSubChangedSlack);
  orderEventEmitter.on('subscriptionChange', sendMembershipCancelEmail);
  orderEventEmitter.on('subscriptionRenew', sendSubRenewalSlack);
  orderEventEmitter.on('subscriptionRenew', sendMembershipRenewalThankyou);
  // Called after validateOrderForThankYou is 👍
  orderEventEmitter.on(
    'orderValidatedForThankyou',
    sendPreValidatedTicketThankYou,
  );
  orderEventEmitter.on(
    'orderValidatedForThankyou',
    sendOrbitLovePurchaseActivity,
  );

  orderEventEmitter.on('setFollowError', err =>
    sendEventErrorToSentry(new SetFollowError(err.message)),
  );
  orderEventEmitter.on('sendEmailError', err =>
    sendEventErrorToSentry(new SendEmailError(err.message)),
  );
  orderEventEmitter.on('error', err => sendEventErrorToSentry(err));

  return orderEventEmitter;
}
