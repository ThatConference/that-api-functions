function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  tallyfyOrgId: process.env.TALLYFY_ORG_ID || configMissing('TALLYFY_ORG_ID'),
  tallyfyApiBase: process.env.TALLYFY_API_BASE || configMissing('TALLYFY_API_BASE'),
  tallyfyAccessToken: process.env.TALLYFY_ACCESS_TOKEN || configMissing('TALLYFY_ACCESS_TOKEN'),
  activeCampaignApi: process.env.ACTIVE_CAMPAIGN_API || configMissing('ACTIVE_CAMPAIGN_API'),
  activeCampaignKey: process.env.ACTIVE_CAMPAIGN_KEY || configMissing('ACTIVE_CAMPAIGN_KEY'),
});

module.exports = requiredConfig();
