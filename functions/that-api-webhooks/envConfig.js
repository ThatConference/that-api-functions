function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  tallyfyOrgId: process.env.TALLYFY_ORG_ID || configMissing('TALLYFY_ORG_ID'),
  tallyfyApiBase:
    process.env.TALLYFY_API_BASE || configMissing('TALLYFY_API_BASE'),
  tallyfyAccessToken:
    process.env.TALLYFY_ACCESS_TOKEN || configMissing('TALLYFY_ACCESS_TOKEN'),
  activeCampaignApi:
    process.env.ACTIVE_CAMPAIGN_API || configMissing('ACTIVE_CAMPAIGN_API'),
  activeCampaignKey:
    process.env.ACTIVE_CAMPAIGN_KEY || configMissing('ACTIVE_CAMPAIGN_KEY'),
  hubSpot: {
    api: process.env.HUBSPOT_API || configMissing('HUBSPOT_API'),
    token: process.env.HUBSPOT_TOKEN || configMissing('HUBSPOT_TOKEN'),
    profileOnboardingId:
      process.env.HUBSPOT_PROFILE_ONBOARDING_ID ||
      configMissing('HUBSPOT_PROFILE_ONBOARDING_ID'),
    subs: {
      newUserOnboarding: 'New User Onboarding',
      noProfileOnboarding: 'No Profile Onboarding',
      thatNewsletter: 'THAT Newsletter',
    },
  },
});

module.exports = requiredConfig();
