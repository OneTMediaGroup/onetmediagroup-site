# Factory On Call — Subscription Enforcement Phase 2

Added customer-friendly subscription enforcement across live operational screens.

## Behavior

- Demo plants are never locked by billing status.
- Active/trialing production plants continue with full access.
- Past due/payment failed plants show a warning banner but continue to operate.
- Canceled/unpaid/incomplete/paused production plants keep data visible but pause live operational actions.

## Live actions guarded

- Station call creation
- Station emergency trigger
- Station call close/reset
- Supervisor acknowledge/close
- Viewer acknowledge/close
- Emergency clear actions

## Admin

Admin remains available so customers can access Billing and manage their subscription through Stripe Customer Portal.
