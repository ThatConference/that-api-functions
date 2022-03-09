import debug from 'debug';
import { createBatchesFromCollection } from '../../lib/createBatchesFromCollection';
import envConfig from '../../envConfig';

const dlog = debug('that:api:ticklebot:dataSource:order');
// const ordersCollectionName = 'orders';
const orderAllocationsCollectionName = 'orderAllocations';

const order = dbInstance => {
  dlog('order instance created');
  // const orderCollection = dbInstance.collection(ordersCollectionName);
  const oACollection = dbInstance.collection(orderAllocationsCollectionName);

  function updateOrderAllocationBatch(orderAllocationIds) {
    if (!Array.isArray(orderAllocationIds))
      throw new Error(`updateOrderAllocation's parameter must be an array`);
    const now = new Date();
    const updateOa = {
      notificationSentAt: now,
      lastUpdatedAt: now,
      lastUpdatedBy: envConfig.that.systemUpdatedBy,
    };
    const batchMax = 490;

    const batches = createBatchesFromCollection({
      collection: orderAllocationIds,
      maxBatchSize: batchMax,
    });

    const batchFuncs = [];
    let currentBatch = 0;

    while (currentBatch < batches.length) {
      dlog('working on batchWrite %d of %d', currentBatch + 1, batches.length);
      const batchWrite = dbInstance.batch();
      const batch = batches[currentBatch];
      for (let i = 0; i < batch.length; i += 1) {
        const docRef = oACollection.doc(batch[i]);
        batchWrite.update(docRef, updateOa);
      }
      batchFuncs.push(batchWrite.commit());
      currentBatch += 1;
    }

    // const batchCount = Math.ceil(orderAllocationIds.length / batchMax);
    // let icount = 0;
    // while (icount < batchCount) {
    //   const batchWrite = dbInstance.batch();
    //   let i = icount * batchMax;
    //   const condition = Math.min(
    //     (icount + 1) * batchMax,
    //     orderAllocationIds.length,
    //   );
    //   for (i; i < condition; i += 1) {
    //     const docRef = oACollection.doc(orderAllocationIds[i]);
    //     batchWrite.update(docRef, updateOa);
    //   }

    //   batchFuncs.push(batchWrite.commit());
    //   icount += 1;
    // }

    return Promise.all(batchFuncs).then(() => true);
  }

  return { updateOrderAllocationBatch };
};

export default order;
