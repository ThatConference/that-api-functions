// get Order Allocations for future events

export default {
  graphQl: `
  query getManyEventsWithOrderAllocations {
    communities {
      community(findBy: { slug: "that" }) {
        get {
          id
          name
          events(filter: FUTURE) {
            id
            name
            type
            year
            slogan
            description
            startDate
            endDate
            isCallForSpeakersOpen
            admin {
              eventId
              orderAllocations {
                id
                product {
                  ...on ProductBase {
                    name
                    uiReference
                    type
                  }
                }
                notificationSentAt
                enrollmentStatus
                uiReference
                notificationSentAt
                allocatedTo {
                  __typename
                  id
                  firstName
                  lastName
                  email
                }
                order {
                  id
                  orderType
                  createdAt
                  member{
                    __typename
                    id
                    firstName
                    lastName
                    email
                  }
                }
              }
            }
          }
        }
      }
    }
  }
      `,
};
