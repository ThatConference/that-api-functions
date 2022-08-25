import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:bouncer:manualOrderCheckClaimMw');
const memberStore = dataSources.cloudFirestore.member;

export default function manualOrderCheckClaim(req, res, next) {
  dlog('manualOrderCheckClaim called');

  const firestore = req.app.get('firestore');
  const { whRes, manualEvent } = req;
  whRes.stages.push('manualOrderCheckClaim');

  if (req.user.permissions.includes('admin')) {
    dlog('next(), user is admin member check not needed');
    return next();
  }

  if (manualEvent.type !== 'that.order.manual.created') {
    dlog('next(), not type that.order.manual.created');
    return next();
  }

  if (manualEvent?.order?.orderType !== 'CLAIMABLE') {
    dlog('next(), not orderType: CLAIMABLE');
    return next();
  }

  // order check
  const { order } = manualEvent;
  if (!order) {
    whRes.errorMsg = 'Invalid order for a claim';
    Sentry.setContext('order empty', { manualEvent });
  } else if (order?.lineItems?.length !== 1) {
    whRes.errorMsg = 'Claim order can only have 1 line item';
    Sentry.setContext('multiple line items', { manualEvent });
  } else if (order?.lineItems[0]?.quantity !== 1) {
    whRes.errorMsg = 'Claim order can only have a quantity of 1';
    Sentry.setContext('invalid quanity', { manualEvent });
  }
  if (whRes?.errorMsg?.length > 0) {
    return next({
      status: 401,
      whRes,
    });
  }

  // member check
  const memberId = manualEvent?.order?.member;

  return memberStore(firestore)
    .get(memberId)
    .then(_member => {
      if (!_member.slug || !_member.email || _member.isDeactivated === true) {
        whRes.errorMsg = 'Member invalid, cannot claim order';
        dlog(whRes.errorMsg);
        Sentry.setContext('invalid member claming product', { _member });
        return next({
          status: 401,
          whRes,
        });
      }
      dlog('member check passed');

      return next();
    });
}
