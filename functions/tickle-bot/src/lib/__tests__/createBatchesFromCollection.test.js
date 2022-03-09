import { createBatchesFromCollection } from '../createBatchesFromCollection';

const collection = [
  {
    message: 0,
  },
  {
    message: 1,
  },
  {
    message: 2,
  },
  {
    message: 3,
  },
  {
    message: 4,
  },
  {
    message: 5,
  },
  {
    message: 6,
  },
  {
    message: 7,
  },
  {
    message: 8,
  },
  {
    message: 9,
  },
];

const c2 = [
  ...collection,
  {
    message: 11,
  },
  {
    message: 12,
  },
  {
    message: 13,
  },
];
// 46
const ids = [
  '0gB1--1VPn--ennIqa',
  '5AQE--yf5n--kZ77qp',
  '5r8J--EukQ--OicGJK',
  'AG3o--1CSK--2FqtJC',
  'GyAA--Q2sf--7sUCiN',
  'YMMC--786j--mxKNbG',
  'YvYd--iSU6--WMgs5n',
  'ZtJB--ADeV--xVfB2B',
  'mPjf--XPkX--yP0Jqt',
  'p1W4--13GF--1wdniy',
  '4N8P--N7LF--aU7hnZ',
  'IdGP--spjy--GCNRr7',
  'kAZu--zXbx--08HMti',
  '9EmV--zrsJ--GJrtmD',
  'AHgS--EKrh--Fwv6P0',
  'Cxyl--g0jT--f8VwhA',
  'Q0pT--Yd6f--y5qqxT',
  'W7Tu--ABh3--VjDwaJ',
  'lpiG--09dq--E0kxM6',
  '0ygT--TA7q--DxDaFM',
  'UuuP--hAze--sUdbEf',
  '2r6F--nJbf--pWGycW',
  '3Fbe--nd2L--qwIRuJ',
  'A30S--bPbZ--IHAg0A',
  'AdH5--FyzH--1Y06kg',
  'D3Dk--Kbrb--jYKFyi',
  'F2SF--jEGs--XsNkvq',
  'IRn6--f8EL--EUX3AU',
  'Ks60--sxpT--79ECns',
  'ZavK--o3AG--Z8oL2x',
  'cANx--HfDN--78b8ae',
  'ceKe--oUXT--uYKV7O',
  'd1IM--ZKPR--hv0tiS',
  'lGWk--gXuP--BHY8Dv',
  'lNgk--2KWH--KJs9ZL',
  'lg5z--F5O4--NddE4A',
  'mocu--rYH2--fNdXVR',
  'p78N--zQ4e--Hk7XAF',
  'qosG--qfny--Hpskit',
  'taUY--wwYv--Lutyb5',
  'uEMS--1T4g--JyTkzd',
  'LYU4--NXvC--BPAdaG',
  'SdSl--wvGX--ZPPJ3Q',
  'XFvp--nKj7--cL79Ts',
  'mviN--iMpU--blusrG',
  'oHLZ--loOQ--TjS4E3',
];

describe(`validate createBatchesFromCollection() operation`, () => {
  describe(`Validate message batch sizes are correct`, () => {
    it('will throw if collection parameter is not an array', () => {
      expect(() => createBatchesFromCollection({})).toThrowError(
        new Error('collection paramter must be an array'),
      );
    });
    it(`will throw if maxBatchSize is not > 0`, () => {
      expect(() =>
        createBatchesFromCollection({ collection: [] }),
      ).toThrowError(new Error('maxBatchSize parameter must be > 0'));
      expect(() =>
        createBatchesFromCollection({ collection: [], maxBatchSize: 0 }),
      ).toThrowError(new Error('maxBatchSize parameter must be > 0'));
      expect(() =>
        createBatchesFromCollection({ collection: [], maxBatchSize: 'a' }),
      ).toThrowError(new Error('maxBatchSize parameter must be > 0'));
      expect(() =>
        createBatchesFromCollection({ collection: [], maxBatchSize: null }),
      ).toThrowError(new Error('maxBatchSize parameter must be > 0'));
    });
    it('returns 1 batch of 10 with max at 20', () => {
      const r = createBatchesFromCollection({ collection, maxBatchSize: 20 });
      expect(r).toHaveLength(1);
      expect(r[0]).toHaveLength(10);
    });
    it('returns 1 batch of 13 with max at 20', () => {
      const r = createBatchesFromCollection({
        collection: c2,
        maxBatchSize: 20,
      });
      expect(r).toHaveLength(1);
      expect(r[0]).toHaveLength(13);
    });
    it('returns 5 batches of 2 with max at 2', () => {
      const r = createBatchesFromCollection({ collection, maxBatchSize: 2 });
      expect(r).toHaveLength(5);
      r.forEach(rr => expect(rr).toHaveLength(2));
    });
    it('last batch of 13 elements at 2 per batch has 1 object', () => {
      const r = createBatchesFromCollection({
        collection: c2,
        maxBatchSize: 2,
      });
      const l = r.length - 1;
      expect(r[l]).toHaveLength(1);
    });
    it('will not change message order or mutate values', () => {
      const r = createBatchesFromCollection({
        collection: c2,
        maxBatchSize: 4,
      });
      const all = r.reduce((accu, curr) => {
        accu.push(...curr);
        return accu;
      }, []);
      c2.forEach((m, idx) => expect(m?.message).toBe(all[idx]?.message));
    });
    it('will will create 5 batches of ids', () => {
      const r = createBatchesFromCollection({
        collection: ids,
        maxBatchSize: 10,
      });
      expect(r).toHaveLength(5);
    });
    it('will not mutate order or id values', () => {
      const r = createBatchesFromCollection({
        collection: ids,
        maxBatchSize: 4,
      });
      const all = r.reduce((acc, cur) => {
        acc.push(...cur);
        return acc;
      }, []);
      ids.forEach((id, idx) => expect(id === all[idx]));
    });
  });
});
