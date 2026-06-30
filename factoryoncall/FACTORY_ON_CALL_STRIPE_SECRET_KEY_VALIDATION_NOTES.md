# Factory On Call - Stripe Secret Key Validation

This patch adds a clearer server-side validation for Stripe configuration.

## Updated
- `functions/index.js` now checks that `STRIPE_SECRET_KEY` starts with `sk_`.
- If a publishable key (`pk_...`) is accidentally stored, checkout returns a clear configuration message instead of Stripe's lower-level API error.
- Removed a duplicate `region` entry from the webhook function config.

## Important
The checkout error seen in the browser usually means the Firebase secret was set to a Stripe publishable key.

Use the Stripe **Secret key** from Sandbox mode, which starts with:

```
sk_test_
```

not the publishable key, which starts with:

```
pk_test_
```
