import 'dotenv/config';

import debug from 'debug';
import * as Sentry from '@sentry/node';
import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();
const dlog = debug('that:api:functions:voting-on-delete');
dlog('started');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  // release: process.env.SENTRY_VERSION,
  debug: process.env.NODE_ENV === 'development',
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'voting-on-delete');
});

export const handler = (event, context) => {
  dlog('update event', JSON.stringify(event));
  dlog('update context', JSON.stringify(context));

  const {
    params: { vote: voteId },
  } = context;

  dlog(`Function triggered by change to: ${voteId}`);

  const { eventId, memberId, sessionId, vote } = event.oldValue.fields;

  Sentry.configureScope(scope => {
    scope.setUser({
      id: memberId,
    });

    scope.setExtra('context', context);
    scope.setExtra('event', event);

    scope.setTag('sessionId', sessionId);
    scope.setTag('eventId', eventId);
  });

  const eventIdVal = eventId.stringValue;
  const memberIdVal = memberId.stringValue;
  const sessionIdVal = sessionId.stringValue;
  const voteVal = vote.booleanValue;

  return firestore.runTransaction(transaction => {
    const sessionRef = firestore.doc(`sessions/${sessionIdVal}`);
    const eventVoteRef = firestore.doc(
      `events/${eventIdVal}/votes/${memberIdVal}`,
    );

    return Promise.all([
      // update session voting detail
      transaction.get(sessionRef).then(doc => {
        const currentDoc = doc.data();

        let cVoteTrue = currentDoc.voteTrue;
        let cVoteFalse = currentDoc.voteFalse;

        cVoteTrue = cVoteTrue || 0;
        cVoteFalse = cVoteFalse || 0;

        const userVote = voteVal
          ? {
              voteTrue: cVoteTrue <= 0 ? 0 : cVoteTrue - 1,
              voteFalse: cVoteFalse,
            }
          : {
              voteTrue: cVoteTrue,
              voteFalse: cVoteFalse <= 0 ? 0 : cVoteFalse - 1,
            };

        const votedTotal =
          currentDoc.votesTotal <= 0 ? 0 : currentDoc.votesTotal - 1;

        transaction.update(sessionRef, {
          votedTotal,
          ...userVote,
        });
      }),

      // update event voting details
      transaction.get(eventVoteRef).then(doc => {
        let usersVotes = {
          votedTrue: 0,
          votedFalse: 0,
          votedTotal: 0,
        };

        if (doc.exists) {
          const docData = doc.data();

          usersVotes = {
            ...usersVotes,
            ...docData,
          };
        }

        const newVote = voteVal
          ? {
              votedTrue:
                usersVotes.votedTrue <= 0 ? 0 : usersVotes.votedTrue - 1,
              votedFalse: usersVotes.votedFalse,
            }
          : {
              votedTrue: usersVotes.votedTrue,
              votedFalse:
                usersVotes.votedFalse <= 0 ? 0 : usersVotes.votedFalse - 1,
            };

        const votedTotal =
          usersVotes.votedTotal <= 0 ? 0 : usersVotes.votedTotal - 1;

        transaction.update(eventVoteRef, {
          votedTotal,
          ...newVote,
        });
      }),
    ]).catch(e => Sentry.captureException(e));
  });
};

/*
https://cloud.google.com/functions/docs/calling/cloud-firestore
Starting the firestore emulator -> gcloud beta emulators firestore start

function deploy cmd

  gcloud functions deploy voting-on-update
    --runtime nodejs10                    
    --trigger-event providers/cloud.firestore/eventTypes/document.delete
    --trigger-resource 'projects/all-that/databases/(default)/documents/votes/{vote}'
*/

// gcloud functions deploy voting-on-delete --runtime nodejs10 --trigger-event providers/cloud.firestore/eventTypes/document.delete --trigger-resource projects/qa-that/databases/(default)/documents/votes/{vote} --entry-point handler
