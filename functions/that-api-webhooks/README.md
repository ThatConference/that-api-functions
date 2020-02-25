# that-api-webhooks

[![Actions Status](https://github.com/ThatConference/that-api-webhooks/workflows/Push%20Master%20CI/badge.svg)](https://github.com/ThatConference/that-api-webhooks/workflows/actions)

middleware webhooks

## Authentication

Uses basic authentication. Preferred method is via header, though the **less secure** query string will also be accepted. This is unfortunately required as some services can't set an authorization header for their webhooks.

Authorization header always takes precidence.

For basic authentication the username and password is base64 encoded. For example:

`% base64 username:password`

Post example with header

```bash
$ curl -d "<data to post>" \
- H "Content-Type: application/xml" \
- H "Authorization: Basic <base64 encoded username:password>"
- X POST https://that.tech/endpoint
```

Post example with query string

```bash
$ curl -d "<data to post>" \
-H "Content-Type: application/xml" \
-X POST https://that.tech/endpoint?Basic=<Base64 encoded username:password>
```

## Docusign -> Tallyfy Configuration

### Data files explaination

- **docusignFormFields.json**: By DocuSign template, provides fields parsed from submitted document. The parsing is done in parsers/docusign.js. This allow us to use a standard naming in the parsing code where the fields in the template may have different names.
- **tallyfyProcesses.json**: By Tallyfy Blueprint (known as checklist in thier api), provides id's and preload fields for "kick-off" form (called prerun form in thier api). Contains the following infomormation:
  - Checklist title and id
  - DocuSign template name this checklist is used for
  - Preload field names to use in building create process payload to send to Tallyfy
  - List of steps which will have guest email address set at creation. Step identifier used to get task id in a run
    - Checklist steps when created into a run become tasks within that run. The task is updated by referencing the task id.
