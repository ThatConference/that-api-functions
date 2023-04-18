export function matchUpmembers({ membersToMatch, previousEngagementMatches }) {
  if (!(membersToMatch instanceof Map))
    throw new Error('membersToMatch parameter must be a Map object');
  if (!(previousEngagementMatches instanceof Map))
    throw new Error('membersToMatch parameter must be a Map object');
  const newMatches = [];
  const previousMatchesUpdates = new Map();

  // do matches
  membersToMatch.forEach((member, memberId) => {
    const previousMatches =
      previousEngagementMatches.get(memberId) ?? new Set();

    let matchedWith = null;
    let matchedWithId = null;
    // find match

    // eslint-disable-next-line no-restricted-syntax
    for (const [mId, mValue] of membersToMatch) {
      if (mId !== memberId && !previousMatches.has(mId)) {
        // have match
        matchedWith = mValue;
        matchedWithId = mId;
        break;
      }
    }

    if (matchedWith !== null) {
      // Save new match
      newMatches.push({
        a: member,
        b: matchedWith,
      });
      // update previous match arrays for both people
      previousMatches.add(matchedWithId);
      const previousMatchesForMatch =
        previousEngagementMatches.get(matchedWithId) ?? new Set();
      previousMatchesForMatch.add(memberId);
      previousMatchesUpdates.set(memberId, [...previousMatches]);
      previousMatchesUpdates.set(matchedWithId, [...previousMatchesForMatch]);
      // remove matches from membersToMatch
      membersToMatch.delete(memberId);
      membersToMatch.delete(matchedWithId);
    } else {
      // This member cannot be matched with anyone this round
      // remove them so they are not iterated on again.
      membersToMatch.delete(memberId);
    }
  });

  return {
    newMatches,
    previousMatchesUpdates,
  };
}
