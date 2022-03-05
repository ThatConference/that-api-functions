// Calculates notification send frequency based on the number of days before an event
import dayjs from 'dayjs';
import debug from 'debug';

const dlog = debug('that:api:ticklebot');

export default function calculateNotificationSendFreq(eventStartDate) {
  dlog('calculate send frequency from %s', eventStartDate);

  const daysDiff = dayjs(eventStartDate).diff(new Date(), 'd');

  // greater than 2 weeks, every 7 days
  // 1 week – 2 weeks, every 4 days
  // 4 days – 1 week, every 3 days
  // 0 days – 4 days, every 1 day

  let frequency = 7; // one week
  if (daysDiff > 14) {
    frequency = 7;
  } else if (daysDiff >= 8 && daysDiff <= 14) {
    frequency = 4;
  } else if (daysDiff >= 4 && daysDiff <= 7) {
    frequency = 3;
  } else if (daysDiff >= 0 && daysDiff <= 3) {
    frequency = 1;
  }

  dlog('calculated frequency is %d', frequency);
  return frequency;
}
