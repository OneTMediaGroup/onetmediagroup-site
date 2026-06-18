# Floor Flow Billing Lock Patch

Added:
- `js/billing-guard.js`

Protected pages:
- Admin
- Supervisor
- Floor Console / Board
- Display Board
- Parts Library

Behavior:
- Demo plants continue to work.
- Production plants require:
  - `productionUnlocked === true`
  - `paid === true`
  - `billingStatus` active/trialing
  - `subscriptionStatus` active/trialing
- If subscription is inactive/cancelled/failed, page shows a locked screen.
- Stripe webhook already updates Firestore; this patch makes the UI enforce that billing state.

Test:
1. Open cancelled production plant admin link.
   Expected: locked screen.
2. Open display/board/supervisor links.
   Expected: locked screen.
3. Open a demo plant.
   Expected: still works.
4. Reactivate via new checkout.
   Expected: pages unlock after Firestore returns active/paid.
