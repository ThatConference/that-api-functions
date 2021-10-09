// validates checkout session completed event object
import * as yup from 'yup';

const epochTest = yup
  .number()
  .required()
  .max(9999999999)
  .strict({ isStrict: true });

const checkoutSchema = yup.object().shape({
  type: yup.string().matches(/checkout\.session\.completed/),
  livemode: yup.boolean().required().strict({ isStrict: true }),
  id: yup.string().required(),
  created: epochTest,
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
