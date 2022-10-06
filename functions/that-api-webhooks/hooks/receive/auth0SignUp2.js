const Sentry = require('@sentry/node');
const debug = require('debug');
const hubspot = require('../send/hubSpot');
const envConfig = require('../../envConfig');

const dlog = debug('that:api:webhooks:auth0SignUp2');

module.exports = async (req, res, next) => {
  dlog('trigger auth0SignUp2');
  if (req.method !== 'POST') {
    console.error(`Non POST request, ${req.method}`);
    Sentry.captureMessage(`Non Post Request`, 'info');
    return res.status(405).send('unsuported method.');
  }

  const payload = req.body;
  dlog('payload: %o', payload);
  Sentry.setContext('payload', payload);
  if (!payload.email) {
    dlog('no email found in payload, leaving');
    return res.status(400).send('Bad Request. Did you forget your payload?');
  }
  let contactResult;
  try {
    contactResult = await hubspot.findContactByEmail(payload.email);
  } catch (err) {
    return next(err);
  }
  dlog('contact result vid: %o', contactResult?.vid);
  // since we have limited subscription status from HubSpot we'll simply
  // attempt to add the person to the list again.
  if (!contactResult?.vid) {
    // contact not found, creating
    contactResult = await hubspot.createOrUpdateContact({
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      memberId: payload.user_id,
    });
    console.log('create/update contact result', contactResult);
  }
  const subscriptionId = envConfig.hubSpot.profileOnboardingId;
  let subscribeResult;
  try {
    subscribeResult = await hubspot.subscribeContact({
      email: payload.email,
      subscriptionId,
    });
  } catch (err) {
    return next(err);
  }
  console.log('add subscription result', subscribeResult);

  return res.json({
    vid: contactResult.vid,
    email: payload.email,
    subscription: subscribeResult,
  });
};
