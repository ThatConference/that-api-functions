import * as yup from 'yup';

const epochTest = yup
  .number()
  .required()
  .max(9999999999)
  .strict({ isStrict: true });

const custSubUpdatedSchema = yup.object().shape({
  type: yup.string().matches(/customer\.subscription\.updated/),
  livemode: yup.boolean().required(),
  id: yup.string().required(),
  created: epochTest,
  object: yup.string().matches(/event/),
  // subscription section checks
  data: yup.object({
    object: yup.object({
      id: yup.string().required(),
      object: yup
        .string()
        .required()
        .matches(/subscription/),
      current_period_end: epochTest,
      current_period_start: epochTest,
      customer: yup.string().required(),
      cancel_at_period_end: yup.boolean().required().strict({ isStrict: true }),
      status: yup.string().required(),
      start_date: epochTest,
    }),
  }),
});

export default custSubUpdated =>
  custSubUpdatedSchema
    .validate(custSubUpdated)
    .then(() => true)
    .catch(err => {
      throw err;
    });
