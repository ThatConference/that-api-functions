// For a provided order, and allocations apply them to the members
// they are allocated to.
import debug from 'debug';
import { dataSources } from '@thatconference/api';
import getStripeSubscription from './stripe/getStripeSubscription';
import envConfig from '../envConfig';
import constants from '../constants';

const dlog = debug('that:api:functions:brinks:applyAllocationsToMembers');
const memberStore = dataSources.cloudFirestore.member;

export default async function applyMembershipAllocationsToMembers({
  order,
  allocations,
  firestore,
}) {
  dlog('applyAllocationToMembers called for order id: %s', order.id);

  const applyAllocations = allocations.filter(
    a =>
      a.isAllocated &&
      a.allocatedTo &&
      a.productType === constants.THAT.PRODUCT_TYPE.MEMBERSHIP,
  );
  if (applyAllocations < 1) {
    dlog('no allocations are allocated, nothing to do, leaving');
    // return Promise.resolve();
    return [];
  }

  const stripeSubscription = await getStripeSubscription(
    order.stripeSubscriptionId,
  );

  const baseMemberUpdate = {
    stripeSubscriptionId: stripeSubscription.id,
    isMember:
      stripeSubscription.status === constants.STRIPE.SUBSCRIPTION_STATUS.ACTIVE,
    membershipExpirationDate: new Date(
      stripeSubscription.current_period_end * 1000,
    ),
    stripeSubscriptionCancelAtExpiration:
      stripeSubscription.cancel_at_period_end,
    lastUpdatedBy: envConfig.that.systemUpdatedBy,
    lastUpdatedAt: new Date(),
  };

  const memberUpdates = applyAllocations.map(allocation => {
    const memberUpdate = {
      ...baseMemberUpdate,
    };

    return {
      [allocation.allocatedTo]: memberUpdate,
    };
  });

  // write updatest to member(s)
  const updateFuncs = memberUpdates.map(mu => {
    const [key] = Object.keys(mu);
    return memberStore(firestore).update({
      memberId: key,
      profile: mu[key],
    });
  });
  dlog('update functions:: %o', updateFuncs);

  return Promise.all(updateFuncs);
}
