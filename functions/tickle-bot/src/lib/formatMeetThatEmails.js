/* eslint-disable no-continue */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import envConfig from '../envConfig';
import constants from '../constants';

const dlog = debug('that:api:ticklebot:formatMeetThatEmails');

export default function formatMeetThatEmails({ newMatches }) {
  if (!Array.isArray(newMatches)) {
    throw new Error('newMatches parameter must be an array');
  }
  dlog('formatMeetThatEmails called with %d matches', newMatches.length);
  if (newMatches.length === 0)
    return { postmarkMessages: [], validationMessages: [] };

  // start by preparing postmark message collection
  const { postmark } = envConfig;
  const { emailFrom } = postmark;
  const meetThatTemplate = constants.POSTMARK.TEMPLATES.MEET_THAT;
  const messages = [];
  const validateMessages = [];

  for (let i = 0; i < newMatches.length; i += 1) {
    const { a, b } = newMatches[i];
    if (!a || !b) {
      Sentry.configureScope(scope => {
        scope.tag('function', 'formatMeetThatEmails');
        scope.setContext('match', { currentMatch: newMatches[i] });
        scope.setContext('a', { a });
        scope.setContext('b', { b });
        scope.setLevel('error');
        Sentry.captureException(
          new Error(
            'Invalid match data in newMatches collection. skipped this pair',
          ),
        );
      });
      continue;
    }
    const sharedProfileA = a?.allocatedTo?.profiles?.shared;
    const sharedProfileB = b?.allocatedTo?.profiles?.shared;
    const profileA = a?.profile;
    const profileB = b?.profile;
    if (!sharedProfileA?.email || !sharedProfileB?.email) {
      Sentry.configureScope(scope => {
        scope.tag('function', 'formatMeetThatEmails');
        scope.setContext('match', { currentMatch: newMatches[i] });
        scope.setContext('a', { a });
        scope.setContext('b', { b });
        scope.setLevel('error');
        Sentry.captureException(
          new Error('Email missing in match data. skipping this pair'),
        );
      });
      continue;
    }
    // checks done.
    dlog('setting up email for:\n%o\n%o', sharedProfileA, sharedProfileB);
    const pmMessage = {
      from: emailFrom,
      to: `${sharedProfileA.email}, ${sharedProfileB.email}`,
      tag: 'engagement_meet_that',
      trackOpens: true,
      templateAlias: meetThatTemplate,
      templateModel: {
        memberA: {
          ...sharedProfileA,
          canFeature: profileA?.canFeature ?? false,
          profileSlug: profileA.profileSlug,
          interests: profileA.interests?.join(', ') ?? '',
        },
        memberB: {
          ...sharedProfileB,
          canFeature: profileB?.canFeature ?? false,
          profileSlug: profileB.profileSlug,
          interests: profileB.interests?.join(', ') ?? '',
        },
      },
    };
    const chkMessage = {
      from: pmMessage.from,
      to: pmMessage.to,
      tag: pmMessage.tag,
      templateAlias: pmMessage.templateAlias,
    };
    messages.push(pmMessage);
    validateMessages.push(chkMessage);
  }

  dlog('✉️  %d emails prepared', messages.length);
  return {
    postmarkMessages: messages,
    validationMessages: validateMessages,
  };
}
