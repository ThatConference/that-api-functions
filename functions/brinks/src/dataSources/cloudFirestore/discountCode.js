import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:brinks:datasources:firebase:discountCode');
const { entityDateForge } = utility.firestoreDateForge;
const forgeFields = ['createdAt', 'lastUpdatedAt'];
const dcDateForge = entityDateForge({ fields: forgeFields });

const collectionName = 'discountCodes';

const discountCode = dbInstance => {
  dlog('discountCode instance created');

  const dcCollection = dbInstance.collection(collectionName);

  function get(discountCodeId) {
    dlog('get called on %s', discountCodeId);
    return dcCollection
      .doc(discountCodeId)
      .get()
      .then(doc => {
        let result = null;
        if (doc.exists) {
          result = {
            id: doc.id,
            ...doc.data(),
          };
          result = dcDateForge(result);
        }
        return result;
      });
  }

  function createDcId(newDiscountCode) {
    if (!newDiscountCode.code)
      throw new Error('New Discount code missing code value');
    if (!newDiscountCode.memberId)
      throw new Error('New Discount code missing memberId');
    const newCodeId = `${newDiscountCode.memberId}_${newDiscountCode.code}`;
    dlog('new code id :: %s', newCodeId);
    return newCodeId;
  }

  function create(newDiscountCode) {
    dlog('create called :: %o', newDiscountCode);
    const newDc = newDiscountCode;
    newDc.createdAt = new Date();
    return dcCollection.doc(createDcId(newDc)).set(newDc);

    // return dcCollection.add(newDc).then(docRef => get(docRef.id));
  }

  function createMany(newDiscountCodes) {
    if (!Array.isArray(newDiscountCodes))
      throw new Error('createMany require an array of new codes to add');
    dlog('createMany called (%d)', newDiscountCodes.length);

    return Promise.all(newDiscountCodes.map(dc => create(dc)));
  }

  function batchCreate(newDiscountCodes) {
    if (!Array.isArray(newDiscountCodes))
      throw new Error('createBatch require an array of new codes to add');
    dlog('createBatch called (%d)', newDiscountCodes.length);
    const batch = dbInstance.batch();
    newDiscountCodes.forEach(dc => {
      const newDc = dc;
      newDc.createdAt = new Date();
      const docRef = dcCollection.doc(createDcId(newDc));
      batch.set(docRef, newDc);
    });

    return batch.commit();
  }

  return { get, create, createMany, batchCreate };
};

export default discountCode;
