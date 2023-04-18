// get Order Allocations for future events

export default {
  graphQl: `
  query getFutureEventsWithOrderAllocations4Matching {
    communities {
      community(findBy: { slug: "that" }) {
        get {
          id
          name
          events(filter: FUTURE) {
            id
            slug
            type
            startDate
            endDate
            admin {
              eventId
              orderAllocations(orderTypes: [REGULAR, PARTNER, SPEAKER]) {
                id
                allocatedTo {
                  __typename
                  id
                  firstName
                  lastName
                  email
                  profiles {
                    shared {
                      firstName
                      lastName
                      email
                      company
                      city
                      state                        
                    }
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
