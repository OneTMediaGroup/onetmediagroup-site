# Factory On Call — Stripe Webhook Phase 1 Status Patch

## Added / hardened

- `checkout.session.completed`
  - Creates/activates Production Plant
  - Stores subscription/customer IDs
  - Stores subscription status fields
  - Stores current period / next billing date when available

- `invoice.payment_succeeded` and `invoice.paid`
  - Marks plant subscription as active
  - Clears billing warning
  - Updates latest invoice/payment metadata

- `invoice.payment_failed`
  - Marks plant as `past_due`
  - Keeps plant active for grace-period handling later
  - Adds billing warning text

- `customer.subscription.deleted`
  - Marks plant as `canceled`
  - Sets `active: false`
  - Adds billing lock reason

- `customer.subscription.updated`
  - Handles status changes from Stripe Customer Portal
  - Updates cancellation-at-period-end and renewal dates when available

## Firestore fields updated

- `stripeStatus`
- `subscriptionStatus`
- `billingStatus`
- `active`
- `plan`
- `subscriptionPlan`
- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripeCurrentPeriodStart`
- `stripeCurrentPeriodEnd`
- `nextBillingAt`
- `stripeCancelAtPeriodEnd`
- `stripeLatestInvoiceId`
- `stripeLatestInvoiceUrl`
- `stripeAmountDue`
- `stripeAmountPaid`
- `billingWarning`
- `billingLockReason`
- `billingLastEventReason`
- `billingLastEventAt`

## Deploy

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:stripeWebhook,functions:createCustomerPortalSession --project factoryoncall
```

If Firebase asks about deleting older functions, choose **No**.
