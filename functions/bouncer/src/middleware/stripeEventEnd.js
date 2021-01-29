export default function stripeEventEnd(req, res) {
  const { whRes } = req;
  whRes.stages.push('stripeEventEnd');

  res.status(whRes.status || 400).json(whRes);
}
