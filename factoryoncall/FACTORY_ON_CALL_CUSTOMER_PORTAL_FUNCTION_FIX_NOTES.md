# Factory On Call — Customer Portal Function Fix

This patch adds the missing backend function for the Admin Billing tab.

## Added

- `createCustomerPortalSession` Firebase Function
- Stripe Customer Portal session creation
- CORS support for browser calls
- Admin Billing tab fallback/renderer if missing
- Billing status card
- Manage Subscription button wired to the new function

## Deploy

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:createCustomerPortalSession,functions:stripeWebhook --project factoryoncall
```

If Firebase asks about deleting old functions, choose **No**.

## Stripe requirement

Stripe Customer Portal must be enabled/configured in Stripe Dashboard for sandbox and later live mode.
