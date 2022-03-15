import fetch from 'node-fetch';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import envConfig from '../../envConfig';
import { SendSlackError } from '../errors';

const dlog = debug('that:api:brinks:notifications:slack');

function callSlackHook(hookBody) {
  dlog('calling Slack hook');
  if (
    envConfig.that.slackWebhookUrl &&
    (process.env.NODE_ENV === 'production' ||
      envConfig.that.isTestSlackNotifications !== true)
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
        Sentry.captureException(new SendSlackError(err.message));
      });
  } else {
    dlog('DEVELOPMENT Env: SLACK PAYLOAD TO SEND: %o', hookBody);
  }
}

function scrubSlackTitle(html) {
  // reference: https://api.slack.com/reference/surfaces/formatting#escaping
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function newOrder({ order, products, member }) {
  dlog('newOrder notification called');

  let memberName = '<manual order>';
  if (member && member.firstName)
    memberName = `${member.firstName} ${member.lastName}`;
  let eventName = order.event;
  if (order.event === `w1ZQFzsSZzRuItVCNVmC`) {
    eventName = `Wisconsin 2022`;
  } else if (order.event === `OlyDhUyrp2DI9babqZO9`) {
    eventName = `Texas 2022`;
  }

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
    username: 'THAT Bot <🌲> ',
    icon_emoji: ':coin:',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${memberName} placed an order for ${eventName} :money_with_wings:`,
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

function subscriptionChanged({ member, subscriptionId, cancelAtPeriodEnd }) {
  dlog('subscription changed notification called');
  let memberName = `${member.firstName} ${member.lastName}` || 'Unknown Name';
  memberName = scrubSlackTitle(memberName);
  const cancelAction = cancelAtPeriodEnd ? 'cancelled' : 'reinstated';
  const emoji = cancelAtPeriodEnd
    ? ':woman-gesturing-no:'
    : ':woman-gesturing-ok:';
  let details = `*member:* <https://that.us/members/${member.profileSlug}|${memberName}>\n`;
  details += `*subscription:* <https://dashboard.stripe.com/subscriptions/${subscriptionId}|${subscriptionId}>\n`;

  const slackBody = {
    channel: envConfig.that.slackChannelOrder,
    username: 'THAT Bot < 🌲> ',
    icon_emoji: emoji,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${memberName} ${cancelAction} their membership`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: details,
        },
      },
    ],
  };

  callSlackHook(slackBody);
}

function subscriptionRenewed({ member, subscriptionId }) {
  dlog('subscription renewed notification called');
  let memberName = `${member.firstName} ${member.lastName}` || 'Unknown Name';
  memberName = scrubSlackTitle(memberName);
  let details = `*member:* <https://that.us/members/${member.profileSlug}|${memberName}>\n`;
  details += `*subscription:* <https://dashboard.stripe.com/subscriptions/${subscriptionId}|${subscriptionId}>\n`;
  let userProfileImage = member.profileImage;
  if (!userProfileImage || userProfileImage.length < 7)
    userProfileImage =
      'https://images.that.tech/members/person-placeholder.jpg';
  const slackBody = {
    channel: envConfig.that.slackChannelOrder,
    username: 'THAT Bot < 🌲> ',
    icon_emoji: ':bellhop_bell:',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${memberName} renewed their membership!`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: details,
        },
        accessory: {
          type: 'image',
          image_url: userProfileImage,
          alt_text: memberName,
        },
      },
    ],
  };

  callSlackHook(slackBody);
}

export default { newOrder, subscriptionChanged, subscriptionRenewed };
