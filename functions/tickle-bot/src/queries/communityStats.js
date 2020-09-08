export default {
  graphQl: `
    query getCommunityStats {
      communities(name: "that") { 
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
  `,
};
