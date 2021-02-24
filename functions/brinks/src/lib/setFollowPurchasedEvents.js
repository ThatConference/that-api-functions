// For allocated tickets, set the person to follow the event.
import debug from 'debug';
import { dataSources, constants } from '@thatconference/api';

const dlog = debug('that:api:brinks:setFollowPurchasedEvents');
const favoriteFunc = dataSources.cloudFirestore.favorites;
const productTypes = ['TICKET', 'MEMBERSHIP'];

export default function setFollowPurchasedEvents({
  orderAllocations,
  firestore,
}) {
  dlog('setFollowPurchasedEvents called');

  if (orderAllocations.length === 0) return [];
  const eventId = orderAllocations[0].event;
  const memberSet = new Set();

  orderAllocations.forEach(a => {
    if (a.allocatedTo && productTypes.includes(a.productType)) {
      memberSet.add(a.allocatedTo);
    }
  });
  const memberIds = [...memberSet];
  dlog('memberIds %o', memberIds);

  let favoriteStore;
  try {
    favoriteStore = favoriteFunc(firestore);
  } catch (err) {
    return Promise.reject(err);
  }
  const setFavorites = memberIds.map(memberId =>
    favoriteStore.setFavoriteForMember({
      favoritedId: eventId,
      favoriteType: constants.THAT.FAVORITING.TYPE.EVENT,
      user: { sub: memberId },
    }),
  );

  return Promise.all(setFavorites);
}
