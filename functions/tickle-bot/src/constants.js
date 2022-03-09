const constants = {
  TICKLEBOT: {
    FIRESTORE: 'firestore',
  },
  POSTMARK: {
    TEMPLATES: {
      ORDER_OWNER_NOT_TRANSFERRED: 'order-owner-tickets-not-transferred',
      TICKET_HOLDER_NOT_COMPLETE: 'ticket-holder-tickets-incomplete',
    },
    MAX_PER_BATCH: 450,
  },
};

export default constants;
