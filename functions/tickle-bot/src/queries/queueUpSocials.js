export default {
  graphQl: `
    mutation invokeSlackDigest($communityInput: CommunityQueryInput!, $hours: Int!, $start: DigestStart) {
      communities {
        community(findBy: $communityInput) {
          queueUpSocials(socials: [TWITTER, LINKEDIN, FACEBOOK]) 
        }
      }
    }
  `,
};
