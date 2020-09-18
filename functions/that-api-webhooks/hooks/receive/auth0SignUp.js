const Sentry = require('@sentry/node');
const debug = require('debug');
const ac = require('../send/activeCampaign');

const dlog = debug('that:api:webhooks:auth0SignUp');

module.exports = (req, res, next) => {
  dlog('trigger (receive) auth0SignUp');
  if (req.method === 'POST') {
    dlog('post');
    usePayload(req.body, res, next);
  } else {
    console.error(`Non POST request, ${req.method}`);
    Sentry.captureMessage(`Non POST request, ${req.method}`, 'info');
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`Unsupported method.`);
    res.end();
  }
};

async function usePayload(payload, res, next) {
  dlog('use payload from auth0 %O', payload);
  const SIGNUP_TAG = 'NewSignUp';
  const REGFROM_FIELD_ID = '20';
  const THATUS_SYSTEMS_MSG_LIST = 'THAT.us System Messages';
  // end state goal is contact is added to AC automation "User Sign-up No Profile"
  // see automation for trigger details

  if (!payload.email) {
    dlog('stopping. missing email in payload');
    res.writeHead(400, { 'Content-type': 'text/plain' });
    res.write(`Bad Request. Did you forget your payload?`);
    res.end();
    return;
  }
  let contactResult;
  let tagResult;
  let listResult;
  try {
    [contactResult, tagResult, listResult] = await Promise.all([
      ac.findContactByEmail(payload.email),
      ac.searchForTag(SIGNUP_TAG),
      ac.searchForList(THATUS_SYSTEMS_MSG_LIST),
    ]);
  } catch (e) {
    next(e);
  }
  dlog('contactResult %o', contactResult);
  dlog('tagResult %o', tagResult);

  if (!tagResult || (tagResult && !tagResult.id)) {
    dlog(`tag, ${SIGNUP_TAG}, not found at AC`);
    Sentry.captureMessage(`Failed to find tag at AC ${SIGNUP_TAG}`, 'error');
    next(new Error('Unable to locate tag', { tag: SIGNUP_TAG }));
  }
  const tagId = tagResult.id;
  if (!listResult || (listResult && !listResult.id)) {
    dlog(`list, ${THATUS_SYSTEMS_MSG_LIST}, not found at AC`);
    Sentry.captureMessage(
      `Failed to find list ${THATUS_SYSTEMS_MSG_LIST} at AC `,
      'error',
    );
    next(new Error('Unable to locate list', { list: THATUS_SYSTEMS_MSG_LIST }));
  }
  const listId = listResult.id;
  let contactId = '';
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
    let newContact;
    try {
      newContact = await ac.createContact(contact);
    } catch (e) {
      next(e);
    }
    if (!newContact) {
      dlog(`failed creating contact in AC %o`, contact);
      Sentry.captureMessage('failed creating contact in AC', 'error');
      next(new Error('Failed creating new contact in AC', { contact }));
    }
    contactId = newContact.id;
  } else {
    // user already in AC, update 'RegisteredFrom' field
    const contact = {
      contact: {
        email: payload.email,
        fieldValues: [
          {
            field: REGFROM_FIELD_ID,
            value: payload.context_clientName,
          },
        ],
      },
    };
    ac.syncContact(contact); // We don't care of this result here
    contactId = contactResult.id;
  }
  let taggedContact;
  try {
    // We want to ensure the tag is set before adding contact to list
    taggedContact = await ac.addTagToContact(contactId, tagId);
  } catch (e) {
    next(e);
  }
  if (!taggedContact) {
    dlog(`Tag didn't set, sending non-200`);
    Sentry.captureMessage('failed adding tag to contact in AC', 'error');
    next(new Error('falied adding tag to contact in ac'));
    return;
  }
  let listContact;
  try {
    listContact = await ac.setContactToList(contactId, listId);
  } catch (e) {
    next(e);
  }
  if (!listContact) {
    dlog(`Failure adding contact to list, sending non-200`);
    Sentry.captureMessage('failed adding contact to list in AC', 'error');
    next(new Error('failed adding contact to list in AC'));
    return;
  }

  res.json({ contactId, tagId, email: payload.email }).end();
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
