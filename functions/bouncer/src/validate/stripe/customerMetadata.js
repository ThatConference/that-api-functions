// validates metadata from customer object
import * as yup from 'yup';

const csMetadataSchema = yup.object().shape({
  data: yup.object({
    object: yup.object({
      metadata: yup.object({
        memberId: yup.string().required().min(5),
        slug: yup.string().required(),
        firstName: yup.string().required(),
        lastName: yup.string().required(),
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
