import fetch from 'node-fetch';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import envConfig from '../../envConfig';

const dlog = debug('that:api:brinks:notifications:slack');

function callSlackHook(hookBody) {
  dlog('calling Slack hook');
  if (
    envConfig.that.slackWebhookUrl &&
    (process.env.NODE_ENV === 'production' ||
      process.env.TEST_SLACK_NOTIFICATIONS === 'true')
  ) {
    // send the slacks
    const slackUrl = envConfig.that.slackWebhookUrl;
    fetch(slackUrl, {
      method: 'post',
      body: JSON.stringify(hookBody),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.text())
      .then(res => dlog('slack webhook response: %o', res))
      .catch(err => {
        dlog('ERROR sending slack notification: %O', err);
        Sentry.setContext('slackPayload', hookBody);
        Sentry.setTag('nodeEvent', 'slackNotificationFailure');
        Sentry.captureException(err);
      });
  } else {
    dlog('DEVELOPMENT Env: SLACK PAYLOAD TO SEND: %o', hookBody);
  }
}

function newOrder({ order, products, member }) {
  dlog('newOrder notification called');

  let memberName = '<manual order>';
  if (member && member.firstName)
    memberName = `${member.firstName} ${member.lastName}`;

  let productText = '';
  const { lineItems } = order;
  const plen = lineItems.length;
  for (let i = 0; i < plen; i += 1) {
    const li = order.lineItems[i];
    const product = products.find(p => p.id === li.product);
    productText += `*${product.name}*:  ${li.quantity}${i < plen ? '\n' : ''}`;
  }

  const slackBody = {
    channel: envConfig.that.slackChannelOrder,
    username: 'THAT Bot < 🌲> ',
    icon_emoji: ':coin:',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${memberName} placed an order :money_with_wings:`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: productText,
        },
      },
    ],
  };

  callSlackHook(slackBody);
}

export default { newOrder };
