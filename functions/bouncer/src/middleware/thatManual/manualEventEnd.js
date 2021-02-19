export default function manualEventEnd(req, res) {
  const { whRes } = req;
  whRes.stages.push('manualEventEnd');

  res.status(whRes.status || 418).json(whRes);
}
