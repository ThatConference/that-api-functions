// validates checkout session completed event object
import * as yup from 'yup';

const checkoutSchema = yup.object().shape({
  type: yup.string().matches(/checkout\.session\.completed/),
  livemode: yup.boolean().required(),
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
      object: yup
        .string()
        .required()
        .matches(/checkout\.session/),
      payment_status: yup.string().required().matches(/paid/),
      amount_total: yup.number().min(100),
      mode: yup.string().required(),
      line_items: yup.object({
        object: yup.string().required().matches(/list/),
        data: yup.array().required().min(1).max(6),
      }),
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
