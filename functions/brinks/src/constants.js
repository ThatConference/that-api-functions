import { constants as apiConstants } from '@thatconference/api';

const constants = {
  ...apiConstants,
  POSTMARK: {
    TEMPLATES: {
      PURCHASE_MEMBERSHIP: 'membership-purchase-thank-you',
      ONLINE_IN_X_DAYS: '',
    },
  },
  BRINKS: {
    ORDER_EVENTS: 'orderEvents',
    FIRESTORE: 'firestore',
  },
};
constants.THAT.DISCOUNT_CODE = {
  TYPE: {
    TICKET: 'TICKET',
    STORE: 'STORE',
  },
};
// Hey you found the codes, use hAckEr12 for 12% off instead!!!
constants.THAT.PROMO_CODE = {
  MEMBERSHIP_STORE_DISCOUNT: {
    TITLE: 'Membership THAT Store Discount 10%',
    CODE: 'THATMembership2021',
    EXPIRE_IN_DAYS: 1825,
  },
};
constants.STRIPE.COUPON = {
  MEMBERSHIP_CAMPER:
    process.env.NODE_ENV === 'production' ? 'Mab7foqE' : 'wjxAwiPB',
};

export default constants;
