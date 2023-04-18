const constants = {
  TICKLEBOT: {
    FIRESTORE: 'firestore',
    ENGAGEMENT: {
      MEET_THAT_MIN_DAYS: 5, // minumum days between sends
    },
  },
  POSTMARK: {
    TEMPLATES: {
      ORDER_OWNER_NOT_TRANSFERRED: 'order-owner-tickets-not-transferred',
      TICKET_HOLDER_NOT_COMPLETE: 'ticket-holder-tickets-incomplete',
      MEET_THAT: 'engagement-meet-that',
    },
    MAX_PER_BATCH: 450,
  },
};

export default constants;
