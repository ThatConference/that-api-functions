// validate invoice for subscription event object
import * as yup from 'yup';

const epochTest = yup
  .number()
  .required()
  .max(9999999999)
  .strict({ isStrict: true });

const invoiceSchema = yup.object().shape({
  // stripe event checks
  type: yup.string().matches(/invoice\.paid/),
  livemode: yup.boolean().required().strict({ isStrict: true }),
  id: yup.string().required(),
  created: epochTest,
  object: yup.string().matches(/event/),
  // invoice section checks
  data: yup.object({
    object: yup.object({
      id: yup.string().required(),
      object: yup
        .string()
        .required()
        .matches(/invoice/),
      amount_due: yup.number().min(100),
      // subscription section checks
      subscription: yup.object({
        id: yup.string().required(),
        object: yup
          .string()
          .required()
          .matches(/subscription/),
        billing_cycle_anchor: epochTest,
        current_period_end: epochTest,
        cancel_at_period_end: yup
          .boolean()
          .required()
          .strict({ isStrict: true }),
        customer: yup.string().required(),
      }),
    }),
  }),
});

export default invoiceSubscription =>
  invoiceSchema
    .validate(invoiceSubscription)
    .then(() => true)
    .catch(err => {
      throw err;
    });
