import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import envConfig from '../../envConfig';

const dlog = debug('that:api:brinks:updateSubFromStripeEvent');
const memberStore = dataSources.cloudFirestore.member;

export default function updateSubFromStripeEvent({
  stripeCustId,
  subscriptionId,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  firestore,
}) {
  dlog(
    'updateSubscriptionFromInvoicePaid called. subId: %s, custId: %s',
    subscriptionId,
    stripeCustId,
  );
  return memberStore(firestore)
    .findMemberByStripeCustId(stripeCustId)
    .then(members => {
      dlog('member count found: %d', members.length);
      if (members.length > 1) {
        const errMsg = `critical: multiple members returned from stripe customer id: ${stripeCustId}`;
        dlog('%s %d', errMsg, members.length);
        Sentry.setContext('duplicateStripeCustIds', {
          stripeCustId,
          memberIds: members.map(m => m.id).join(','),
          subscriptionId,
        });
        throw new Error(errMsg);
      }

      const [member] = members;
      return member;
    })
    .then(member => {
      if (!member)
        return {
          result: false,
          reason: `no matching stripe customer id ${stripeCustId}`,
        };
      if (member.stripeSubscriptionId !== subscriptionId) {
        return {
          result: false,
          reason: `Subscription id does not match member record`,
        };
      }

      const profileUpdate = {
        stripeSubscriptionCancelAtExpiration:
          cancelAtPeriodEnd === 'true' || cancelAtPeriodEnd === true,
        membershipExpirationDate: new Date(currentPeriodEnd * 1000),
      };

      return memberStore(firestore)
        .update({
          memberId: member.id,
          profile: profileUpdate,
          updatedBy: envConfig.that.systemUpdatedBy,
        })
        .then(updMember => ({ result: true, member: updMember }));
    });
}
