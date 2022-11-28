import 'dotenv/config';
import express from 'express';
import debug from 'debug';
import responseTime from 'response-time';

const dlog = debug('that:api:functions:[CHANGE-ME]');
const api = express();

function postSession(req, res) {
  /*
   *
   */
  if (req.method === 'POST') {
    dlog('dump: %o', req.body);
    res.end();
  } else {
    dlog(`Non POST request %s`, req.method);
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`Unsupported request method`);
    res.end();
  }
}

function failure(err, req, res, next) {
  dlog('middleware catcall error %O', err);
  res.status(500).send(err);
}

export const handler = api
  .use(responseTime())
  .use('/newsession', postSession)

  .use(failure);
