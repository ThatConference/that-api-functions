// validates metadata from checkout session object
import * as yup from 'yup';

const csMetadataSchema = yup.object().shape({
  data: yup.object({
    object: yup.object({
      metadata: yup.object({
        memberId: yup.string().required().min(5),
        eventId: yup.string().required().min(5),
        productIds: yup.string().required().min(5),
        checkoutLineItems: yup.string().required().min(70),
      }),
    }),
  }),
});

export default checkoutMetadata =>
  csMetadataSchema
    .validate(checkoutMetadata)
    .then(() => true)
    .catch(err => {
      throw err;
    });
