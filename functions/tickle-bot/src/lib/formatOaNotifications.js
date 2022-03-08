import debug from 'debug';
import envConfig from '../envConfig';
import constants from '../constants';

const dlog = debug('that:api:ticklebot:formatOaNotifications');

export default function sendOaNotifications({ eventNotifications }) {
  dlog(
    'formatOaNotifications called with %d event(s)',
    eventNotifications?.length,
  );
  if (!eventNotifications?.length || eventNotifications?.length < 1)
    return { postmarkMessages: [] };
  // start by preparing postmark message collection
  const { postmark } = envConfig;
  const { emailFrom } = postmark;
  const ownerTemplate =
    constants.POSTMARK.TEMPLATES.ORDER_OWNER_NOT_TRANSFERRED;
  const holderTemplate =
    constants.POSTMARK.TEMPLATES.TICKET_HOLDER_NOT_COMPLETE;
  const messages = [];
  const validateMessages = [];

  eventNotifications.forEach(en => {
    const event = {
      id: en.eventId,
      name: en.eventName,
      startDate: en.startDate,
      endDate: en.endDate,
    };
    const orderOwnersMap = en.orderOwners;
    const ticketHoldersMap = en.ticketHolders;

    // first we'll add order owners
    // Map.forEach((value, key) => {})
    orderOwnersMap.forEach((orderInfo, orderId) => {
      const pmMessage = {
        from: emailFrom,
        to: orderInfo.ownerEmail,
        tag: 'TicketOrder_Unassigned_Tickets',
        trackOpens: true,
        templateAlias: ownerTemplate,
        templateModel: {
          member: {
            firstName: orderInfo.ownerFirstName,
            lastName: orderInfo.ownerLastName,
          },
          order: {
            id: orderId,
            unallocatedTicketCount: orderInfo.unallocatedTicketCount,
          },
          event,
        },
        metadata: {
          orderId,
          unallocatedTicketCnt: orderInfo.unallocatedTicketCount,
        },
      };
      const ckMessages = {
        from: emailFrom,
        to: orderInfo.ownerEmail,
        tag: 'TicketOrder_Unassigned_Tickets',
        templateAlias: ownerTemplate,
        that: {
          orderAllocationIds: orderInfo.orderAllocationIds,
        },
      };
      messages.push(pmMessage);
      validateMessages.push(ckMessages);
    });

    // next are the ticket holders incomplete tickets
    // Map.forEach((value, key) => {})
    ticketHoldersMap.forEach((allocations, holderEmail) => {
      // TODO: iterate through allocations :(
      const member = {};
      const tickets = allocations.map((a, idx) => {
        const ticket = {
          id: a.id,
          name: a?.product?.name,
          enrollmentStatus: a.enrollmentStatus,
        };
        if (idx === 0) {
          member.firstName = a?.allocatedTo?.firstName;
          member.lastName = a?.allocatedTo?.lastName;
        }
        return ticket;
      });

      const pmMessage = {
        from: emailFrom,
        to: holderEmail,
        tag: 'TicketHolder_Not_Complete',
        trackOpens: true,
        templateAlias: holderTemplate,
        templateModel: {
          member,
          event,
          tickets,
        },
        metadata: {
          allocationIdCount: tickets.length,
        },
      };
      const ckMessages = {
        from: emailFrom,
        to: holderEmail,
        tag: 'TicketHolder_Not_Complete',
        templateAlias: holderTemplate,
        that: {
          orderAllocationIds: tickets.map(t => t.id),
        },
      };
      messages.push(pmMessage);
      validateMessages.push(ckMessages);
    });
  });
  // dlog('our messages:\n%O', messages);
  if (messages.length !== validateMessages.length)
    throw new Error('messages and validationMessages length mismatch');

  return {
    postmarkMessages: messages,
    validationMessages: validateMessages,
  };
}
