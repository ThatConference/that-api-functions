import 'dotenv/config';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { Firestore } from '@google-cloud/firestore';

const dlog = debug('that:api:functions:brinks');
dlog('setting up');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  debug: process.env.NODE_ENV === 'development',
});
Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'brinks');
  scope.setTag('subSystem', 'checkout');
});

function testHandlerData(data, context) {
  dlog('data >  %O', data);
  dlog('context %O', context);
  const { message } = data;
  let messageData = '';
  if (message.data) {
    messageData = Buffer.from(message.data, 'base64').toString('utf8');
  } else {
    dlog('message.data > undefined');
  }

  if (messageData) {
    // check for message types here
    dlog('MESSAGE DATA > %O', messageData);
    dlog('THE CONTEXT >  %O', context);
  } else {
    dlog('no data in message.');
  }
}

export const handler = (data, context) => {
  dlog('handler called');
  testHandlerData(data, context);

  // const { message } = data;
  // let messageData;
  // if (message.data) {
  //   messageData = Buffer.from(message.data, 'base64').toString('utf-8');
  // }
  // if (!messageData) {
  //   Sentry.captureException(new Error('No Stripe event data in message'), {
  //     message,
  //   });
  //   return;
  // }

  // const { id, type, data: msgData } = messageData.data.message;
  // const orderData = {
  //   stripeEventId: id,
  //   type,
  //   data: msgData,
  // };

  // switch (type) {
  //   case 'checkout.session.complete':
  //     // call it's funciton
  //     break;
  //   case 'customer.created':
  //     // call it's function
  //     break;
  //   default:
  //     Sentry.captureException(new Error(`unknown type encountered ${type}`), {
  //       orderData,
  //     });
  // }
};

/* Message received data example
[run:brinks] 2021-01-15T18:20:10.524Z that:api:functions:brinks handler called
[run:brinks] 2021-01-15T18:20:10.524Z that:api:functions:brinks data >  {
[run:brinks]   message: {
[run:brinks]     data: 'eyJkYXRhIjp7Im1lc3NhZ2UiOnsiaWQiOiJldnRfMUk5d3U2QnZWQmdtaFFXNGRHVlN5RXM4Iiwib2JqZWN0IjoiZXZlbnQiLCJhcGlfdmVyc2lvbiI6IjIwMjAtMDgtMjciLCJjcmVhdGVkIjoxNjEwNzM0ODEwLCJkYXRhIjp7Im9iamVjdCI6eyJpZCI6ImNzX3Rlc3RfYjFVQ0tVMWJPcUlEUFlkbjZ4bE04Vnl3NkJJcmpkNXFCV0tGZXV2anR4U1JxYlFoSXJkSTJ4TmtveCIsIm9iamVjdCI6ImNoZWNrb3V0LnNlc3Npb24iLCJhbGxvd19wcm9tb3Rpb25fY29kZXMiOnRydWUsImFtb3VudF9zdWJ0b3RhbCI6MTE5ODAsImFtb3VudF90b3RhbCI6MTE5ODAsImJpbGxpbmdfYWRkcmVzc19jb2xsZWN0aW9uIjpudWxsLCJjYW5jZWxfdXJsIjoiaHR0cHM6Ly90aGF0LnVzLyIsImNsaWVudF9yZWZlcmVuY2VfaWQiOiJnb29nbGUtb2F1dGgyfDExMzAxNjY1ODA0OTkyMzIzMjE1NiIsImN1cnJlbmN5IjoidXNkIiwiY3VzdG9tZXIiOiJjdXNfSWlxb1k3dzJ5ZGluTWQiLCJjdXN0b21lcl9kZXRhaWxzIjp7ImVtYWlsIjoiYnJldHRAdGhhdGNvbmZlcmVuY2UuY29tIiwidGF4X2V4ZW1wdCI6Im5vbmUiLCJ0YXhfaWRzIjpbXX0sImN1c3RvbWVyX2VtYWlsIjpudWxsLCJsaXZlbW9kZSI6ZmFsc2UsImxvY2FsZSI6bnVsbCwibWV0YWRhdGEiOnsibWVtYmVySWQiOiJnb29nbGUtb2F1dGgyfDExMzAxNjY1ODA0OTkyMzIzMjE1NiIsImV2ZW50SWQiOiJZV2F2QTcwc3pSOHJ4U3dyTEphTCIsInByb2R1Y3RzSWRzIjoiW1wiOVhxdFp3QjNRQXA5UDBTakVPNjNcIl0ifSwibW9kZSI6InBheW1lbnQiLCJwYXltZW50X2ludGVudCI6InBpXzFJOXdzd0J2VkJnbWhRVzRpUEFBaTZtYiIsInBheW1lbnRfbWV0aG9kX3R5cGVzIjpbImNhcmQiXSwicGF5bWVudF9zdGF0dXMiOiJwYWlkIiwic2V0dXBfaW50ZW50IjpudWxsLCJzaGlwcGluZyI6bnVsbCwic2hpcHBpbmdfYWRkcmVzc19jb2xsZWN0aW9uIjpudWxsLCJzdWJtaXRfdHlwZSI6bnVsbCwic3Vic2NyaXB0aW9uIjpudWxsLCJzdWNjZXNzX3VybCI6Imh0dHBzOi8vdGhhdC51cy8iLCJ0b3RhbF9kZXRhaWxzIjp7ImFtb3VudF9kaXNjb3VudCI6MCwiYW1vdW50X3RheCI6MH19fSwibGl2ZW1vZGUiOmZhbHNlLCJwZW5kaW5nX3dlYmhvb2tzIjoyLCJyZXF1ZXN0Ijp7ImlkIjpudWxsLCJpZGVtcG90ZW5jeV9rZXkiOm51bGx9LCJ0eXBlIjoiY2hlY2tvdXQuc2Vzc2lvbi5jb21wbGV0ZWQiLCJzb21lU2hpdCI6IkJyZXR0IHNldCB0aGlzIn19fQ==',
[run:brinks]     messageId: '3',
[run:brinks]     attributes: {}
[run:brinks]   },
[run:brinks]   subscription: 'projects/dev-that/subscriptions/push-sub',
[run:brinks]   '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage'
[run:brinks] }
[run:brinks] 2021-01-15T18:20:10.524Z that:api:functions:brinks context {
[run:brinks]   eventId: 'manual-regen-by-pubsubfix-1610734810522',
[run:brinks]   resource: {},
[run:brinks]   eventType: 'google.pubsub.topic.publish',
[run:brinks]   timestamp: '2021-01-15T18:20:10.522Z'
[run:brinks] }
[run:brinks] 2021-01-15T18:20:10.524Z that:api:functions:brinks MESSAGE DATA > '{"data":{"message":{"id":"evt_1I9wu6BvVBgmhQW4dGVSyEs8","object":"event","api_version":"2020-08-27","created":1610734810,"data":{"object":{"id":"cs_test_b1UCKU1bOqIDPYdn6xlM8Vyw6BIrjd5qBWKFeuvjtxSRqbQhIrdI2xNkox","object":"checkout.session","allow_promotion_codes":true,"amount_subtotal":11980,"amount_total":11980,"billing_address_collection":null,"cancel_url":"https://that.us/","client_reference_id":"google-oauth2|113016658049923232156","currency":"usd","customer":"cus_IiqoY7w2ydinMd","customer_details":{"email":"brett@thatconference.com","tax_exempt":"none","tax_ids":[]},"customer_email":null,"livemode":false,"locale":null,"metadata":{"memberId":"google-oauth2|113016658049923232156","eventId":"YWavA70szR8rxSwrLJaL","productsIds":"[\\"9XqtZwB3QAp9P0SjEO63\\"]"},"mode":"payment","payment_intent":"pi_1I9wswBvVBgmhQW4iPAAi6mb","payment_method_types":["card"],"payment_status":"paid","setup_intent":null,"shipping":null,"shipping_address_collection":null,"submit_type":null,"subscription":null,"success_url":"https://that.us/","total_details":{"amount_discount":0,"amount_tax":0}}},"livemode":false,"pending_webhooks":2,"request":{"id":null,"idempotency_key":null},"type":"checkout.session.completed","someShit":"Brett set this"}}}'
[run:brinks] 2021-01-15T18:20:10.524Z that:api:functions:brinks THE CONTEXT >  {
[run:brinks]   eventId: 'manual-regen-by-pubsubfix-1610734810522',
[run:brinks]   resource: {},
[run:brinks]   eventType: 'google.pubsub.topic.publish',
[run:brinks]   timestamp: '2021-01-15T18:20:10.522Z'
[run:brinks] }
[run:pubSubFix] 2021-01-15T18:20:10.526Z that:api:functions:pubSubFix pubSubFix successful
*/
