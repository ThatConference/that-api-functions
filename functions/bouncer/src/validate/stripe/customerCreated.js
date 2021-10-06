// validates customer created event object
import * as yup from 'yup';

const epochTest = yup
  .number()
  .required()
  .max(9999999999)
  .strict({ isStrict: true });

const checkoutSchema = yup.object().shape({
  type: yup.string().matches(/customer\.created/),
  id: yup.string().required(),
  created: epochTest,
  object: yup.string().matches(/event/),
  data: yup.object({
    object: yup.object({
      id: yup.string().required(),
      object: yup.string().matches(/customer/),
      email: yup.string().required(),
      name: yup.string().required(),
    }),
  }),
});

export default checkoutComplete =>
  checkoutSchema
    .validate(checkoutComplete)
    .then(() => true)
    .catch(err => {
      throw err;
    });
