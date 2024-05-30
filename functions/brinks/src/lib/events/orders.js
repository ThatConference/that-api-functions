import { EventEmitter } from 'events';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import dateformat from 'dateformat';
import slackNotification from '../notifications/slack';
import setFollowPurchasedEvents from '../setFollowPurchasedEvents';
import { SetFollowError, SendEmailError } from '../errors';
import constants from '../../constants';
import sendTransactionEmail from '../postmark/sendTransactional';

const dlog = debug('that:fn:brinks:orderEventEmitter');
const eventStore = dataSources.cloudFirestore.event;
const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

// Event Emitter
export default function orderEvents() {
  const orderEventEmitter = new EventEmitter();
  dlog('order event emitter created');

  // Supporting Functions
  // Assuming non-bulk membership orders only
  function validateIsMembershipOrder({ orderAllocations, member }) {
    dlog('validating order contains membership purchase');
    if (!member || !member.email) {
      dlog('Skipped, no member object'); // manual order, don't send thank you email
      Sentry.captureMessage(
        'No member object sent with membership thank you email request',
        'warning',
      );
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
        scope.setLevel('info');
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
          scope.setLevel('warning');
          Sentry.captureMessage(
            `Event accepted speaker not found while writing orderId back to acceptedSpeakers collection`,
          );
        });
        return false;
      }

      return true;
    }

    dlog('not a speaker order, returning');
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
    return setFollowPurchasedEvents({
      orderAllocations,
      firestore,
    }).catch(err =>
      process.nextTick(() =>
        orderEventEmitter.emit(
          constants.ORDER_EVENT_EMITTER.ERROR_SET_FOLLOW,
          err,
        ),
      ),
    );
  }

  function sendPreValidatedTicketThankYou({ member, event, sections }) {
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
      sections,
    };
    if (templateModel.sections.hasWorkshop === true) {
      templateModel.sections.hasWorkshop = {
        event: {
          slug: event.slug,
        },
      };
    }

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias: event.emailTemplateTicketPurchased,
      templateModel,
      tag: 'ticket-purchase',
    })
      .then(r => dlog('sendTicketThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
            templateModel,
          ),
        ),
      );
  }

  function sendPreValidatedFamilyTicketThankYou({ member, event }) {
    // sent when order contains a family ticket
    dlog('sendPreValidatedFamilyticketThankYou called');

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
      templateAlias:
        event.emailTemplateFamilyPurchased ||
        'in-person-family-purchase-thankyou',
      templateModel,
      tag: 'family-purchase',
    })
      .then(r => dlog('sendTicketThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
            templateModel,
          ),
        ),
      );
  }

  function sendPartnerThankYou({ member, event, sections }) {
    dlog('sendPartnerThankYou called');
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
      sections,
    };
    if (templateModel.sections.hasWorkshop === true) {
      templateModel.sections.hasWorkshop = {
        event: {
          slug: event.slug,
        },
      };
    }

    return sendTransactionEmail({
      mailTo: member.email,
      templateAlias:
        event.emailTemplatePartnerOrder || 'in-person-partner-order-thankyou',
      templateModel,
      tag: 'partner-order',
    })
      .then(r => dlog('sendTicketThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
            templateModel,
          ),
        ),
      );
  }

  function sendExpoHallThankYou({ member, event }) {
    dlog('sendExpoHallThankYou called');
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
      templateAlias: 'expo-hall-only-thank-you',
      templateModel,
      tag: 'expo-hall-only',
    })
      .then(r => dlog('sendExpoHallThankYou result: %o', r))
      .catch(err =>
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
            templateModel,
          ),
        ),
      );
  }

  async function validateOrderForThankYou({
    member,
    firestore,
    order,
    orderAllocations,
  }) {
    dlog('validateOrderForThankYou called');
    if (!member || !member.email) {
      dlog('Skipped, no member object');
      // used to be case with manual orders which now include member
      // this is now a reportable error.
      Sentry.configureScope(scope => {
        scope.setTag('orderId', order.id);
        scope.setTag('process', 'validate order for thank you email');
        scope.setContext('order stringified', JSON.stringify(order));
        scope.setLevel('error');
        Sentry.captureException(
          new SendEmailError(
            'No member record sent with order for sending thank you email',
          ),
        );
      });

      return undefined;
    }

    if (order.orderType === 'SPEAKER') {
      dlog('Skip, not sending purchase email on speaker order');
      return undefined;
    }

    const membership = orderAllocations.find(
      oa => oa.productType === constants.THAT.PRODUCT_TYPE.MEMBERSHIP,
    );
    const tickets = orderAllocations.filter(
      oa => oa.productType === constants.THAT.PRODUCT_TYPE.TICKET,
    );

    if (tickets?.length < 1) {
      dlog('Skipped, no tickets in orderAllocations');
      return undefined;
    }
    if (membership && tickets?.length < 1) {
      dlog('skip, membership order, not handled here');
      return undefined;
    }
    if (membership && tickets?.length > 0) {
      dlog('error: membership and tickets on same order');
      Sentry.configureScope(scope => {
        scope.setTag('orderId', order.id);
        scope.setTag('process', 'validate order for thank you email');
        scope.setContext('order stringified', JSON.stringify(order));
        scope.setLevel('error');
        Sentry.captureException(
          new SendEmailError(
            'Membership and tickets on same order. This is not valid.',
          ),
        );
      });

      return undefined;
    }
    // Order's ticket makeup
    const camperTics = orderAllocations.filter(oa =>
      oa.eventActivities?.includes('CAMPER'),
    );
    const preConfTics = orderAllocations.filter(oa =>
      oa.eventActivities?.includes('PRE_CONFERENCE'),
    );
    const familyTics = orderAllocations.filter(oa =>
      ['GEEKLING', 'CAMPMATE'].includes(oa.uiReference),
    );
    const expoHallTics = orderAllocations.filter(oa =>
      oa.eventActivities?.includes('EXPO_HALL'),
    );
    const sections = {
      isOrderEmail: true,
      hasMultipleTickets: false,
      hasWorkshop: false,
    };

    if (camperTics.length > 1 || preConfTics.length > 1)
      sections.hasMultipleTickets = true;
    if (preConfTics.length > 0) sections.hasWorkshop = true;

    const [ticket] = tickets;
    let event;
    try {
      event = await eventStore(firestore).get(ticket.event);
    } catch (err) {
      process.nextTick(() => orderEventEmitter.emit('error', err));
      return undefined;
    }

    if (!event) {
      Sentry.configureScope(scope => {
        scope.setTag('ticketEventId', ticket.event);
        scope.setContext('ticket', { ticket });
        scope.setLevel('error');
        Sentry.captureMessage(
          `Event ${ticket.event} not found for sending ticket thank you`,
        );
      });
      dlog(`Skipped, event %s not found`, ticket.event);
      return undefined;
    }

    // Check for Expo Hall only ticket, if exists fire and return
    // currently no supporting Expo Hall tickets on an order they are claimed by participant
    if (expoHallTics?.length > 0) {
      dlog('firing off expo hall only ticket email');
      orderEventEmitter.emit(
        constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_EXPO_HALL,
        { member, event },
      );

      return true;
    }

    // checks done needed for partner type, if so fire and return
    if (order.orderType === 'PARTNER') {
      dlog('firing partner email event emitter');
      orderEventEmitter.emit(
        constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_PARTNER,
        {
          member,
          event,
          sections,
        },
      );

      return true;
    }

    if (!event.emailTemplateTicketPurchased) {
      Sentry.configureScope(scope => {
        scope.setTag('ticketEventId', ticket.event);
        scope.setContext('ticket', { ticket });
        scope.setLevel('error');
        Sentry.captureException(
          new SendEmailError(
            `Event ${event.name} (${event.id}), doesn't have an ticket thank you email template set`,
          ),
        );
      });
      return undefined;
    }

    dlog('firing validated for thank you');
    orderEventEmitter.emit(
      constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_THANKYOU,
      {
        sections,
        member,
        event,
        order,
        orderAllocations,
        firestore,
      },
    );

    if (familyTics.length > 0) {
      dlog('firing family');
      orderEventEmitter.emit(
        constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_FAMILY,
        {
          member,
          event,
        },
      );
    }

    return true;
  }

  // Assuming non-bulk membership orders only
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
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
          ),
        ),
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
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
          ),
        ),
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
        process.nextTick(() =>
          orderEventEmitter.emit(
            constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
            err,
          ),
        ),
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
      scope.setLevel('info');
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

  function sendEventErrorToSentry(error, templateModel) {
    dlog('orderEventEmitter error:: %o', error);
    console.log('orderEventEmitter error:: %o', error.message);
    if (templateModel) {
      Sentry.setContext('Template Model', { templateModel });
    }
    Sentry.configureScope(scope => {
      scope.setTag('eventEmitter', 'functionError');
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.ORDER_CREATED,
    sendNewOrderSlack,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.ORDER_CREATED,
    setFollowEventOnPurchase,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.ORDER_CREATED,
    validateOrderForThankYou,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.ORDER_CREATED,
    sendMembershipThankYou,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.ORDER_CREATED,
    setOrderOnAcceptedSpeaker,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.SUBSCRIPTION_CHANGE,
    sendSubChangedSlack,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.SUBSCRIPTION_CHANGE,
    sendMembershipCancelEmail,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.SUBSCRIPTION_RENEW,
    sendSubRenewalSlack,
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.SUBSCRIPTION_RENEW,
    sendMembershipRenewalThankyou,
  );

  // Called after validateOrderForThankYou is 👍
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_THANKYOU,
    sendPreValidatedTicketThankYou,
  );

  // family products (emitter in case there is more to do in the future)
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_FAMILY,
    sendPreValidatedFamilyTicketThankYou,
  );

  // partner orders (emitter in case there is more to do in the future)
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_PARTNER,
    sendPartnerThankYou,
  );

  // expo hall only orders
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.VALIDATED_FOR_EXPO_HALL,
    sendExpoHallThankYou,
  );

  // Error handlers
  orderEventEmitter.on(constants.ORDER_EVENT_EMITTER.ERROR_SET_FOLLOW, err =>
    sendEventErrorToSentry(new SetFollowError(err.message)),
  );
  orderEventEmitter.on(
    constants.ORDER_EVENT_EMITTER.ERROR_SEND_EMAIL,
    (err, templateModel) =>
      sendEventErrorToSentry(new SendEmailError(err.message), templateModel),
  );
  orderEventEmitter.on('error', err => sendEventErrorToSentry(err));

  return orderEventEmitter;
}
