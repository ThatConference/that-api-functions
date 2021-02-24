import debug from 'debug';

const dlog = debug('that:api:garage:datasources:firebase:order');

const collectionName = 'orders';
const collectionAllocationName = 'orderAllocations';

const order = dbInstance => {
  dlog('instance created');

  const orderCollection = dbInstance.collection(collectionName);
  const allocationCollection = dbInstance.collection(collectionAllocationName);

  function findByStripeEvent(stripeEventId) {
    dlog(`findByStripeEvent called for ${stripeEventId}`);
    return orderCollection
      .where('stripeEventId', '==', stripeEventId)
      .get()
      .then(docSnapshot => {
        let result = null;
        if (docSnapshot.size > 0) result = docSnapshot.docs[0].id;

        return result;
      });
  }

  function batchWriteOrderAndAllocations({ newOrder, allocations }) {
    dlog(`batchWriteOrderAndAllocations`);
    const orderDocRef = orderCollection.doc(); // creates random id
    dlog('new order id is %s', orderDocRef.id);
    const orderAllocations = allocations.map(a => ({
      ...a,
      order: orderDocRef.id,
    }));

    dlog('newOrder: %o', newOrder);
    dlog('order allocations: %o', orderAllocations);

    const writeBatch = dbInstance.batch();
    writeBatch.create(orderDocRef, newOrder);
    orderAllocations.forEach(oa =>
      writeBatch.create(allocationCollection.doc(), oa),
    );

    return writeBatch.commit();
  }

  function transactionWriteOrderAndAllocations({ newOrder, allocations }) {
    dlog('transactionWriteOrderAndAllocations called');
    return dbInstance.runTransaction(transaction => {
      const query = orderCollection.where(
        'stripeEventId',
        '==',
        newOrder.stripeEventId,
      );
      return transaction.get(query).then(docSnap => {
        let orderAllocations;
        if (docSnap.size < 1) {
          const orderDocRef = orderCollection.doc();
          dlog('new order id is %s', orderDocRef.id);
          orderAllocations = allocations.map(a => ({
            ...a,
            order: orderDocRef.id,
          }));
          transaction.create(orderDocRef, newOrder);
          orderAllocations.forEach(oa =>
            transaction.create(allocationCollection.doc(), oa),
          );
        }

        return { order: newOrder, orderAllocations };
      });
    });
  }

  return {
    findByStripeEvent,
    batchWriteOrderAndAllocations,
    transactionWriteOrderAndAllocations,
  };
};

export default order;
