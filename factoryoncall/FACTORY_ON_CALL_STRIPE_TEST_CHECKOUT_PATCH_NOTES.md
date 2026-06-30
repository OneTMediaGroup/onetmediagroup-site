# Factory On Call — Stripe Test Checkout Patch

Added Factory On Call Stripe Sandbox checkout wiring.

## Added
- `createFactoryOnCallCheckoutSession` Firebase Function
- `stripeWebhook` Firebase Function
- Monthly test Price ID: `price_1To9yq20LQ2pqINAwk3afElt`
- Annual test Price ID: `price_1ToA0V20LQ2pqINAhWLzOnih`
- Stripe subscription checkout flow from onboarding
- Stripe success/cancel return handling
- Production plant creation from `checkout.session.completed`
- Production welcome email still sends through the existing Firestore create trigger

## Required Firebase secrets
Set these before deploying the Stripe functions:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project factoryoncall
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project factoryoncall
```

`RESEND_API_KEY` is already used by the welcome email function.

## Stripe webhook endpoint URL
Use this destination URL in Stripe Sandbox:

```text
https://us-central1-factoryoncall.cloudfunctions.net/stripeWebhook
```

## Stripe webhook events
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`

## Deploy
```bash
cd functions
npm install
cd ..
firebase deploy --only functions:createFactoryOnCallCheckoutSession,functions:stripeWebhook,functions:sendFactoryOnCallWelcome --project factoryoncall
```

If Firebase asks about deleting old functions, choose **No**.
