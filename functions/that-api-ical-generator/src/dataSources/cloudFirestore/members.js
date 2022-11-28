import debug from 'debug';

const dlog = debug('that:function:that-api-ical-generator:cf:members');

function member(dbInstance) {
  dlog('member data source created');
  const collectionName = 'members';
  const memberCollection = dbInstance.collection(collectionName);

  function findMemberForIcs({ profileSlug, icsKey }) {
    dlog('finding member for ics %s, %s', profileSlug, icsKey);
    return memberCollection
      .where('profileSlug', '==', profileSlug)
      .where('icsKey', '==', icsKey)
      .select('firstName', 'lastName')
      .get()
      .then(querySnap => querySnap.docs.map(r => ({ id: r.id, ...r.data() })))
      .then(([r]) => r);
  }

  return { findMemberForIcs };
}

export default member;
