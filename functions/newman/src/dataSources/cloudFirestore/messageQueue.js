import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug(
  'that:function:newman:dataSources:cloudFirestore:messageQueue',
);
const { entityDateForge } = utility.firestoreDateForge;
const forgeFields = ['createdAt', 'sendOnDate', 'queuedAt'];
const queueDateForge = entityDateForge({ fields: forgeFields });

const collectionname = 'messageQueue';
const logCollectionname = 'messageQueueReaderLog';

const messageQueue = dbInstance => {
  dlog('messageQueue instance created');

  const msgQueueCollection = dbInstance.collection(collectionname);
  const msgLogCollection = dbInstance.collection(logCollectionname);

  function readQueue(batchSize = 100) {
    dlog('readingQueue of size %d', batchSize);
    return msgQueueCollection
      .where('isQueuedToSend', '==', false)
      .where('isSent', '==', false)
      .where('isInError', '==', false)
      .where('sendOnDate', '<=', new Date())
      .limit(batchSize)
      .get()
      .then(querySnap =>
        querySnap.docs.map(d => {
          const r = {
            id: d.id,
            ...d.data(),
          };

          return queueDateForge(r);
        }),
      );
  }

  function updateOne(queueId, msgUpdate) {
    dlog('updateOne called');
    return msgQueueCollection.doc(queueId, msgUpdate);
  }

  function updateMany(queueIds, msgUpdate) {
    if (!Array.isArray(queueIds))
      throw new Error('updateMany requires an array of queue ids');
    if (queueIds.length > 500)
      throw new Error('updateMany array too large, > 500');
    dlog('updateMany called (%d)', queueIds.length);

    const batch = dbInstance.batch();
    queueIds.forEach(q => {
      const docRef = msgQueueCollection.doc(q);
      batch.update(docRef, msgUpdate);
    });

    return batch.commit();
  }

  function updateBatch(batchRecords) {
    if (!Array.isArray(batchRecords))
      throw new Error('updateBatch requies an array of records to update');
    dlog('updateBatch called with %d records', batchRecords.length);

    const batch = dbInstance.batch();
    batchRecords.forEach(b => {
      const docRef = msgQueueCollection.doc(b.id);
      const record = { ...b };
      delete record.id;
      batch.update(docRef, record);
    });

    return batch.commit();
  }

  function newLogEntry(logData) {
    dlog('newLogEntry called');
    return msgLogCollection.add(logData).then(docRef => docRef.id);
  }

  return { readQueue, updateOne, updateMany, updateBatch, newLogEntry };
};

export default messageQueue;
