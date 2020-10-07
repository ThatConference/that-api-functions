export default {
  graphQl: `
    query getCommunityStats($communityInput: CommunityQueryInput!) {
      communities {
        community(input: $communityInput) {
          stats {
            totalMembers
            totalActivities
            pastActivities
            upcomingActivities
            hoursServed
            minutesServed
            totalEvents
          }
        }
      }
    }
  `,
};
