# Bouncer

THAT front door order manager

An http-triggered function

## Guides

### PubSub local testing

See project **dev-that** in this `that-api-functions` repo for gcloud cli and bootstrapping for local emulators.

This function posts messages to GCP PubSub. For local testing we utilize the `gcloud` PubSub emulator. A guide on setting up the emulator can be found here, [https://cloud.google.com/pubsub/docs/emulator](https://cloud.google.com/pubsub/docs/emulator).

Assuming you have the `gcloud` cli installed and other emulator prerequisites (e.g. Java 8) here is how to get started. We require multiple terminal windows to pull this off.

Terminal Window TLDR; list:

- PubSub emulator
- bouncer
- brinks
- Stripe listener
- Stripe trigger
- Firestore emulator

#### Terminal Windows Details

---

Terminal window: **PubSub Emulator**

```sh
gcloud beta emulators pubsub start --project=dev-that
```

you will see a similar output as the emulator starts:

```sh
% gcloud beta emulators pubsub start --project=dev-that
Executing: /usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/platform/pubsub-emulator/bin/cloud-pubsub-emulator --host=localhost --port=8085
[pubsub] This is the Google Pub/Sub fake.
[pubsub] Implementation may be incomplete or differ from the real system.
[pubsub] Dec 10, 2020 1:11:30 PM com.google.cloud.pubsub.testing.v1.Main main
[pubsub] INFO: IAM integration is disabled. IAM policy methods and ACL checks are not supported
[pubsub] Dec 10, 2020 1:11:31 PM com.google.cloud.pubsub.testing.v1.Main main
[pubsub] INFO: Server started, listening on 8085
```

---

Terminal window: **Bouncer Project**

Bouncer waits for webhook requests from Stripe and queues them to PubSub.

This sets an environment variable so our function sends topics to the emulator, not the production PubSub.

```sh
$(gcloud beta emulators pubsub env-init)
export PUBSUB_PROJECT_ID=dev-that
```

The command `gcloud beta emulators pubsub env-init` outputs something like `export PUBSUB_EMULATOR_HOST=localhost:8085` to sent an env variable. And in case you're not aware, the `$()` executes that command, exports the variable to the environment.

---

Terminal window: **Brinks Project**

Brinks is our order taker which pulls messages from PubSub and does the needful.

---

Terminal window: **Stripe Listener**

Stripe listener is part of the Stripe CLI which listens for dev webhook activity and redirect to your locally running code.

```sh
stripe listen --forward-to localhost:9191/stripe
```

---

Terminal window: **Stripe Trigger**

Strip trigger is part of the Stripe CLI which allows you to produce webhook events for testing.

```sh
stripe trigger payment_intent.succeeded
```

---

Terminal window: **Firestore Emulator**

gcloud Firestore emulator. Future thing for our testing
