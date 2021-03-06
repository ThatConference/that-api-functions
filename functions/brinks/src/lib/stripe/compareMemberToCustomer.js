import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:brinks:compareMemberToCustomer');
const memberStore = dataSources.cloudFirestore.member;

export default function compareMemberToCustomer({
  memberId,
  stripeCustomerId,
  firestore,
}) {
  dlog('compareMemberToCustomer called on %s, %s', memberId, stripeCustomerId);

  return memberStore(firestore)
    .get(memberId)
    .then(member => {
      const { id: _memberId, stripeCustomerId: _stripeCustomerId } = member;
      Sentry.setContext('stipeCustomerCompare', {
        stripeCustomerId,
        _stripeCustomerId,
        memberId,
        _memberId,
      });
      return memberId === _memberId && stripeCustomerId === _stripeCustomerId;
    });
}
