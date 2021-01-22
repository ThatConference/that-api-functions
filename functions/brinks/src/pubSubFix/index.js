// An express endpoint to reconstruct a request to the proper form for
// a PubSub background function.
// general issue: https://github.com/GoogleCloudPlatform/functions-framework-nodejs/issues/41
import 'dotenv/config';
import fetch from 'node-fetch';
import debug from 'debug';

const dlog = debug('that:api:functions:pubSubFix');
debug.enable('that:*');
dlog('setting up pubSubFix');
// eslint-disable-next-line no-console
console.log('env DEBUG', process.env.DEBUG);

const defaultPostUrl = 'http://localhost:8081';

export const pubSubFix = (_nothing, data) => {
  dlog('pubSubFix called');
  dlog('_nothing %O', _nothing);
  dlog('data length %d', JSON.stringify(data).length);
  if (_nothing) throw new Error('YO, we have data in _nothing argument');

  const now = new Date();
  const context = {
    eventId: `manual-regen-by-pubsubfix-${now.getTime()}`,
    resource: {},
    eventType: 'google.pubsub.topic.publish',
    timestamp: now,
  };

  fetch(defaultPostUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data.message, context }),
  })
    .then(res => {
      if (res.ok) dlog('pubSubFix successful');
    })
    .catch(err => dlog('error %o', err));
};
