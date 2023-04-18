// Sends a batch of postmark messages
import debug from 'debug';
import { ServerClient as Postmark } from 'postmark';
import * as Sentry from '@sentry/node';
import { createBatchesFromCollection } from './createBatchesFromCollection';
import envConfig from '../envConfig';
import constants from '../constants';

const dlog = debug('that:api:ticklebot:sendPostmarkMessages');

export default async function sendPostmarkMessages({
  postmarkMessages,
  validationMessages,
}) {
  if (!Array.isArray(postmarkMessages) || !Array.isArray(validationMessages)) {
    Sentry.withScope(scope => {
      scope.setTag('function', 'sendPostmarkMessages');
      scope.setContext('Message collection lengths', {
        postmarkMessages: postmarkMessages?.length,
        validationMessages: validationMessages?.length,
      });
    });
    throw new Error(
      'postmarkMessages and/or validationMessages collection not in Array form',
    );
  }
  if (postmarkMessages.length !== validationMessages.length) {
    Sentry.withScope(scope => {
      scope.setTag('function', 'sendPostmarkMessages');
      scope.setContext('Message collection lengths', {
        postmarkMessages: postmarkMessages?.length,
        validationMessages: validationMessages?.length,
      });
    });
    throw new Error(
      'postmarkMessages and validationMessages collection sizes must match',
    );
  }
  dlog('sendPostmarkMessages called for %d messges', postmarkMessages?.length);
  const { postmark: postmarkConfig } = envConfig;
  const maxPerBatch = constants.POSTMARK.MAX_PER_BATCH;
  const postmark = new Postmark(postmarkConfig.apiToken);

  const messageBatches = createBatchesFromCollection({
    collection: postmarkMessages,
    maxBatchSize: maxPerBatch,
  });
  const batchedFuncs = messageBatches.map(mb =>
    postmark.sendEmailBatchWithTemplates(mb),
  );

  const allSendResults = await Promise.all(batchedFuncs);

  const sendResults = allSendResults.reduce((acum, curr) => {
    acum.push(...curr);
    return acum;
  }, []);

  dlog('postmark all return %d message results', sendResults.length);
  if (sendResults?.length !== validationMessages?.length) {
    Sentry.withScope(scope => {
      scope.setTag('function', 'sendPostmarkMessages');
      scope.setContext('counts', {
        validationMessages: validationMessages?.length,
        postmarkResults: sendResults?.length,
      });
    });
    throw new Error('Sent postmark batch count does not equal response count');
  }
  const messagesInError = [];
  const sentOrderAllocationIds = [];
  for (let j = 0; j < sendResults.length; j += 1) {
    const sendResult = sendResults[j];
    const postmarkMessage = postmarkMessages[j];
    const postmarkValidation = validationMessages[j];
    // dlog('compare:\n%O\n<----->\n%O', postmarkMessage, sendResult);
    if (sendResult.ErrorCode > 0) {
      dlog('Error sending email:\n%O\n%O', sendResult, postmarkMessage);
      messagesInError.push({
        sendResult,
        postmarkMessage,
      });
    } else {
      const ids = postmarkValidation?.that?.orderAllocationIds ?? [];
      if (ids.length === 0)
        dlog(
          'zero allocation ids(idx: %d)::\n%O\n::\n%O',
          j,
          postmarkValidation,
          sendResult,
        );
      sentOrderAllocationIds.push(...ids);
    }
  }

  return {
    sentOrderAllocationIds,
    messagesInError,
    sendResults,
  };
}
