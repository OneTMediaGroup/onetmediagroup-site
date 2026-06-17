# Floor Flow Yearly Checkout + Email Contact Fix

Patched:
- Stripe Checkout success/cancel URLs now force the live domain:
  `https://onetmediagroup.ca/floorflow/onboarding.html`

This prevents old `onetmediagroup.github.io/FloorFlow-Demo/...` links from being reused, especially on yearly checkout.

Also updated Floor Flow-facing support references to:
- `floorflow@onetmediagroup.ca`

Important:
- GitHub Pages deploy updates the website and `/floorflow/` app files.
- Firebase Cloud Functions do NOT deploy from GitHub Pages automatically.
- To update the welcome email body in `floorflow/floorflow-functions/index.js`, deploy the function separately from the `floorflow/floorflow-functions` folder.
