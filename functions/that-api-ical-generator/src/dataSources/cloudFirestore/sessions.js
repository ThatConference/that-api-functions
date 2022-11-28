import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:function:that-api-ical-generator:cf:sessions');
const sessionDateForge = utility.firestoreDateForge.sessions;

function session(dbInstance) {
  dlog('session data source created');
  const collectionName = 'sessions';
  const sessionCollection = dbInstance.collection(collectionName);

  function getBatchSessions(sessionIds) {
    if (!Array.isArray(sessionIds)) {
      throw new Error('getBatchSessions parameter must be an array');
    }
    dlog('getBatchSessions called on %d ids', sessionIds.length);
    if (sessionIds.length < 1) return [];
    const docRefs = sessionIds.map(id => sessionCollection.doc(id));

    return dbInstance.getAll(...docRefs).then(docSnaps =>
      docSnaps.reduce((acc, cur) => {
        if (cur.exists) {
          const result = {
            id: cur.id,
            ...cur.data(),
          };
          acc.push(sessionDateForge(result));
        }

        return acc;
      }, []),
    );
  }

  return { getBatchSessions };
}

export default session;
