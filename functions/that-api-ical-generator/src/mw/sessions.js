/* eslint-disable no-console */
import debug from 'debug';
import { dataSources } from '@thatconference/api';
import memberFn from '../dataSources/cloudFirestore/members';
import favoriteFn from '../dataSources/cloudFirestore/favorites';
import sessionFn from '../dataSources/cloudFirestore/sessions';
import createIcs from '../lib/createIcs';

const favCacheFn = dataSources.cloudFirestore.favoritesCache;
const dlog = debug('that:function:that-api-ical-generator:mw:sessions');

export default async (req, res, next) => {
  const { profileSlug, icsKey } = req.params;
  dlog('sessions middleware called for %s with %s', profileSlug, icsKey);
  const firestore = req.app.get('firestore');
  const favoritesEvents = req.app.get('favoritesEvents');

  let favoriteStore;
  let sessionStore;
  let member;
  let favorites;
  let cached;
  let ics;
  try {
    const memberStore = memberFn(firestore);
    const favCacheStore = favCacheFn(firestore);
    favoriteStore = favoriteFn(firestore);
    sessionStore = sessionFn(firestore);
    member = await memberStore.findMemberForIcs({ profileSlug, icsKey });
    if (!member) {
      return res.status(404).end();
    }
    dlog('member::%O', member);
    cached = await favCacheStore.findFavoritesCache(member.id);
  } catch (e) {
    return next(e);
  }

  if (cached?.icsData) {
    console.log(`cache hit::${member.id}`);
    ics = cached.icsData;
  } else {
    console.log(`cache miss::${member.id}`);
    try {
      favorites = await favoriteStore.getMemberFavoriteSessions({
        memberId: member.id,
        historyMonths: 5,
      });
    } catch (e) {
      return next(e);
    }

    dlog('favorites::%d', favorites.length);
    const sessionIds = favorites.map(f => f.sessionId);

    dlog('sessionIds::%d', sessionIds.length);
    let sessions;
    try {
      sessions = await sessionStore.getBatchSessions(sessionIds);
    } catch (e) {
      return next(e);
    }

    dlog('sessions returned::%d', sessions.length);
    ics = createIcs({ member, sessions });
    favoritesEvents.emit('newFavorite', { memberId: member.id, data: ics });
  }

  dlog('ICS size::%d', ics.length);
  return res.type('text/calendar').send(ics);
  // get ics request paramers
  // lookup member in members collection
  // get member's favorites from favorites collection
  // generate ical
  // respond back
};
