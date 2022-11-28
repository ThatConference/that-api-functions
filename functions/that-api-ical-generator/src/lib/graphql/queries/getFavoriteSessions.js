export default {
  graphQl: `
    query SessionIcalQuery($eventId: ID!, $days: Int) {
      members {
        me {
          firstName
          profileSlug
        }
      }
      sessions {
        me {
          favorites(eventId: $eventId, historyDays: $days) {
            __typename
            id
            session {
              __typename
              id
              eventId
              slug
              title
              shortDescription
              longDescription
              startTime
              duration
              durationInMinutes
              type
              targetLocation
              status
              tags
              location {
                __typename
                destination
                url
                isOnline
              }
              speakers {
                firstName
                lastName                
              }
              prerequisites
            }
          }
        }
      }
    }  
  `,
};
