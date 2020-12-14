# PubSub Fix

This function exists for testing/local development only.

## Summary

There is currently a bug in the PubSub emulator where:

1. It doesn't support triggering background gcp functions.
1. When setting up the subscriber to push to the function it sends the data incorrectly so where the functions signature is `(message, context)` all data from PubSub Emulator is sent in the second argument.

More detail:

- [https://github.com/GoogleCloudPlatform/functions-framework-nodejs/issues/41](https://github.com/GoogleCloudPlatform/functions-framework-nodejs/issues/41)
- [https://github.com/GoogleCloudPlatform/functions-framework-nodejs/issues/96](https://github.com/GoogleCloudPlatform/functions-framework-nodejs/issues/96)

There is no fix in sight for this as it has been a reported issue since mid-2019.

## Goals

`PubSubFix` function aims to receive requests from PubSub Emulator and throw them at the function endpoint in the correct form.

## Assumptions

- Basic push message: [https://cloud.google.com/pubsub/docs/push](https://cloud.google.com/pubsub/docs/push)
- PubSub Emulator by default (it seems) listens on port `8085`
- The function under test has a `@google-cloud/functions-framework` setup of `--signature-type=event` and no defined port so will listen on port `8080`.
- By default we'll run this function will listen on port `8080`.
