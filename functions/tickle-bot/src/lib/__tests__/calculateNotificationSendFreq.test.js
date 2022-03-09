import dayjs from 'dayjs';
import calculateNotificationSendFreq from '../calculateSendFrequency';

const now = new Date();
const testSlack = 50; // in ms

function testDays(days, res) {
  days.forEach(day =>
    it(`will return ${res} when given ${day} days`, () => {
      const eventStart = dayjs(now).add(day, 'd').add(testSlack, 'ms');
      const r = calculateNotificationSendFreq(eventStart);
      expect(r).toBe(res);
    }),
  );
}

describe('validate calculateNotificationSendFrequency()', () => {
  describe('returns the expected number of days', () => {
    describe('Return 7 when more than 14 days', () => {
      const days = [15, 20, 100, 400];
      testDays(days, 7);
    });
    describe('will return 4 between 8 and 14 days', () => {
      const days = [8, 9, 10, 11, 12, 13, 14];
      testDays(days, 4);
    });
    describe('will return 3 between 4 and 7 days', () => {
      const days = [4, 5, 6, 7];
      testDays(days, 3);
    });
    describe('will return 1 between 0 and 3 days', () => {
      const days = [0, 1, 2, 3];
      testDays(days, 1);
    });
  });
});
