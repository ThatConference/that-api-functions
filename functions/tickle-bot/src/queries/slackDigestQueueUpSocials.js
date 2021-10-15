export default {
  graphQl: `
    mutation invokeSlackDigest($communityInput: CommunityQueryInput!, $hours: Int!, $start: DigestStart) {
      communities {
        community(findBy: $communityInput) {
          sendDigest(hours: $hours, start: $start) {
            id
            title
            startTime
          }
          queueUpSocials(socials: [TWITTER, LINKEDIN, FACEBOOK]) 
        }
      }
    }
  `,
};
