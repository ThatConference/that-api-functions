const chai = require('chai');

const { expect } = chai;
const { buildCreatePayload } = require('../hooks/send/tallyfy');

const docusignParsed = require('./fixtures/docusignParsed');
const process = require('./fixtures/tallyfyProcess');

let builtPayload = {};
builtPayload = buildCreatePayload(docusignParsed, process);

describe(`hooks.send.tallyfy.buildCreatePayload`, function() {
  describe(`correctly build payload for Tallyfy run create`, function() {
    it(`Created Payload is not undefined`, function() {
      expect(builtPayload).not.to.be.undefined;
    });

    describe(`No built fields are undefined`, function() {
      Object.keys(builtPayload).forEach(key => {
        it(`property ${key} is defined`, function() {
          expect(builtPayload[key]).not.be.undefined;
        });
      });

      if (builtPayload.prerun) {
        Object.keys(builtPayload.prerun).forEach(key => {
          it(`prerun property ${key} is defined`, function() {
            expect(builtPayload.prerun[key]).not.be.undefined;
          });
        });
      }
    });
  });
});
