const Sentry = require('@sentry/node');
const debug = require('debug');
const ac = require('../send/activeCampaign');

const dlog = debug('that:api:webhooks:auth0SignUp');

module.exports = (req, res) => {
  dlog('trigger (receive) auth0SignUp');
  let payload = [];
  if (req.method === 'POST') {
    dlog('post');
    if (req.body) {
      usePayload(req.body, res);
    } else {
      req
        .on('error', err => {
          console.error(err);
        })
        .on('data', chunk => {
          dlog('data event');
          payload.push(chunk);
        })
        .on('end', () => {
          dlog('end event');
          payload = Buffer.concat(payload).toString();
          usePayload(payload, res);
        });
    }
  } else {
    console.error(`Non POST request, ${req.method}`);
    Sentry.captureMessage(`Non POST request, ${req.method}`, 'info');
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`Unsupported method.`);
    res.end();
  }
};

async function usePayload(payload, res) {
  dlog('use payload from auth0 %O', payload);
  const SIGNUP_TAG = 'NewSignUp';
  const REGFROM_FIELD_ID = '20';

  if (!payload.email) {
    dlog('stopping. missing email in payload');
    res.writeHead(400, { 'Content-type': 'text/plain' });
    res.write(`Bad Request. Did you forget your payload?`);
    res.end();
    return;
  }
  const presolved = await Promise.all([
    ac.findContactByEmail(payload.email),
    ac.searchForTag(SIGNUP_TAG),
  ]);
  const contactResult = presolved[0];
  const tagResult = presolved[1];
  dlog('contactResult %o', contactResult);
  dlog('tagResult %o', tagResult);

  if (!tagResult || (tagResult && !tagResult.id)) {
    dlog(`tag, ${SIGNUP_TAG}, not found at AC`);
    Sentry.captureMessage(`Failed to find tag at AC ${SIGNUP_TAG}`, 'error');
    res.writeHead(500, { 'Content-type': 'application/json' });
    res.write(`{"error":"Unable to locate tag: ${SIGNUP_TAG}"}`);
    res.end();
    return;
  }
  const tagId = tagResult.id;
  let contactId = '';
  // there may have been a retrieve error, or simply no contact w/ that email
  if (!contactResult || (contactResult && !contactResult.id)) {
    const contact = {
      contact: {
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        fieldValues: [
          {
            field: REGFROM_FIELD_ID,
            value: payload.context_clientName,
          },
        ],
      },
    };
    const newContact = await ac.createContact(contact);
    if (!newContact) {
      dlog(`failed creating contact in AC %o`, contact);
      Sentry.captureMessage('failed creating contact in AC', 'error');
      res.writeHead(500, { 'Content-type': 'application/json' });
      res.write('{"error":"Failed creating new contact in AC"}');
      res.end();
      return;
    }
    contactId = newContact.id;
  } else {
    contactId = contactResult.id;
  }

  const taggedContact = await ac.addTagToContact(contactId, tagId);

  if (!taggedContact) {
    dlog(`Tag didn't set, sending non-200`);
    Sentry.captureMessage('failed adding tag to contact in AC', 'error');
    res.writeHead(500, { 'Content-type': 'application/json' });
    res.write('{"error":"Failed adding tag to contact in AC"}');
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-type': 'application/json' });
  res.write(JSON.stringify({ contactId, tagId, email: payload.email }));
  res.end();
}

/* payload from Auth0
  const payload = {
  	user_id: user.user_id,
    email: user.email,
    given_name: user.given_name,
    family_name: user.family_name,
    full_name: user.name,
    username: user.username,
    created_at: user.created_at,
    context_clientId: context.clientID,
    context_clientName: context.clientName,
  };
*/
