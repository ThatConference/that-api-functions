import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:datasources:firestore:session');
const sessionDateForge = utility.firestoreDateForge.sessions;

const collectionName = 'sessions';

const session = dbInstance => {
  const sessionCollection = dbInstance.collection(collectionName);
  dlog('session instance created');

  function get(sessionId) {
    dlog('get %s', sessionId);
    return sessionCollection
      .doc(sessionId)
      .get()
      .then(docSnap => {
        let result = null;
        if (docSnap.exists) {
          result = {
            id: docSnap.id,
            ...docSnap.data(),
          };
          result = sessionDateForge(result);
        }

        return result;
      });
  }

  function findByDiscordChannelId(channelId) {
    dlog('findByDiscordChannelId ', channelId);
    return sessionCollection
      .where('discord.channelId', '==', channelId)
      .get()
      .then(querySnap =>
        querySnap.docs
          .map(s => {
            const result = {
              id: s.id,
              ...s.data(),
            };
            return sessionDateForge(result);
          })
          // most recent first
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
      );
  }

  function getAcceptedForEvents(eventIds) {
    dlog('getAcceptedForEvents: %o', eventIds);
    if (!Array.isArray(eventIds)) throw new Error('eventIds must be an array');

    return sessionCollection
      .where('eventId', 'in', eventIds)
      .where('status', '==', 'ACCEPTED')
      .where('startTime', '>', new Date())
      .get()
      .then(querySnap =>
        querySnap.docs.map(s => {
          const result = {
            id: s.id,
            ...s.data(),
          };
          return sessionDateForge(result);
        }),
      );
  }

  async function updateDiscordData({ sessionId, discordData }) {
    dlog('updating discord data on session: %s, %o', sessionId, discordData);
    const docRef = sessionCollection.doc(sessionId);
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      return {};
    }
    await docRef.update({ discord: discordData });
    dlog('session updated');

    return {
      id: docRef.id,
      ...docSnapshot.data(),
      discord: discordData,
    };
  }

  return {
    get,
    findByDiscordChannelId,
    getAcceptedForEvents,
    updateDiscordData,
  };
};

export default session;
