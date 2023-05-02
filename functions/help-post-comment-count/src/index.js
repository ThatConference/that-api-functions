// https://cloud.google.com/functions/docs/calling/cloud-firestore
// This is a gen1 function. Unable to deploy firestore trigger at time of writting.
/* eslint-disable no-console */
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import debug from 'debug';
import Firestore from '@google-cloud/firestore';

const dlog = debug('that:api:helpPostCommentCount');
const firestore = new Firestore();
// const helpPostColName = 'helpPost';
const helpPostColName = 'helpPosts';
const commentColName = 'helpPostComments';
let version;
let packageName;
(async () => {
  let p;
  try {
    // eslint-disable-next-line import/no-unresolved
    p = await import('./package.json');
  } catch {
    p = await import('../package.json');
  }
  version = p.version;
  packageName = p.name;
})();
const defaultVersion = `${packageName}@${version}`;
dlog('function started');

export const helpPostCommentCount = async (event, context) => {
  dlog('function triggered');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.THAT_ENVIRONMENT,
    release: process.env.SENTRY_VERSION || defaultVersion,
    debug: process.env.NODE_ENV === 'development',
    normalizeDepth: 6,
  });

  const triggerResource = context.resource;
  console.log(`Function triggered by event on: ${triggerResource}`);
  console.log(`Event type: ${context.eventType}`);
  // we only update count on create and deletes. Update mask is empty in both of
  // these cases. If there are values, it's an update. leave.
  if (Object.keys(event?.updateMask).length > 0) {
    console.log('document update, leaving');
    return undefined;
  }
  const { commentId, helpPostId } = context.params;
  console.log(`👽 params: commentId: ${commentId}, helpPostId: ${helpPostId}`);
  Sentry.configureScope(scope => {
    scope.setTags({
      triggerResource,
      triggerEventType: context.eventType,
      triggerEventId: context.eventId,
      helpPostId,
      commentId,
    });
    scope.setContext('trigger context', { context });
    scope.setContext('trigger event', { event });
  });

  const eventDoc = event.value.name;
  dlog('👽 Event Doc path/name (undefined on delete):: %s', eventDoc);

  // If a read-write transaction fails with contention,
  // the transaction is retried up to five times
  return firestore.runTransaction(transaction => {
    dlog('👽 executing transaction');
    return firestore
      .collection(`${helpPostColName}/${helpPostId}/${commentColName}`)
      .count()
      .get()
      .then(countData => {
        const commentCount = countData.data().count ?? 0;
        const docRef = firestore.doc(`${helpPostColName}/${helpPostId}`);
        return transaction.update(docRef, { commentCount });
      })
      .then(() => console.log('transaction result', true))
      .catch(err => {
        const sentryId = Sentry.captureException(err);
        console.log('error reference:', sentryId);
      });
  });
};
