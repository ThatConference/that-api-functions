import debug from 'debug';
import * as Sentry from '@sentry/node';
import { manualOrderEventValidate } from '../../validate/that';

const dlog = debug('that:api:bouncer:manualOrderEventCreatedMw');

export default function manualOrderEventCreated(req, res, next) {
  dlog('manual event order created called');
  const { whRes, manualEvent } = req;
  whRes.stages.push('manualOrderEventCreated');

  if (manualEvent.type !== 'that.order.manual.created') {
    dlog('next(), not type that.order.manual.created');
    return next();
  }

  // yup validation
  return manualOrderEventValidate(manualEvent)
    .then(() => {
      if (manualEvent.order.createdBy !== req.user.sub) {
        Sentry.setTags({
          validation: 'userMissmatch',
          createdBy: manualEvent.order.createdBy,
        });
        throw new Error('User to createdBy validation mismatch');
      }
      whRes.isValid = true;
      return next();
    })
    .catch(err => next(err));
}
