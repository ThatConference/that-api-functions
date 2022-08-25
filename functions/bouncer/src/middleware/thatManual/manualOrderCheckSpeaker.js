import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:bouncer:manualOrderCheckSpeakerMw');
const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

export default function manualOrderCheckSpeaker(req, res, next) {
  dlog('manualOrderCheckSpeaker called');

  const firestore = req.app.get('firestore');
  const { whRes, manualEvent } = req;
  whRes.stages.push('manualOrderCheckSpeaker');

  if (req.user.permissions.includes('admin')) {
    dlog('next(), user is admin speaker check not needed');
    return next();
  }

  if (manualEvent.type !== 'that.order.manual.created') {
    dlog('next(), not type that.order.manual.created');
    return next();
  }

  if (manualEvent?.order?.orderType !== 'SPEAKER') {
    dlog('next(), not orderType: SPEAKER');
    return next();
  }

  const { eventId } = manualEvent;
  const memberId = manualEvent?.order?.member;

  return eventSpeakerStore(firestore)
    .get({
      memberId,
      eventId,
    })
    .then(_eventSpeaker => {
      if (
        _eventSpeaker?.agreeToSpeak !== true ||
        _eventSpeaker?.rsvpAt === null ||
        _eventSpeaker?.status !== 'IN_PROGRESS'
      ) {
        whRes.errorMsg = 'Speaker has not agreed to speak, cannot create order';
        dlog(whRes.errorMsg);
        Sentry.setContext('Event Speaker', { _eventSpeaker });
        return next({
          status: 401,
          whRes,
        });
      }
      dlog('speaker check passed');

      return next();
    });
}
