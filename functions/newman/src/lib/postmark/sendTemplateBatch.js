import debug from 'debug';
import { ServerClient as Postmark } from 'postmark';
import envConfig from '../../envConfig';

const postmark = new Postmark(envConfig.postmark.apiToken);
const dlog = debug('that:function:newman:postmark');

export default async msgQueue => {
  dlog('sendTemplateBatch called');
  if (!Array.isArray(msgQueue))
    throw new Error('sendTemplateBatch parameter, msgQueue, must be an array');

  if (msgQueue.length > 500)
    throw new Error(
      'sendTemplateBatch parameter >500, Postmark Batch limit is 500 messages',
    );

  const From = envConfig.postmark.emailFrom;
  const tranStream = envConfig.postmark.transactionalStream;
  const broadStream = envConfig.postmark.broadcastStream;
  const templatedMessages = [];
  const sentMessageIds = [];
  const inErrorMessages = [];
  msgQueue.forEach(msg => {
    let MessageStream;
    if (msg.postmarkMessageType === 'TRANSACTIONAL') {
      MessageStream = tranStream;
    } else if (msg.postmarkMessageType === 'BROADCAST') {
      MessageStream = broadStream;
    } else {
      inErrorMessages.push({
        id: msg.id,
        isInError: true,
        errorReason: `unknown postmarkMessageType: ${msg.postmarkMessageType}`,
      });
      return;
    }
    dlog('setting up email for %s', msg.emailTo);
    templatedMessages.push({
      From,
      To: msg.emailTo,
      TemplateAlias: msg.postmarkAlias,
      TemplateModel: msg.templateModel,
      MessageStream,
      TrackOpens: true,
      TrackLinks: 'None',
      Tag: msg.thatMessageType || '',
      Metadata: {
        msgQueueId: msg.id,
        messageQueuedOnLogId: msg.messageQueuedOnLogId || '',
      },
    });
    sentMessageIds.push(msg.id);
  });

  const output = {
    postmarkResponse: [],
    sentMessageIds,
    inErrorMessages,
  };

  if (templatedMessages.length > 0) {
    output.postmarkResponse = await postmark.sendEmailBatchWithTemplates(
      templatedMessages,
    );
  }

  return output;
};
