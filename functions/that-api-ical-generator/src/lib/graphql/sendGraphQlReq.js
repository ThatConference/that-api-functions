import debug from 'debug';
import fetch from 'node-fetch';
import * as Sentry from '@sentry/node';
import envConfig from '../../envConfig';

const dlog = debug('that:function:that-api-ical-generator:sendGraphReq');

export default async function sendGraphQlReq({ payload, auth }) {
  dlog('sendGraphReq called');
  const gateway = envConfig.that.apiGateway;
  // const token = await reqAuthToken();
  dlog('authorization string: %s', auth);
  const headers = {
    'Content-Type': 'application/json',
    // authorization: `Bearer ${token}`,
    authorization: auth,
  };
  dlog('payload %o', payload);

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
