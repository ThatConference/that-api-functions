import debug from 'debug';
import * as Sentry from '@sentry/node';
import { decodeMessage } from '../gcp/pubsub';

const dlog = debug('that:api:brinks:decodeMessageMw');

export default function decodePubSubMessage(req, res, next) {
  dlog('decodeMessage middleware called');

  const thatBrinks = {
    thatApp: 'brinks',
    isProcessed: false,
    decodeMessage: true,
    sentryLevel: '',
    stages: ['decodeMessage'],
  };
  req.thatBrinks = thatBrinks;

  const { data, messageId, publishTime } = req.body.message;
  if (!data || !messageId) {
    thatBrinks.errorMsg = `Invalid PubSub message received, missing properties`;
    thatBrinks.sentryLevel = 'error';
    console.log(thatBrinks.errorMsg);
    Sentry.setTag('pubsub', 'invalidMessage');
    res.status(400);
    return next(thatBrinks.errorMsg);
  }

  const decodedData = decodeMessage(data);
  if (!decodedData) {
    thatBrinks.errorMsg = `Unable to decode message data`;
    thatBrinks.sentryLevel = 'error';
    console.log(thatBrinks.errorMsg);
    Sentry.setTag('pubsub', 'invalidMessage');
    res.status(400);
    return next(thatBrinks.errorMsg);
  }

  req.stripeEvent = decodedData.data;
  req.pubSubMessage = {
    data: decodedData,
    messageId,
    publishTime,
  };
  thatBrinks.stripeEventType = decodedData.data.type;
  thatBrinks.stripeEventId = decodedData.data.id;
  thatBrinks.orderCreatedAt = new Date(decodedData.data.created * 1000);
  Sentry.setTags({
    stripeEventType: decodedData.data.type,
    stripeEventId: decodedData.data.id,
  });

  return next();
}

/*
body:: {
  subscription: 'projects/dev-that/subscriptions/push-sub',
  message: {
    data: 'eyJkYXRh--A_base64_encoded_string--1wbGV0ZWQifX0=',
    messageId: '16',
    attributes: {}
  }
}
decoded data:
'{"data":{"id":"evt_1ICVzrBvVBgmhQW4bDlJOmNC","object":"event","api_version":"2020-08-27","created":1611346363,"data":{"object":{"id":"cs_test_b13iDValue12345abcdef","object":"checkout.session","allow_promotion_codes":true,"amount_subtotal":2995,"amount_total":2995,"billing_address_collection":null,"cancel_url":"https://that.us/","client_reference_id":"cline-reference-id","currency":"usd","customer":"cus_customerid","customer_details":{"email":"brettski@example.com","tax_exempt":"none","tax_ids":[]},"customer_email":null,"livemode":false,"locale":null,"metadata":{"memberId":"tc_memberid","eventId":"THAT-eventId","productIds":"[\\"THATProductId\\"]"},"mode":"payment","payment_intent":"pi_PIidReferenceId","payment_method_types":["card"],"payment_status":"paid","setup_intent":null,"shipping":null,"shipping_address_collection":null,"submit_type":null,"subscription":null,"success_url":"https://that.us/","total_details":{"amount_discount":0,"amount_tax":0}}},"livemode":false,"pending_webhooks":2,"request":{"id":null,"idempotency_key":null},"type":"checkout.session.completed"}}'
*/
