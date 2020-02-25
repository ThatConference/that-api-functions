const fs = require('fs');
const chai = require('chai');

const { expect } = chai;
const { parseDocuSignXml } = require('../parsers/docusign');

describe(`parsers.docusign.parseDocuSignXml`, function() {
  describe(`Parse expected envelope and form fields from xml`, function() {
    let xmlpayload;
    let parsedpayload;
    let keys;
    before(async function() {
      xmlpayload = fs.readFileSync('./test/fixtures/envelopeCompletePayload.xml', 'utf-8');
      parsedpayload = await parseDocuSignXml(xmlpayload);
      keys = Object.keys(parsedpayload);
    });

    it(`Expect parsed payload to have a value`, function() {
      expect(parsedpayload).not.be.undefined;
    });

    it(`Expect to have no 'extra fields'`, function() {
      expect(parsedpayload.extraFormFields.length).to.equal(0);
    });

    // A describe() will not wait for the promise to finish in the begin() as it() does
    // or it looks like a describe() runs with the before, even if nested.
    it(`All properties of parsed object have values`, function() {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        // it(`Property ${k} is not undefined`, function() {
        expect(parsedpayload[k], `Property missing => '${k}'`).not.be.undefined;
        // })
      }
    });
  });
});
