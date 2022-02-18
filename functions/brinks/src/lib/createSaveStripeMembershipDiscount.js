/**
 * For a provided member, creates a discount code in stripe and saves
 * it in the discountCode collection
 */
import debug from 'debug';
import dcStore from '../dataSources/cloudFirestore/discountCode';
import createPromotionCode from './stripe/createPromotionCode';
import constants from '../constants';

const dlog = debug('that:api:brinks:createStripeDiscountAndSave');

export default async function createStripeDiscountAndSave({
  member,
  firestore,
}) {
  dlog('createStripeDiscountAndSave called for %s', member.id);

  if (!member.membershipExpirationDate)
    throw new Error(
      `member doesn't have membership expiration date. No discount created`,
    );
  const expiration = new Date(member.membershipExpirationDate);
  const camperDiscountCode = await createPromotionCode({
    couponId: constants.STRIPE.COUPON.MEMBERSHIP_CAMPER,
    customerId: member.stripeCustomerId,
    expiresAt: expiration,
    maxRedemptions: 2,
    metadata: {
      memberId: member.id,
    },
  });
  const membershipCamperDiscountCode = {
    code: camperDiscountCode.code,
    promoCodeId: camperDiscountCode.promoCodeId,
    title: 'Membership Camper Discount',
    type: constants.THAT.DISCOUNT_CODE.TYPE.TICKET,
    expiresAt: expiration,
    memberId: member.id,
  };
  dlog(
    'saving discount code %s and returning',
    membershipCamperDiscountCode.code,
  );

  return dcStore(firestore)
    .create(membershipCamperDiscountCode)
    .then(writeResult => writeResult.writeTime.toDate());
}
