export default function stripeEventEnd(req, res) {
  const { whRes } = req;

  res.status(whRes.status || 400).json(whRes);
}
