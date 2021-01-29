import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import { Firestore } from '@google-cloud/firestore';

const dlog = debug('that:api:functions:brinks:compareMemberToCustomer');
const memberStore = dataSources.cloudFirestore.member;
const firestore = new Firestore();

export default function compareMemberToCustomer({
  memberId,
  stripeCustomerId,
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
