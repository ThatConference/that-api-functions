const constants = {
  THAT: {
    PRODUCT_TYPE: {
      TICKET: 'TICKET',
      MEMBERSHIP: 'MEMBERSHIP',
      PARTNERSHIP: 'PARTNERSHIP',
      FOOD: 'FOOD',
      COUPON: 'COUPON',
    },
  },
  STRIPE: {
    CHECKOUT_MODE: {
      PAYMENT: 'payment',
      SUBSCRIPTION: 'subscription',
    },
    SUBSCRIPTION_STATUS: {
      ACTIVE: 'active',
      CANCELLED: 'canceled',
      PAST_DUE: 'past_due',
      UNPAID: 'unpaid',
      INCOMPLETE: 'incomplete',
      INCOMPLETE_EXPIRED: 'incomplete_expired',
    },
  },
};
export default constants;
