/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import msgQueueFunc from '../dataSources/cloudFirestore/messageQueue';
import envConfig from '../envConfig';
import sendTemplateBatch from '../lib/postmark/sendTemplateBatch';

const dlog = debug('that:function:newman:queueReaderMw');

export default async function queueReader(req, res, next) {
  dlog('queueReader middleware called');
  const queueReaderStart = new Date().getTime();
  Sentry.addBreadcrumb({
    category: 'messageQueue',
    message: 'queueReader invoked',
    level: 'info',
  });

  const firestore = req.app.get('firestore');
  const msgQueueStore = msgQueueFunc(firestore);

  const batchSize = parseInt(envConfig.that.messagingReadQueueRate, 10);
  const sendQueue = await msgQueueStore.readQueue(batchSize);
  dlog('%d messages grabbed from queue', sendQueue.length);
  if (sendQueue.length > 0) {
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
    const postmarkSendErrors = msgResult.postmarkResponse.filter(
      p => p.ErrorCode !== 0,
    );
    const sendStats = {
      sent: msgResult.sentMessageIds.length,
      inTemplateError: msgResult.inErrorMessages.length,
      inSendingError: postmarkSendErrors.length,
      totalInQueue: sendQueue.length,
      batchSize,
      queuedAt,
    };

    try {
      const logid = await msgQueueStore.newLogEntry({
        logData: sendStats,
        postmarkSendErrors,
      });
      console.log('log id:', logid);
    } catch (err) {
      Sentry.addBreadcrumb({
        category: 'messageQueue',
        message: 'saving messageQueue log',
        level: 'warning',
      });
      Sentry.captureException(err);
      // not sending to errorHandler for a log issue, the messages have sent.
      // it does go to Sentry.
    }

    sendStats.queueReaderTime = new Date().getTime() - queueReaderStart;

    return res.json(sendStats);
  }

  return res.json({
    sent: 0,
    inTemplateError: 0,
    inSendingError: 0,
    totalInQueue: 0,
    batchSize,
    queueReaderTime: new Date().getTime() - queueReaderStart,
  });
}
