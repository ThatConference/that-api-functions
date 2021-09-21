import 'dotenv/config';

import debug from 'debug';
import * as Sentry from '@sentry/node';
import { Firestore } from '@google-cloud/firestore';

let version;
(async () => {
  let p;
  try {
    // eslint-disable-next-line import/no-unresolved
    p = await import('./package.json');
  } catch {
    p = await import('../package.json');
  }
  version = p.version;
})();

const firestore = new Firestore();
const dlog = debug('that:api:functions:voting-on-create');
dlog('started');

const defaultVersion = `voting-on-create@${version}`;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'voting-on-create');
});

// eslint-disable-next-line import/prefer-default-export
export const handler = (event, context) => {
  /*
    ( vote created - not updated )
    update the session counts 
      voteTrue: ++
      voteFalse: False ++
      hasFeedback: ( if true leave it )
    
      update the event/votes/user
        * add the user to the collection as doc
          * numberVoted: ++ ( only on create and not update )
  */

  const {
    params: { vote: voteId },
  } = context;

  dlog(`Function triggered by change to: ${voteId}`);

  const { eventId, memberId, sessionId, vote } = event.value.fields;

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
              voteTrue: cVoteTrue + 1,
              voteFalse: cVoteFalse,
            }
          : {
              voteTrue: cVoteTrue,
              voteFalse: cVoteFalse + 1,
            };

        const newTotal = userVote.voteTrue + userVote.voteFalse;

        transaction.update(sessionRef, {
          ...userVote,
          votedTotal: newTotal,
        });
      }),

      // update event voting details
      transaction.get(eventVoteRef).then(doc => {
        /*
          add this users vote to the events.votes collection
          update their total vote count
          update their votes ( t/f )

          first time doc wouldn't exist
        */
        let usersVotes = {
          votedTrue: 0,
          votedFalse: 0,
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
              votedTrue: usersVotes.votedTrue + 1,
              votedFalse: usersVotes.votedFalse,
            }
          : {
              votedTrue: usersVotes.votedTrue,
              votedFalse: usersVotes.votedFalse + 1,
            };

        const newTotal = newVote.votedTrue + newVote.votedFalse;

        transaction.set(
          eventVoteRef,
          {
            ...newVote,
            votedTotal: newTotal,
          },
          {
            merge: true,
          },
        );
      }),
    ]).catch(e => Sentry.captureException(e));
  });
};

/*
https://cloud.google.com/functions/docs/calling/cloud-firestore
Starting the firestore emulator -> gcloud beta emulators firestore start

function deploy cmd

  gcloud functions deploy voting-on-create
    --runtime nodejs10                    
    --trigger-event providers/cloud.firestore/eventTypes/document.create
    --trigger-resource 'projects/all-that/databases/(default)/documents/votes/{vote}'
*/

// gcloud functions deploy voting-on-create --runtime nodejs10 --trigger-event providers/cloud.firestore/eventTypes/document.create --trigger-resource projects/qa-that/databases/(default)/documents/votes/{vote} --entry-point handler
