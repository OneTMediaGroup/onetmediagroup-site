# Factory On Call — Billing Portal + Subscription Status Patch

Added:
- Stripe Customer Portal function: createFactoryOnCallCustomerPortalSession
- Admin Billing tab with Manage Subscription button
- Billing status display for active / past_due / canceled / demo
- Webhook handling for:
  - customer.subscription.deleted -> inactive/canceled
  - invoice.payment_failed -> past_due warning
  - invoice.payment_succeeded -> active
- Production plants now store subscriptionStatus and stripeStatus as active on creation.

Deploy:
firebase deploy --only functions:createFactoryOnCallCustomerPortalSession,functions:stripeWebhook,functions:createFactoryOnCallCheckoutSession,functions:sendFactoryOnCallWelcome --project factoryoncall

Stripe:
Make sure the Stripe Customer Portal is configured in Sandbox before testing Manage Subscription.
