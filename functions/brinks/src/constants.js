const constants = () => ({
  that: {
    productType: {
      ticket: 'TICKET',
      membership: 'MEMBERSHIP',
      partnership: 'PARTNERSHIP',
      food: 'FOOD',
    },
  },
  stripe: {
    checkoutMode: {
      payment: 'payment',
      subscription: 'subscription',
    },
    subscriptionStatus: {
      active: 'active',
      cancelled: 'canceled',
      pastDue: 'past_due',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incompleteExpired: 'incomplete_expried',
    },
  },
});
export default constants();
