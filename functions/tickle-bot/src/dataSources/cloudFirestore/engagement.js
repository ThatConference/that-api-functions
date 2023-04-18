import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:ticklebot:dataSource:engagement');
const { entityDateForge } = utility.firestoreDateForge;
const engDateForge = entityDateForge({
  fields: ['lastUpdatedAt', 'createdAt'],
});

// example paths
// engagements/meetThatCamper/matches
// engagements/meetThatCamper/log
const engagementColName = 'engagements';
const engagementMatchColName = 'matches';
const engagementLogColName = 'log';

const engagement = dbInstance => {
  dlog('engagement instance created');
  const engagementCol = dbInstance.collection(engagementColName);

  function getAllEngagements() {
    dlog('getAllEngagments called');
    return engagementCol.get().then(querySnap =>
      querySnap.docs.map(m => {
        const r = {
          id: m.id,
          ...m.data(),
        };

        return engDateForge(r);
      }),
    );
  }

  function getEngagementMatches({ name }) {
    dlog('getEngagementMatches called for %s', name);
    return engagementCol
      .doc(name)
      .collection(engagementMatchColName)
      .get()
      .then(querySnap =>
        querySnap.docs.map(m => {
          const r = {
            id: m.id,
            ...m.data(),
          };

          return engDateForge(r);
        }),
      );
  }

  function getEngagementLogs({ name }) {
    dlog('getEngagementMatches called for %s', name);
    return engagementCol
      .doc(name)
      .collection(engagementLogColName)
      .get()
      .then(querySnap =>
        querySnap.docs.map(m => {
          const r = {
            id: m.id,
            ...m.data(),
          };
          return r;
        }),
      );
  }

  // If there are any log entries after provided date, return true.
  function isLogEntryAfterDate({ name, date }) {
    dlog('isLogEntryAfterDate for %d, at date: %o', name, date);
    if (typeof name !== 'string')
      throw new Error('name parameter must be a string');
    if (!(date instanceof Date)) {
      throw new Error('date parameter must be an instance of Date');
    }

    return engagementCol
      .doc(name)
      .collection(engagementLogColName)
      .where('createdAt', '>', date)
      .get()
      .then(querySnap => querySnap.size > 0);
  }

  function setEngagementMatches({ name, memberId, matches }) {
    dlog(
      'setEngagementMatch called for %s, with %d matches',
      memberId,
      matches.length,
    );
    if (typeof name !== 'string' || name?.length < 4) {
      throw new Error(
        'engagement name value required to set engagement matches',
      );
    }
    if (!memberId) {
      throw new Error('memberId is required to set engagement matches');
    }
    if (!Array.isArray(matches)) {
      throw new Error('matches must be an array');
    }
    return engagementCol
      .doc(name)
      .collection(engagementMatchColName)
      .doc(memberId)
      .set({
        memberId,
        matchedWith: matches,
        lastUpdatedAt: new Date(),
      })
      .then(r => {
        dlog('set completed at %o', r);
        return true;
      });
  }

  function batchSetEngagementMatches({ name, matchesMap }) {
    dlog('batchSetEngagementMatches called for %d users', matchesMap.size);
    if (typeof name !== 'string' || name?.length < 4) {
      throw new Error(
        'engagement name value required to set engagement matches',
      );
    }
    if (!(matchesMap instanceof Map)) {
      throw new Error('matchesMap must be an instance of Map');
    }
    if (matchesMap.size === 0) return true; // short circuit out
    const matchCol = engagementCol.doc(name).collection(engagementMatchColName);
    const lastUpdatedAt = new Date();
    const batchWrite = dbInstance.batch();
    matchesMap.forEach((matches, memberId) => {
      const docRef = matchCol.doc(memberId);
      const record = {
        memberId,
        matchedWith: matches,
        lastUpdatedAt,
      };
      batchWrite.set(docRef, record);
    });

    return batchWrite.commit().then(() => true);
  }

  function createEngagementLog({ name, payload }) {
    dlog('createEngagmentLog called for engagement %s', name);
    if (typeof name !== 'string' || name?.length < 4) {
      throw new Error(
        'engagement name value required to set engagement matches',
      );
    }

    const newLogEntry = payload;

    let { createdAt } = newLogEntry;
    if (!(createdAt instanceof Date)) {
      createdAt = new Date();
      newLogEntry.createdAt = createdAt;
    }
    const docId = createdAt.toISOString();

    return engagementCol
      .doc(name)
      .collection(engagementLogColName)
      .doc(docId)
      .create(newLogEntry)
      .then(r => {
        dlog('created engagment log: %o', r);
        return true;
      });
  }

  return {
    getAllEngagements,
    getEngagementMatches,
    getEngagementLogs,
    isLogEntryAfterDate,
    setEngagementMatches,
    batchSetEngagementMatches,
    createEngagementLog,
  };
};

export default engagement;
