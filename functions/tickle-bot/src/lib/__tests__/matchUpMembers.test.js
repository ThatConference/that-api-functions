import { matchUpmembers } from '../matchUpmembers';

describe('matchUpMembers tests', () => {
  describe('Only allow the correct input types', () => {
    const badvalues = [[], { a: 'a', b: 'b' }, 'string 😉'];
    const aMap = new Map();
    it('will throw if membersToMatch is not a Map', () => {
      badvalues.forEach(badParam =>
        expect(() =>
          matchUpmembers({
            membersToMatch: badParam,
            previousEngagementMatches: aMap,
          }),
        ).toThrow(),
      );
    });
    it('will throw if previousEngagementMatches is not a Map', () => {
      badvalues.forEach(badParam =>
        expect(() =>
          matchUpmembers({
            membersToMatch: aMap,
            previousEngagementMatches: badParam,
          }),
        ).toThrow(),
      );
    });
  });

  describe('Handles empty membersToMatch Map with empty results', () => {
    const membersToMatch = new Map();
    const previousEngagementMatches = new Map();
    const result = matchUpmembers({
      membersToMatch,
      previousEngagementMatches,
    });
    it('Result will turn object with two keys', () =>
      expect(Object.keys(result).length).toBe(2));
    it('Result newMatches will be an empty array', () => {
      const { newMatches } = result;
      expect(Array.isArray(newMatches)).toEqual(true);
      expect(newMatches?.length).toEqual(0);
    });
    it('Result previousMatchesUpdates will be an empty Map', () => {
      const { previousMatchesUpdates } = result;
      expect(previousMatchesUpdates instanceof Map).toBe(true);
      expect(previousMatchesUpdates.size).toBe(0);
    });
  });

  describe('Handles 1 in match collection', () => {
    const membersToMatch = new Map([['1', { name: 'solo person' }]]);
    const previousEngagementMatches = new Map();
    const result = matchUpmembers({
      membersToMatch,
      previousEngagementMatches,
    });
    it('returns empty results when match collection is 1', () => {
      expect(result.newMatches.length).toBe(0);
      expect(result.previousMatchesUpdates.size).toBe(0);
    });
  });

  describe('2 potential matches are matched together', () => {
    const membersToMatch = new Map([
      ['1', { name: 'Person A' }],
      ['2', { name: 'Person B' }],
    ]);
    const previousEngagementMatches = new Map();
    const result = matchUpmembers({
      membersToMatch,
      previousEngagementMatches,
    });
    it('newMatches returns correct result for a single match', () => {
      const [match] = result.newMatches;
      expect(result.newMatches.length).toBe(1);
      expect(match?.a).toHaveProperty('name', 'Person A');
      expect(match?.b).toHaveProperty('name', 'Person B');
    });
    it('previousMatchesUpdates returns correct result for a single match', () => {
      // console.log([...result.previousMatchesUpdates]);
      const matches = [...result.previousMatchesUpdates];
      expect(result.previousMatchesUpdates.size).toBe(2);
      expect(matches[0][0]).toBe('1');
      expect(matches[0][1]).toStrictEqual(['2']);
      expect(matches[1][0]).toBe('2');
      expect(matches[1][1]).toStrictEqual(['1']);
    });
  });

  describe('3 potential matches are matched together', () => {
    const membersToMatch = new Map([
      ['1', { name: 'Person A' }],
      ['2', { name: 'Person B' }],
      ['3', { name: 'Person C' }],
    ]);
    const previousEngagementMatches = new Map();
    const result = matchUpmembers({
      membersToMatch,
      previousEngagementMatches,
    });
    it('newMatches returns correct result for a single match', () => {
      const [match] = result.newMatches;
      expect(result.newMatches.length).toBe(1);
      expect(match?.a).toHaveProperty('name', 'Person A');
      expect(match?.b).toHaveProperty('name', 'Person B');
    });
    it('previousMatchesUpdates returns correct result for a single match', () => {
      const matches = [...result.previousMatchesUpdates];
      expect(result.previousMatchesUpdates.size).toBe(2);
      expect(matches[0][0]).toBe('1');
      expect(matches[0][1]).toStrictEqual(['2']);
      expect(matches[1][0]).toBe('2');
      expect(matches[1][1]).toStrictEqual(['1']);
    });
  });

  describe('3 potential matches 1 already matched with 2', () => {
    const membersToMatch = new Map([
      ['1', { name: 'Person A' }],
      ['2', { name: 'Person B' }],
      ['3', { name: 'Person C' }],
    ]);
    const previousEngagementMatches = new Map([
      ['1', new Set(['2'])],
      ['2', new Set(['1'])],
    ]);
    const result = matchUpmembers({
      membersToMatch,
      previousEngagementMatches,
    });
    it('newMatches returns correct result for a single match', () => {
      const [match] = result.newMatches;
      expect(result.newMatches.length).toBe(1);
      expect(match?.a).toHaveProperty('name', 'Person A');
      expect(match?.b).toHaveProperty('name', 'Person C');
    });
    it('previousMatchesUpdates returns correct result for a single match', () => {
      const matches = [...result.previousMatchesUpdates];
      expect(result.previousMatchesUpdates.size).toBe(2);
      expect(matches[0][0]).toBe('1');
      expect(matches[0][1]).toStrictEqual(['2', '3']);
      expect(matches[1][0]).toBe('3');
      expect(matches[1][1]).toStrictEqual(['1']);
    });
  });

  describe('No potential matches', () => {
    const membersToMatch = new Map([
      ['1', { name: 'Person A' }],
      ['2', { name: 'Person B' }],
      ['3', { name: 'Person C' }],
    ]);
    const previousEngagementMatches = new Map([
      ['1', new Set(['2', '3'])],
      ['2', new Set(['1', '3'])],
      ['3', new Set(['1', '2'])],
    ]);
    const result = matchUpmembers({
      membersToMatch,
      previousEngagementMatches,
    });
    it('newMatches returns empty array', () => {
      const [match] = result.newMatches;
      expect(result.newMatches.length).toBe(0);
      expect(match?.a).toBeUndefined();
      expect(match?.b).toBeUndefined();
    });
    it('previousMatchesUpdates returns empty Map', () => {
      expect(result.previousMatchesUpdates.size).toBe(0);
    });
  });
});
