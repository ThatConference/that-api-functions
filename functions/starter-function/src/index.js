import 'dotenv/config';
import connect from 'connect';
import debug from 'debug';
import responseTime from 'response-time';

const dlog = debug('that:api:functions:thatus-session-bot');
const api = connect();

function failure(err, req, res, next) {
  dlog('middleware catcall error %O', err);
  res.set('Content-type', 'application/json').status(500).json(err);
}

function postSession(req, res) {
  /*
   *
   */
  if (req.method === 'POST') {
    console.log('dump: ', req.body);
    res.end();
  } else {
    console.error(`Non POST request, ${req.method}`);
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`Unsupported request method`);
    res.end();
  }
}

export const handler = api
  .use(responseTime())
  .use('/newsession', postSession)

  .use(failure);
