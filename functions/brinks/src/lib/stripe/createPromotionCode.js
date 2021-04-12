import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../../envConfig';

const dlog = debug('that:api:brinks:createPromotionCode');
const stripe = stripelib(envConfig.stripe.apiSecretKey);
const msYear = 31536000000;

export default function createPromotionCode({
  couponId,
  customerId,
  expiresAt = new Date().getTime() + msYear,
  maxRedemptions = 1,
  metadata = {},
}) {
  dlog('createPromotionCode called');
  const expire = Math.floor(new Date(expiresAt).getTime() / 1000);
  const payload = {
    coupon: couponId,
    metadata: metadata || {},
    customer: customerId,
    expires_at: expire,
    max_redemptions: maxRedemptions,
  };

  // Returns new promotion code value (string) just created)
  return stripe.promotionCodes.create(payload).then(r => r.code);
}
