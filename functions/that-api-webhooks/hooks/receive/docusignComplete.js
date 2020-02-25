// Catch completed docusign webhook
// const axios = require('axios');
const Sentry = require('@sentry/node');
const { parseDocuSignXml } = require('../../parsers/docusign');
const sendTallyfy = require('../send/tallyfy').send;

module.exports = (req, res) => {
  console.log('trigger docusignComplete');
  let payload = [];
  if (req.method === 'POST') {
    console.log('post');
    if (req.body) {
      usePayload(req.body, res);
    } else {
      req
        .on('error', err => {
          console.error(err);
        })
        .on('data', chunk => {
          console.log('data event');
          payload.push(chunk);
        })
        .on('end', () => {
          console.log('end event');
          payload = Buffer.concat(payload).toString();
          usePayload(payload, res);
        });
    }
  } else {
    console.error(`Non POST request, ${req.method}`);
    Sentry.captureMessage(`Non POST request, ${req.method}`, 'warning');
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`What was that? I didn't like that much.`);
    res.end();
  }
};

const usePayload = (payload, res) => {
  parseDocuSignXml(payload)
    .then(docusign => {
      if (!docusign) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const j = { result: 'Unknown Template', status: 'Unknown DocuSign template, skipping. See log for details' };
        res.write(JSON.stringify(j));
        res.end();
        return;
      }

      sendTallyfy(docusign)
        .then(result => {
          if (!result) {
            console.error(`undefined result from sendTallyfy in docusignComplete`);
            res.writeHead(500);
            res.end();
            return;
          }
          // successful
          res.writeHead(200, { 'Conent-Type': 'application/json' });
          res.write(JSON.stringify(result));
          res.end();
          console.log('docusignComplete done');
        })
        .catch(err => {
          console.error(`Exception in docusignComplete calling sendTallyfy:\n${err}`);
          Sentry.captureException(err);
          res.writeHead(500);
          res.end();
        });
    })
    .catch(err => {
      console.error(err);
      Sentry.captureException(err);
      res.writeHead(500);
      res.end();
    });
};
