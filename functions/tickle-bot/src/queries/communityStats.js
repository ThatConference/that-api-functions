export default {
  graphQl: `
    query getCommunityStats($communityInput: CommunityQueryInput!) {
      communities {
        community(findBy: $communityInput) {
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
