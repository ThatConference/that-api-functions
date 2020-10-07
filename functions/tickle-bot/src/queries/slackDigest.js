export default {
  graphQl: `
    query invokeSlackDigest($communityInput: CommunityQueryInput!, $hours: Int!, $start: DigestStart) {
      communities {
        community(input: $communityInput) {
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
