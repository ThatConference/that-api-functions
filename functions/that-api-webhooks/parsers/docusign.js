const Sentry = require('@sentry/node');
const xml2js = require('xml2js');
const docdata = require('../data/docusignFormFields.json');

const parseDocuSignXml = docusignXml =>
  xml2js
    .parseStringPromise(docusignXml, { explicitArray: false, mergeAttrs: true })
    .then(result => parseDocuSign(result))
    .catch(err => {
      console.error(`error in parseDocuSignXml while parsing with xml2js: ${err}`);
      Sentry.captureException(err);
    });

const parseDocuSign = docusignObj => {
  if (!docusignObj || !docusignObj.DocuSignEnvelopeInformation) {
    return undefined;
  }
  const envlStatus = docusignObj.DocuSignEnvelopeInformation.EnvelopeStatus;
  const rstatus = docusignObj.DocuSignEnvelopeInformation.EnvelopeStatus.RecipientStatuses.RecipientStatus;
  const du = {
    extraFormFields: [],
  }; // docusign object

  // Envelope values
  du.envelopeId = envlStatus.EnvelopeID;
  du.senderUserName = envlStatus.UserName;
  du.senderEmail = envlStatus.Email;
  du.templateName = envlStatus.DocumentStatuses.DocumentStatus.TemplateName;

  // Receipent values
  du.type = rstatus.Type;
  du.email = rstatus.Email;
  du.username = rstatus.UserName;
  du.sent = rstatus.Sent;
  du.delivered = rstatus.Delivered;
  du.signed = rstatus.Signed;
  du.status = rstatus.Status;

  // Get Form field names for template
  const fields = docdata.find(tpl => tpl.templateName.trim().toLowerCase() === du.templateName.trim().toLowerCase());
  if (!fields) {
    console.error(`Template, ${du.templateName}, not found in docusignFormFields.json data`);
    return undefined;
  }

  const formdata = rstatus.FormData.xfdf.fields.field;
  for (let i = 0; i < formdata.length; i++) {
    const f = formdata[i];
    switch (f.name) {
      // Partner Organization
      case fields.partnerOrganization:
        du.organization = f.value;
        break;
      // Partner Full Name
      case fields.partnerFullName:
        du.fullName = f.value;
        break;
      // Partner Email
      case fields.partnerEmail:
        du.email = f.value;
        break;
      // Partner website
      case fields.partnerWebsite:
        du.website = f.value;
        break;
      // Partner Mail Address
      case fields.partnerMailAddr:
        du.mailAddress = f.value;
        break;
      // Partner Phone Number
      case fields.partnerPhoneNumber:
        du.phoneNumber = f.value;
        break;
      // Partner Level
      case fields.partnerLevel:
        du.partnerLevel = f.value;
        break;
      // Other Opportunity Checkbox
      case fields.partnerOtherCheckbox:
        du.otherCheckbox = f.value;
        break;
      // Other Opportunity Text
      case fields.partnerOtherText:
        du.otherOpportunityText = f.value;
        break;
      case fields.partnerDateSigned:
        du.dateSigned = f.value;
        break;
      case fields.event:
        du.event = f.value;
        break;
      case fields.eventYear:
        du.eventYear = f.value;
        break;
      default:
        du.extraFormFields.push(f.value);
    }
  }

  return du;
};

module.exports = {
  parseDocuSignXml,
};
