// Meet THAT, a matching service to introduce community members to one another
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import { oaForMemberMatching } from '../queries';
import sendGraphReq from '../sendGraphReq';
import engagementStoreFn from '../dataSources/cloudFirestore/engagement';
import constants from '../constants';
import { matchUpmembers } from '../lib/matchUpmembers';
import formatMeetThatEmails from '../lib/formatMeetThatEmails';
import sendPostmarkMessages from '../lib/sendPostmarkMessages';

const dlog = debug('that:api:ticklebot:meetThatMatchingMW');

export default async function meetThatMatching(req, res, next) {
  dlog('meetThatMatching middleware called');

  const engagementName = 'meetThatCamper';
  const firestore = req.app.get(constants.TICKLEBOT.FIRESTORE);
  const memberStoreFn = dataSources.cloudFirestore.member;
  let memberStore;
  let engagementStore;
  try {
    memberStore = memberStoreFn(firestore);
    engagementStore = engagementStoreFn(firestore);
  } catch (err) {
    return next(err);
  }
  const result = {
    createdAt: new Date(),
    idCountFromAllocations: 0,
    campmateIdsFromAllocations: 0,
    optInCount: 0,
    membersToMatch: 0,
    matchesMade: 0,
    emailsInError: 0,
    result: '',
  };

  const oneDay = 24 * 60 * 60 * 1000; // in milliseconds
  const runDelay =
    new Date().getTime() -
    oneDay * constants.TICKLEBOT.ENGAGEMENT.MEET_THAT_MIN_DAYS;
  const lastRunWithinDate = await engagementStore.isLogEntryAfterDate({
    name: engagementName,
    date: new Date(runDelay),
  });
  if (lastRunWithinDate === true) {
    result.result = `Process run withing the last ${constants.TICKLEBOT.ENGAGEMENT.MEET_THAT_MIN_DAYS} days. Exiting`;
    Sentry.withScope(scope => {
      scope.setContext('result', { result });
      scope.setLevel('info');
      scope.setTag('result', result.result);
      Sentry.captureMessage('engagement meet that return result');
    });
    return res.json(result);
  }

  const oaQuery = oaForMemberMatching.graphQl;
  let oaData;
  try {
    const { data } = await sendGraphReq({ query: oaQuery });
    oaData = data;
  } catch (error) {
    return next(error);
  }
  const allEvents = oaData?.communities?.community?.get?.events;
  if (
    allEvents === undefined ||
    allEvents === null ||
    !Array.isArray(allEvents)
  ) {
    return next(
      new Error(
        'Query requesting orderAllocations for Meet THAT returned undefined or null.',
      ),
    );
  }
  dlog(`event's retrieved: %d`, allEvents.length);
  const orderAllocations = allEvents.reduce((acc, cur) => {
    let accumulator = acc;
    const allocations = cur?.admin?.orderAllocations;
    if (Array.isArray(allocations)) {
      accumulator = accumulator.concat(allocations);
    }
    return accumulator;
  }, []);
  dlog(`combined orderAllocation count: %d`, orderAllocations.length);
  const memberIdsFromAllocations = new Map();
  const campmateIdsFromAllocations = new Map();
  for (let i = 0; i < orderAllocations.length; i += 1) {
    const oa = orderAllocations[i];
    const allocatedTo = oa?.allocatedTo;
    const uiReference = oa?.uiReference;
    if (
      allocatedTo?.id &&
      uiReference !== 'GEEKLING' &&
      uiReference !== 'CAMPMATE'
    ) {
      if (!memberIdsFromAllocations.has(allocatedTo.id))
        memberIdsFromAllocations.set(allocatedTo.id, allocatedTo);
    } else if (allocatedTo?.id && uiReference === 'CAMPMATE') {
      // future use to send campmates engagement emails.
      if (!campmateIdsFromAllocations.has(allocatedTo.id))
        campmateIdsFromAllocations.set(allocatedTo.id, allocatedTo);
    }
  }
  dlog(
    'distinct member ids from allocations: %d',
    memberIdsFromAllocations.size,
  );
  dlog(
    'distinct campmate ids from allocations: %d',
    campmateIdsFromAllocations.size,
  );
  result.idCountFromAllocations = memberIdsFromAllocations.size;
  result.campmateIdsFromAllocations = campmateIdsFromAllocations.size;

  let optedInMembers;
  try {
    optedInMembers = await memberStore.getNotificationPreferenceFor({
      preferenceName: engagementName,
      preferenceValue: true,
    });
  } catch (err) {
    return next(err);
  }
  dlog('optedIn members count: %d', optedInMembers.length);
  result.optInCount = optedInMembers.length;

  const membersToMatch = new Map();
  for (let i = 0; i < optedInMembers.length; i += 1) {
    const m = optedInMembers[i];
    if (memberIdsFromAllocations.has(m.id)) {
      const allocatedTo = memberIdsFromAllocations.get(m.id);
      membersToMatch.set(m.id, {
        profile: m,
        allocatedTo,
      });
    }
  }
  dlog('members count to match: %d', membersToMatch.size);
  result.membersToMatch = membersToMatch.size;

  if (membersToMatch.size < 2) {
    dlog('not enough members to match, exiting');
    result.result = 'not enough members to match';

    try {
      await engagementStore.createEngagementLog({
        name: engagementName,
        payload: {
          ...result,
        },
      });
    } catch (err) {
      next(err);
    }

    Sentry.withScope(scope => {
      scope.setContext('result', { result });
      scope.setLevel('info');
      scope.setTag('result', result.result);
      Sentry.captureMessage('engagement meet that return result');
    });

    return res.json(result);
  }

  // getEngagementMatches returns something like:
  // id, matchedWith (array), memberId string
  const currentMatches = await engagementStore.getEngagementMatches({
    name: engagementName,
  });
  const previousEngagementMatches = new Map(
    currentMatches.map(c => [c.id, new Set(c.matchedWith)]),
  );
  dlog('previousEngagmentMatches count: %d', previousEngagementMatches.size);

  /* returned values
   * const newMatches = [];
   * const previousMatchesUpdates = new Map();
   */
  // do matches
  const { newMatches, previousMatchesUpdates } = matchUpmembers({
    membersToMatch,
    previousEngagementMatches,
  });
  dlog('There are %d new matches made', newMatches.length);
  result.matchesMade = newMatches.length;

  if (newMatches.length < 1) {
    dlog('No matches possible to make, exiting');
    result.result = 'no matches possible to make';
    try {
      await engagementStore.createEngagementLog({
        name: engagementName,
        payload: {
          ...result,
        },
      });
    } catch (err) {
      next(err);
    }

    Sentry.withScope(scope => {
      scope.setContext('result', { result });
      scope.setLevel('info');
      scope.setTag('result', result.result);
      Sentry.captureMessage('engagement meet that return result');
    });

    return res.json(result);
  }
  // Randomize a/b matches
  const newMatchesRandomized = newMatches.map(match => {
    const { a, b } = match;
    let matchA = a;
    let matchB = b;
    if (Math.random() * 2 > 1) {
      matchA = b;
      matchB = a;
    }
    return {
      a: matchA,
      b: matchB,
    };
  });

  if (newMatches.length !== newMatchesRandomized.length) {
    dlog(
      'New randomize match array length does not equal matches array length %d, %d',
      newMatches.length,
      newMatchesRandomized.length,
    );
    Sentry.setContext('newMatches array length', { length: newMatches.length });
    Sentry.setContext('newMatchesRandomized length', {
      length: newMatchesRandomized.length,
    });
    return next(
      new Error(
        'New randomize match array length does not equal matches array length',
      ),
    );
  }

  // format emails
  const { postmarkMessages, validationMessages } = formatMeetThatEmails({
    newMatches: newMatchesRandomized,
  });
  dlog('%d emails formatted for postmark', postmarkMessages.length);

  // send emails
  let messagesInError;
  try {
    ({ messagesInError } = await sendPostmarkMessages({
      postmarkMessages,
      validationMessages,
    }));
  } catch (error) {
    return next(error);
  }
  if (messagesInError.length > 0) {
    Sentry.withScope(scope => {
      scope.setTag('function', 'meetThatMatching');
      scope.setContext('messagesInError', { messagesInError });
      scope.setContext('messagesInError count', {
        MessagessInErrorCount: messagesInError.length,
      });
      scope.setContext('new matches', {
        matchCount: newMatchesRandomized.length,
      });
      Sentry.captureException(
        new Error(
          `Engagement meetThat emails returned with ${messagesInError.length} send errors over ${newMatchesRandomized.length} messages`,
        ),
      );
    });
  }

  result.emailsInError = messagesInError.length;
  result.result = `${newMatchesRandomized.length} new matches made and emailed`;

  // update matches collection
  try {
    await engagementStore.batchSetEngagementMatches({
      name: engagementName,
      matchesMap: previousMatchesUpdates,
    });
    await engagementStore.createEngagementLog({
      name: engagementName,
      payload: {
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }

  Sentry.withScope(scope => {
    scope.setContext('result', { result });
    scope.setLevel('info');
    scope.setTag('result', result.result);
    Sentry.captureMessage('engagement meet that return result');
  });

  return res.json(result);
}
