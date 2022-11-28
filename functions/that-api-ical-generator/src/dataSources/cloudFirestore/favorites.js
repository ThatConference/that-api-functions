import debug from 'debug';
import dayjs from 'dayjs';

const dlog = debug('that:function:that-api-ical-generator:cf:favorites');

function favorite(dbInstance) {
  dlog('favorite data source created');
  const collectionName = 'favorites';
  const favoriteCollection = dbInstance.collection(collectionName);

  function getMemberFavoriteSessions({ memberId, historyMonths = 4 }) {
    dlog('getMemberFavoriteSessions for %s', memberId);
    return favoriteCollection
      .where('memberId', '==', memberId)
      .where('createdAt', '>', dayjs().subtract(historyMonths, 'M').toDate())
      .select('eventId', 'sessionId')
      .get()
      .then(querySnap =>
        querySnap.docs
          .map(r => ({ id: r.id, ...r.data() }))
          .filter(f => f.sessionId),
      );
  }

  return { getMemberFavoriteSessions };
}

export default favorite;
