const Sentry = require('@sentry/node');
const axios = require('axios');
const debug = require('debug');
const envConfig = require('../../envConfig');

const dlog = debug('that:api:webhooks:hubspot');

let hsBaseUrl = envConfig.hubSpot.api;
if (hsBaseUrl.endsWith('/')) {
  hsBaseUrl = hsBaseUrl.substring(0, hsBaseUrl.length - 1);
}

const sharedConfig = {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${envConfig.hubSpot.token}`,
  },
  validateStatus: status => status < 500,
};

Sentry.setTag('app', 'send-hubspot');

function findContactByEmail(email) {
  dlog('findContactByEmail %s', email);
  const url = `${hsBaseUrl}/contacts/v1/contact/email/${email}/profile`;
  dlog('url: %s', url);
  const payload = {
    url,
    method: 'get',
    ...sharedConfig,
    params: {
      propertyMode: 'value_only',
    },
  };

  return axios(payload).then(response => {
    let result = null;
    const { status, data } = response;
    if (status === 404) {
      result = {};
    } else if (status < 200 || status > 299) {
      console.error('bad shit happened', status);
      const msg = `unexpected result from hubspot api request, status: ${status}`;
      const err = new Error(msg);
      Sentry.withScope(scope => {
        scope.setTags({
          responseStatus: status,
          responseTexts: response.responseText,
          url,
          email,
        });
        scope.setContext('response', response);
        scope.setContext('data', data);
        Sentry.captureException(err);
      });
      throw err;
    } else {
      result = data ?? null;
    }

    return result;
  });
}

function createOrUpdateContact({
  email,
  firstName = '',
  lastName = '',
  memberId = '',
}) {
  dlog('createOrUpdateContact called %s', email);
  const url = `${hsBaseUrl}/contacts/v1/contact/createOrUpdate/email/${email}`;
  dlog('url: %s', url);
  const payload = {
    url,
    method: 'post',
    ...sharedConfig,
    data: {
      properties: [
        {
          property: 'firstname',
          value: firstName,
        },
        {
          property: 'lastname',
          value: lastName,
        },
        {
          property: 'THATMemberId',
          value: memberId,
        },
        {
          property: 'THATProfileComplete',
          value: false,
        },
        {
          property: 'SetAsMarketingContact',
          value: true,
        },
      ],
    },
  };

  return axios(payload).then(response => {
    let result = null;
    const { status, data } = response;
    if (status === 409) {
      result = {};
      console.log(
        'email conflict. Attemp to change email and a contact already has that email address.',
      );
      dlog('error: %O', data);
    } else if (status < 200 || status > 299) {
      console.error('bad shit happened', status);
      const msg = `unexpected result from hubspot api request, status: ${status}`;
      const err = new Error(msg);
      Sentry.withScope(scope => {
        scope.setTags({
          responseStatus: status,
          responseTexts: response.responseText,
          url,
          email,
        });
        scope.setContext('response', response);
        scope.setContext('data', data);
        Sentry.captureException(err);
      });
    } else {
      result = data ?? null;
    }
    /* returns a result like: 
    { vid: 15201, isNew: true }
    */
    return result;
  });
}

function getSubscriptionDefinitions() {
  dlog('getSubscriptionDefinitions called');
  const url = `${hsBaseUrl}/communication-preferences/v3/definitions`;
  const payload = {
    url,
    method: 'get',
    ...sharedConfig,
  };
  return axios(payload).then(response => {
    if (response.status < 200 || response.status > 299) {
      throw new Error(
        `Non-200 status returned getting subscription definitions. ${response.status}`,
      );
    }
    return response?.data ?? null;
  });
}

function getContactSubscriptionStatus() {
  throw new Error('not implemented');
}

function subscribeContact({ email, subscriptionId }) {
  dlog('subscribing %s to subscription %s', email, subscriptionId);
  const url = `${hsBaseUrl}/communication-preferences/v3/subscribe`;
  const payload = {
    url,
    method: 'post',
    ...sharedConfig,
    data: {
      emailAddress: email,
      subscriptionId,
      // legalBasis: 'LEGITIMATE_INTEREST_CLIENT',
      // legalBasisExplanation: 'Created platform login without profile',
    },
  };
  return axios(payload).then(response => {
    let result = null;
    const { status, data } = response;
    if (status === 400) {
      dlog('error: %O', data);
      Sentry.withScope(scope => {
        scope.setLevel('warning');
        scope.setTags({
          email,
          subscriptionId,
        });
        scope.setContext('returned info', data);
        Sentry.captureMessage(
          `Error subscribing ${email} to ${subscriptionId}`,
        );
        console.log('error subscribing contact', JSON.stringify(data));
      });
    } else if (status < 200 || status > 299) {
      throw new Error(
        `non-200, ${status}. result subscribing ${email} to ${subscriptionId}`,
      );
    } else {
      result = data ?? null;
    }
    return result;
  });
}

function unsubscribeContact({ email, subscriptionId }) {
  dlog('unsubscribe %s to subscription %s', email, subscriptionId);
  const url = `${hsBaseUrl}/communication-preferences/v3/unsubscribe`;
  const payload = {
    url,
    method: 'post',
    ...sharedConfig,
    data: {
      emailAddress: email,
      subscriptionId,
    },
  };
  return axios(payload).then(response => {
    let result = null;
    const { status } = response;
    if (status === 400) {
      dlog('error: %O', response.data);
      Sentry.withScope(scope => {
        scope.setLevel('warning');
        scope.setTags({
          email,
          subscriptionId,
        });
        scope.setContext('returned info', response.data);
        Sentry.captureMessage(
          `Error unsubscribing ${email} from ${subscriptionId}`,
        );
      });
    } else if (status < 200 || status > 299) {
      throw new Error(
        `non-200, ${status}. result unsubscribing ${email} from ${subscriptionId}`,
      );
    } else {
      result = response?.data ?? null;
    }
    return result;
  });
}

module.exports = {
  findContactByEmail,
  createOrUpdateContact,
  getSubscriptionDefinitions,
  getContactSubscriptionStatus,
  subscribeContact,
  unsubscribeContact,
};
