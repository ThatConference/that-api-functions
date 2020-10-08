export default {
  graphQl: `
    query invokeSlackDigest($communityInput: CommunityQueryInput!, $hours: Int!, $start: DigestStart) {
      communities {
        community(findBy: $communityInput) {
          sendDigest(hours: $hours, start: $start) {
            id
            title
            startTime
          }
        }
      }
    }
  `,
};
