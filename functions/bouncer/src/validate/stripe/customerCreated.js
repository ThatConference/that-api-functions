// validates customer created event object
import * as yup from 'yup';

const checkoutSchema = yup.object().shape({
  type: yup.string().matches(/customer\.created/),
  id: yup.string().required(),
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
