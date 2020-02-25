exports.auth = (req, res, next) => {
  const authcreds = process.env.AUTH_CREDS_LIST || '';
  const credslist = authcreds.split(',');
  console.log(`doing auth stuff, req: ${req.method} ${req.url}`);
  // console.log(`headers`, req.headers);
  // console.log('qs', req.query);

  let b64Creds = '';
  let isAuthorized = false;
  if (req.headers.authorization) {
    if (req.headers.authorization.split(' ')[0] !== 'Basic') {
      res.writeHead(400, { 'Content-Type': 'text:plain' });
      res.write('auth header malformed');
      res.end();
      return;
    }
    // eslint-disable-next-line prefer-destructuring
    b64Creds = req.headers.authorization.split(' ')[1];
  } else if (req.query.Basic) {
    b64Creds = req.query.Basic;
  }

  const creds = Buffer.from(b64Creds, 'base64').toString('utf-8');
  isAuthorized = credslist.includes(creds);

  if (!isAuthorized) {
    res.writeHead(403, { 'Content-Type': 'text:plain' });
    res.write('Not authorized to access this resource');
    res.end();
    return;
  }

  console.log('isAuthorized', isAuthorized);
  next();
};
