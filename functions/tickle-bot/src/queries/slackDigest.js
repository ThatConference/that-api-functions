export default {
  graphQl: `
    query invokeSlackDigest($communityName: String!, $hours: Int!, $start: DigestStart) {
      communities(name: $communityName) {
        sendDigest(hours: $hours, start: $start) {
          id
          title
        }
      }
    }
  `,
};
