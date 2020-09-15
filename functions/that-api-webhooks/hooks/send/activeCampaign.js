// Make api calls against ActiveCampaign
const Sentry = require('@sentry/node');
const axios = require('axios').default;
const debug = require('debug');

const envConfig = require('../../envConfig');

const dlog = debug('that:api:webhooks:activeCampaign');

// Create / Update contact:
// 200 - exists and updated
// 201 - created
// result set is the same

let acBaseUrl = envConfig.activeCampaignApi;
if (acBaseUrl.endsWith('/'))
  acBaseUrl = acBaseUrl.substring(0, acBaseUrl.length - 1);
const axiosReqConfig = {
  headers: {
    'Api-Token': envConfig.activeCampaignKey,
  },
};

function findContactByEmail(email) {
  dlog('call findContactByEmail for %s', email);
  const url = `${acBaseUrl}/contacts`;
  const reqConfig = {
    url,
    method: 'get',
    ...axiosReqConfig,
    params: {
      email,
    },
  };

  return axios(reqConfig)
    .then(result => {
      if (result.status !== 200) {
        dlog('Non 200 result from query email %s', email);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext(
            'non 200 status from contact query',
            { email },
            result,
          );
          Sentry.captureMessage('non 200 status from contact query');
        });
        return undefined;
      }
      if (
        result.data &&
        result.data.contacts &&
        result.data.contacts.length > 1
      ) {
        dlog(
          'query for email, %s, returned %d matches, expect 1 or 0',
          email,
          result.data.contacts.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext(
            'query by email return > 1 contact',
            { email },
            result.data.contacts,
          );
          Sentry.captureMessage('query by email returned > 1 contact');
        });
        return undefined;
      }
      dlog(`returning ${result.data.contacts[0]}`);
      return result.data.contacts[0];
    })
    .catch(err => {
      dlog('exception looking for contact: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function createContact(contact) {
  // https://developers.activecampaign.com/reference#create-a-contact-new
  /* minimum required for payload
    {
      contact: {
        email: email@email.com,
      }
    }
  */
  dlog('call createContact for %o', contact);
  const url = `${acBaseUrl}/contacts`;
  const reqConfig = {
    url,
    method: 'post',
    ...axiosReqConfig,
    data: contact,
  };
  return axios(reqConfig)
    .then(r => {
      if (![200, 201].includes(r.status)) {
        dlog('exception creating contact');
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('exception creating contact', contact, r);
          Sentry.captureMessage('exception creating contact');
        });
        return undefined;
      }

      return r.data.contact;
    })
    .catch(err => {
      dlog('exception creating contact: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function syncContact(contact) {
  // Sync contact will update or create new contact based on AC's
  // contact key, email address
  dlog('call syncContact for %o', contact);
  const url = `${acBaseUrl}/contact/sync`;
  const reqConfig = {
    url,
    method: 'post',
    ...axiosReqConfig,
    data: contact,
  };
  return axios(reqConfig)
    .then(r => {
      if (![200, 201].includes(r.status)) {
        dlog('exception syncing contact');
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('exception syncing contact', contact, r);
          Sentry.captureMessage('exception syncing contact');
        });
        return undefined;
      }

      return r.data.contact;
    })
    .catch(err => {
      dlog('exception syncing contact: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function searchForTag(tagName) {
  dlog('search for tag %s', tagName);
  const url = `${acBaseUrl}/tags`;
  const reqConfig = {
    url,
    method: 'get',
    ...axiosReqConfig,
    params: {
      search: tagName,
    },
  };
  return axios(reqConfig)
    .then(r => {
      if (r.status !== 200) {
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('non-200 status searching for tag', { tagName }, r);
          Sentry.captureMessage('non-200 status searching for tag');
        });
        return undefined;
      }
      if (r.data && r.data.tags && r.data.tags.length > 1) {
        dlog(
          'query for tag, %s, returned %d matches, expect 1 or 0',
          tagName,
          r.data.tags.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext(
            'Tag search return > 1 contact',
            { tagName },
            r.data.tags,
          );
          Sentry.captureMessage('query by email returned > 1 contact');
        });
        return undefined;
      }
      return r.data.tags[0];
    })
    .catch(err => {
      dlog('exception searching for tag: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function addTagToContact(acId, tagId) {
  dlog('call addTagToContact for id %s adding tag %s', acId, tagId);
  const url = `${acBaseUrl}/contactTags`;
  const reqConfig = {
    url,
    method: 'post',
    ...axiosReqConfig,
    data: {
      contactTag: {
        contact: acId,
        tag: tagId,
      },
    },
  };
  return axios(reqConfig)
    .then(r => {
      if (![200, 201].includes(r.status)) {
        dlog('issue adding tag to contact');
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext(
            'Issue adding tag to contact',
            { acId },
            { tagId },
            r,
          );
          Sentry.captureMessage('issue adding tag to contact');
        });
        return undefined;
      }
      dlog('returning %o', r.data);
      return r.data;
    })
    .catch(err => {
      dlog('Exception adding tag: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

module.exports = {
  findContactByEmail,
  createContact,
  syncContact,
  searchForTag,
  addTagToContact,
};
