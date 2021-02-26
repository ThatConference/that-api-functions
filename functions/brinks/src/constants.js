import { constants as apiConstants } from '@thatconference/api';

const constants = {
  ...apiConstants,
  THAT: {
    PRODUCT_TYPE: {
      TICKET: 'TICKET',
      MEMBERSHIP: 'MEMBERSHIP',
      PARTNERSHIP: 'PARTNERSHIP',
      FOOD: 'FOOD',
      COUPON: 'COUPON',
    },
  },
  POSTMARK: {
    TEMPLATES: {
      PURCHASE_TICKET: 'ticket-purchase-thank-you',
      PURCHASE_MEMBERSHIP: 'membership-purchase-thank-you',
      ONLINE_IN_X_DAYS: '',
    },
  },
};

export default constants;
