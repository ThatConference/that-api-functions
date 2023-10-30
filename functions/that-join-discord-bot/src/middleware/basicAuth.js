/* eslint-disable no-console */
import debug from 'debug';
import envConfig from '../envConfig';

const dlog = debug('that:api:functions:join-bot:basic-auth');

export function basicAuth(req, res, next) {
  dlog('basicAuth called');
  const authcreds = envConfig.that.authCreds;
  const credslist = authcreds.split(',');

  let b64Creds = '';
  let isAuthorized = false;
  if (req.headers.authorization) {
    dlog('authorization header');
    let type;
    [type, b64Creds] = req.headers.authorization.split(' ');
    if (type !== 'Basic') {
      return res.status(401).json({ message: 'auth header malformed' });
    }
  } else if (req.query.Basic) {
    dlog('query string');
    b64Creds = req.query.Basic;
  }

  const creds = Buffer.from(b64Creds, 'base64').toString('utf-8');
  isAuthorized = credslist.includes(creds);
  console.log('isAuthorized', isAuthorized);

  if (!isAuthorized) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
}
