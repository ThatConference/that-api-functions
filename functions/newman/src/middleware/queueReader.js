/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import msgQueueFunc from '../dataSources/cloudFirestore/messageQueue';
import constants from '../constants';
import sendTemplateBatch from '../lib/postmark/sendTemplateBatch';

const dlog = debug('that:function:newman:queueReaderMw');

export default async function queueReader(req, res, next) {
  dlog('queueReader middleware called');
  const queueReaderStart = new Date().getTime();
  Sentry.addBreadcrumb({
    category: 'messageQueue',
    message: 'queueReader invoked',
    level: Sentry.Severity.Info,
  });

  const firestore = req.app.get('firestore');
  const msgQueueStore = msgQueueFunc(firestore);

  const batchSize = constants.THAT.MESSAGING.READ_QUEUE_RATE;
  const sendQueue = await msgQueueStore.readQueue(batchSize);
  if (sendQueue.length > 0) {
    dlog('%d messages grabbed from queue', sendQueue.length);
    const queuedAt = new Date();
    let msgResult;
    try {
      // send things
      msgResult = await sendTemplateBatch(sendQueue);

      // update queue records
      await Promise.all([
        msgQueueStore.updateMany(msgResult.sentMessageIds, {
          isQueuedToSend: true,
          queuedAt,
        }),
        msgQueueStore.updateBatch(msgResult.inErrorMessages),
      ]);
    } catch (err) {
      return next(err);
    }

    dlog('postmark result\n %o', msgResult.postmarkResponse);
    const sendStats = {
      sent: msgResult.sentMessageIds.length,
      inTemplateError: msgResult.inErrorMessages.length,
      inSendingError: msgResult.postmarkResponse.filter(p => p.ErrorCode !== 0)
        .length,
      totalInQueue: sendQueue.length,
      batchSize,
      queuedAt,
      queueReaderTime: new Date().getTime() - queueReaderStart,
    };

    try {
      const logid = await msgQueueStore.newLogEntry(sendStats);
      console.log('log id:', logid);
    } catch (err) {
      Sentry.addBreadcrumb({
        category: 'messageQueue',
        message: 'saving messageQueue log',
        level: Sentry.Severity.Warning,
      });
      Sentry.captureException(err);
      // not sending to errorHandler for a log issue, the messages have sent.
      // it does go to Sentry.
    }

    return res.json(sendStats);
  } // sendQueue.length > 0

  return res.json({
    sent: 0,
    inTemplateError: 0,
    inSendingError: 0,
    totalInQueue: 0,
    batchSize,
    queueReaderTime: new Date().getTime() - queueReaderStart,
  });
}
