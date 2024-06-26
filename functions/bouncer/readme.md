# Bouncer

THAT front door order manager

An http-triggered function

## Guides

Live on March 30, 2021

### PubSub local testing

See the project **beam** in repo [beam](https://github.com/thatconference/beam) for gcloud cli and bootstrapping for local emulators.

This function (bouncer) posts messages to GCP PubSub. For local testing we utilize the `gcloud` PubSub emulator. A guide on setting up the emulator can be found here, [https://cloud.google.com/pubsub/docs/emulator](https://cloud.google.com/pubsub/docs/emulator).

Assuming you have the `gcloud` cli installed and other emulator prerequisites (e.g. Java 8) here is how to get started. We require multiple terminal windows to pull this off.

Terminal Window TLDR; list:

- PubSub emulator
- bouncer
- brinks
- Stripe listener
- Firestore emulator (future)

#### Terminal Windows Details

---

Terminal window: **PubSub Emulator**

```sh
gcloud beta emulators pubsub start --project=dev-that
```

The project name is not referring to anything in our case, it is simply required and isn't tied with any gcp projects. You will see a similar output as the emulator starts:

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

To setup the PubSub Emulator with needed topic(s), etc. use our [beam cli](https://github.com/ThatConference/beam) project. See the readme for instructions. To bootstrap our emulator use: `npx babel-node -- ./src/index.js bs-pubsub`

The shell you run the cli in will require two environment variables

```sh
$(gcloud beta emulators pubsub env-init)
export PUBSUB_PROJECT_ID=dev-that
```

##### Stopping Emulator

**Note**: new versions of gcloud seems to have corrected this issue. I am leaving this here for historical and referential reasons.

**Ctrl-c does stop the Python process for the emulator**. What it doesn't stop is a java process spawned (for a jetty session or similar). Anyway, this process also needs to be killed to clean thing up properly. If there is a message stuck in the queue even if you **stop the emulator process** this java process will continue to try and deliver the message. If you aren't running other java processes, something like `killall java` works fine.

---

Terminal window: **Bouncer Project**

Bouncer waits for webhook requests from Stripe and queues them to PubSub.

This sets an environment variable so our function sends topics to the emulator, not the production PubSub:

```sh
$(gcloud beta emulators pubsub env-init)
export PUBSUB_PROJECT_ID=dev-that
```

The command `gcloud beta emulators pubsub env-init` outputs something like `export PUBSUB_EMULATOR_HOST=localhost:8085` to sent an env variable. And in case you're not aware, the `$()` executes that command; exports the variable to the environment.

- Jan 2021 - a recent update has `env-init` returning ipv6 address. I had issues with this and had to change the `::1` to `localhost` manually for proper operation.
- June 2020 - `env-init` is setting `localhost` again and not `::1`

Run bouncer with nodemon. Default listening port is `9090`:

```sh
npm run start:watch
```

---

Terminal window: **Brinks Project**

Brinks is our order taker which responds to http requests from PubSub and does the needful.

To run brinks:

```sh
npm run start:watch
```

Runs brinks with nodemon. Default listening port is `8080`

---

Terminal window: **Stripe Listener**

Stripe listener is part of the Stripe CLI which listens for dev webhook activity and redirect to your locally running code. In our case this will throw requests to `Bouncer`.

To listen for all events:

```sh
stripe listen --forward-to localhost:9090/stripe
```

To listen for specific events we're interested in:

```sh
stripe listen --events checkout.session.completed,customer.created --forward-to localhost:9090/stripe

stripe listen --events checkout.session.completed,customer.created,customer.subscription.updated,invoice.paid --forward-to localhost:9090/stripe
```

Once executed and running the console will output a webhook signing secret. This secret rarely changes though ensure it is the same secret you have set in the `.env` under key `STRIPE_SIGNING_SECRET=`

---

Terminal window: **Stripe Trigger**

Strip trigger is part of the Stripe CLI which allows you to produce webhook events for testing.

```sh
# creates payment intent succeeded event
stripe trigger payment_intent.succeeded

# creates a new subscription with a billing_cycle_anchor in the near future.
# Stripe uses seconds-based epochs
# e.g. Math.floor(new Date().getTime()/1000 + 600)
stripe subscriptions create --billing-cycle-anchor=1633552826 --customer=cus_IvK5z7dZ3LWghC -d "items[0][price]=price_1IJTWcBvVBgmhQW4XjOqTsDC"
```

---

Terminal window: **Firestore Emulator**

gcloud Firestore emulator. Future thing for our testing. Currently not in use here.

## Troubleshooting

**When running `beam` and receive an error like, `'Received RST_STREAM with code 2 (Internal server error)'`.** This turned out to be that the gcloud sdk was at an older version than the pubsub emulator running. The fix was to update `@google-cloud/pubsub` to the latest version.

**`beam` 'hangs' when sending a command** Check the value of the `PUBSUB_EMULATOR_HOST` environment variable set by `env-init`. It may be that your system isn't working well with IP6 and `::1` should be replaced with `localhost`.

**Messages may still be sent after PubSub emulator is stopped**. Using ctrl + c stops the emulators Python process, but what it doesn't stop is a java process spawned (we think for a jetty session). This process also needs to be killed to clean thing up properly. If there is a message stuck in the queue even if you **stop the emulator process** this java process will continue to try and deliver the message. If you aren't running other java processes, something like `killall java` works fine.

## Process Flow

### Basics

The basic process flow for a Stipe Checkout process is as follows:

stripe > bouncer > pubsub > brinks > firestore
