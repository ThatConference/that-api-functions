// For a provided order, and allocations apply them to the members
// they are allocated to.
import debug from 'debug';
import { dataSources } from '@thatconference/api';
import dcStore from '../dataSources/cloudFirestore/discountCode';
import getStripeSubscription from './stripe/getStripeSubscription';
import createPromotionCode from './stripe/createPromotionCode';
import envConfig from '../envConfig';
import constants from '../constants';

const dlog = debug('that:api:brinks:applyAllocationsToMembers');
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

  const camperDiscountCode = await createPromotionCode({
    couponId: constants.STRIPE.COUPON.MEMBERSHIP_CAMPER,
    customerId: stripeSubscription.customer,
    expiresAt: stripeSubscription.current_period_end * 1000,
    maxRedemptions: 1,
    metadata: {
      memberId: order.member,
    },
  });
  const membershipCamperDiscountCode = {
    code: camperDiscountCode.code,
    promoCodeId: camperDiscountCode.promoCodeId,
    title: 'Membership Camper Discount',
    type: constants.THAT.DISCOUNT_CODE.TYPE.TICKET,
    expiresAt: new Date(stripeSubscription.current_period_end * 1000),
  };
  const storeCode = constants.THAT.PROMO_CODE.MEMBERSHIP_STORE_DISCOUNT;
  const msExpire = 86400000 * storeCode.EXPIRE_IN_DAYS;
  const expiresAt = new Date(new Date().getTime() + msExpire);
  const storeDiscountCode = {
    code: storeCode.CODE,
    title: storeCode.TITLE,
    type: constants.THAT.DISCOUNT_CODE.TYPE.STORE,
    expiresAt,
  };

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

  // write discountCodes for members
  const dcFuncs = memberUpdates.map(mu => {
    const [key] = Object.keys(mu);
    return dcStore(firestore).batchCreate([
      {
        ...membershipCamperDiscountCode,
        memberId: key,
      },
      {
        ...storeDiscountCode,
        memberId: key,
      },
    ]);
  });

  // write updates to member(s)
  const updateFuncs = memberUpdates.map(mu => {
    const [key] = Object.keys(mu);
    return memberStore(firestore).update({
      memberId: key,
      profile: mu[key],
    });
  });
  dlog('update functions:: %o', updateFuncs);

  return Promise.all([...updateFuncs, ...dcFuncs]);
}
