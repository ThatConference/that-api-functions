require('dotenv').config();
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

var member = {
  firstName: 'Brett',
  lastName: 'Slaski',
  email: 'brett@thatconference.com',
};

var order = {
  id: 'brett123',
  orderType: 'PARTNER',
  event: 'THATConferenceTexas2023',
  lineItems: [
    {
      productId: 'oQ5aMEMaTV48E6lGrUCt',
      quantity: 1,
      isBulkPurchase: false,
    },
  ],
};

var orderAllocations = [
  {
    event: 'THATConferenceTexas2023',
    productType: 'TICKET',
    eventActivities: ['CAMPER'],
    //eventActivities: ['EXPO_HALL'],
    allocatedTo: 'brett|abc',
  },
];

var products = [
  {
    productId: 'oQ5aMEMaTV48E6lGrUCt',
    name: 'Camper (test)',
  },
];

var constants = require('./__build__/constants').default;

var OrderEvent = require('./__build__/lib/events/orders').default;

var oe = OrderEvent();

oe.emit(constants.ORDER_EVENT_EMITTER.ORDER_CREATED, {
  firestore,
  products,
  order,
  orderAllocations,
  member,
});
