/* eslint-disable camelcase */
import debug from 'debug';
import fetch from 'node-fetch';
import * as Sentry from '@sentry/node';
import envConfig from './envConfig';

const dlog = debug('that:api:ticklebot');

export default function reqAuthToken() {
  dlog('request auth token');
  const auth0Url = 'https://auth.that.tech/oauth/token';
  const client_id = envConfig.auth0ClientId;
  const client_secret = envConfig.auth0ClientSecret;
  const audience = envConfig.auth0Audience;
  const grant_type = 'client_credentials';

  const payload = {
    client_id,
    client_secret,
    audience,
    grant_type,
  };

  return fetch(auth0Url, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => res.json())
    .then(res => {
      if (res.token_type !== 'Bearer')
        throw new Error(
          `invalid token type returned, ${res.token_type}, expected 'Bearer'`,
        );
      return res.access_token;
    })
    .catch(err => {
      dlog('error %O', err);
      Sentry.captureException(err);
    });
}
