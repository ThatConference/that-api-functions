// validates checkout session completed event object
import * as yup from 'yup';

const checkoutSchema = yup.object().shape({
  type: yup.string().matches(/checkout\.session\.completed/),
  id: yup.string().required(),
  created: yup
    .string()
    .transform(epoch => epoch.toString())
    .required()
    .max(10),
  object: yup.string().matches(/event/),
  data: yup.object({
    object: yup.object({
      id: yup.string().required(),
      object: yup.string().matches(/checkout\.session/),
      amount_total: yup.number().min(100),
      mode: yup.string().required(),
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
