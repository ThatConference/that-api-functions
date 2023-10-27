import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:functions:join-bot:firestore:event');
const eventDateForge = utility.firestoreDateForge.events;

const collectionName = 'events';

const event = dbInstance => {
  const eventCollection = dbInstance.collection(collectionName);
  dlog('event instance created');

  function get(eventId) {
    dlog('get %s', eventId);
    return eventCollection
      .doc(eventId)
      .get()
      .then(docSnap => {
        let result = null;
        if (docSnap.exists) {
          result = {
            id: docSnap.id,
            ...docSnap.data(),
          };

          return eventDateForge(result);
        }

        return result;
      });
  }

  function getActiveEndingInFuture() {
    dlog('getActiveEndingInFuture called');

    return eventCollection
      .where('endDate', '>=', new Date())
      .get()
      .then(querySnap => {
        let docs = querySnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }));
        docs = docs.filter(d => d.isActive);

        return docs.map(d => eventDateForge(d));
      });
  }

  function getActiveIdsEndingInFuture() {
    dlog('getActiveIdsEndingInFuture');
    return eventCollection
      .where('endDate', '>=', new Date())
      .select('isActive')
      .get()
      .then(querySnap => {
        const docs = querySnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }));
        return docs.reduce((acc, cur) => {
          if (cur.isActive) {
            acc.push({ id: cur.id });
          }
          return acc;
        }, []);
      });
  }

  return { get, getActiveEndingInFuture, getActiveIdsEndingInFuture };
};

export default event;
