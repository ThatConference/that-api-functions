import debug from 'debug';
import dayjs from 'dayjs';

import calculateNotificationSendFreq from './calculateSendFrequency';

const dlog = debug('that:api:ticklebot:parseOaNotifications');

export default function parseOaNotifications({ events }) {
  dlog(`parseOaNotifications called on ${events?.length} event(s)`);
  // each event we'll be sending notifications for
  const eventNotifications = [];
  // all the notified orderAllocations.
  // This array will be used for updating them as notified
  const counts = {};
  const now = new Date();

  events.forEach(event => {
    dlog('working on event %s (%s)', event.name, event.id);
    const _counts = {};
    const working = {
      eventId: event.id,
      eventName: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      orderOwners: new Map(),
      ticketHolders: new Map(),
    };
    const eventSendFreq = calculateNotificationSendFreq(event.startDate);
    const allocations = event.admin.orderAllocations;
    for (let i = 0; i < allocations.length; i += 1) {
      const alloc = allocations[i];
      const dateLastSent = alloc.notificationSentAt ?? alloc.order.createdAt;
      const daysLastSent = dayjs(now).diff(dateLastSent, 'd');

      if (alloc.order.orderType === 'SPEAKER') {
        // pass-over speaker orders
        _counts.SPEAKER = _counts.SPEAKER ? (_counts.SPEAKER += 1) : 1;
      } else if (eventSendFreq > daysLastSent) {
        // Skip sending too soon.
        _counts.FREQ_SKIP = _counts.FREQ_SKIP ? (_counts.FREQ_SKIP += 1) : 1;
      } else if (alloc.allocatedTo === null) {
        // add to order Owner
        const orderId = alloc.order.id;
        dlog('adding order %s', orderId);
        const orderInfo = working.orderOwners.get(orderId) ?? {};

        orderInfo.unallocatedTicketCount = orderInfo.unallocatedTicketCount
          ? orderInfo.unallocatedTicketCount + 1
          : 1;
        orderInfo.ownerEmail = alloc.order.member.email;
        orderInfo.ownerFirstName = alloc.order.member.firstName;
        orderInfo.ownerLastName = alloc.order.member.lastName;
        if (orderInfo.orderAllocationIds)
          orderInfo.orderAllocationIds.push(alloc.id);
        else orderInfo.orderAllocationIds = [alloc.id];

        working.orderOwners.set(orderId, orderInfo);
      } else if (alloc.enrollmentStatus !== 'COMPLETE') {
        // add to ticket holder
        const ticketHolderEmail = alloc.allocatedTo.email;
        dlog('adding holder %s', ticketHolderEmail);
        const holdersList = working.ticketHolders.get(ticketHolderEmail) ?? [];
        holdersList.push(alloc);
        working.ticketHolders.set(ticketHolderEmail, holdersList);
      }

      _counts[alloc.order.orderType] = _counts[alloc.order.orderType]
        ? (_counts[alloc.order.orderType] += 1)
        : 1;
    }

    counts[working.eventId] = _counts;
    eventNotifications.push(working);
  });

  return { eventNotifications, counts };
}
