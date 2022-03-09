import debug from 'debug';

const dlog = debug('that:api:ticklebot:createBatchesFromCollection');

export function createBatchesFromCollection({ collection, maxBatchSize }) {
  if (!Array.isArray(collection))
    throw new Error('collection paramter must be an array');
  if (!(maxBatchSize > 0))
    throw new Error('maxBatchSize parameter must be > 0');
  dlog(
    'creating batches from %d items with batch size of %d',
    collection.length,
    maxBatchSize,
  );

  const batchCount = Math.ceil(collection.length / maxBatchSize);
  let currentBatch = 0;
  const batches = [];
  while (currentBatch < batchCount) {
    dlog('working on batch %d of %d', currentBatch + 1, batchCount);
    const iLower = currentBatch * maxBatchSize;
    const iUpper = Math.min(
      (currentBatch + 1) * maxBatchSize,
      collection.length,
    );
    const batchOfCollection = collection.slice(iLower, iUpper);
    batches.push(batchOfCollection);
    currentBatch += 1;
  }

  return batches;
}
