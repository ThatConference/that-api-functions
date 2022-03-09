import debug from 'debug';
import fetch from 'node-fetch';
import * as Sentry from '@sentry/node';
import envConfig from './envConfig';
import reqAuthToken from './reqAuthToken';

const dlog = debug('that:api:ticklebot:sendGraphReq');

export default async function sendGraphReq(payload) {
  dlog('sendGraphReq called');
  const gateway = envConfig.that.apiGateway;
  const token = await reqAuthToken();
  dlog('token: %s', token);
  const headers = {
    'Content-Type': 'application/json',
    authorization: `Bearer ${token}`,
  };
  dlog('payload %O', payload);

  return fetch(gateway, {
    method: 'post',
    body: JSON.stringify(payload),
    headers,
  })
    .then(res => res.json())
    .catch(err => {
      dlog('error in request: %O', err);
      Sentry.captureException(err);
    });
}
