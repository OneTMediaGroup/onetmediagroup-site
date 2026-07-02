# Factory On Call — Clean Production Plant Patch

## Change
Production plant provisioning now creates a clean plant instead of loading demo/default factory data.

## Production plant now creates only
- Company document
- Billing / Stripe fields
- Main settings
- Emergency settings disabled by default
- Branding defaults
- One administrator user/login
- Empty collection markers for calls/activity

## Production plant no longer seeds
- Demo/sample stations
- Demo/sample roles
- Demo/sample users
- Demo/sample calls
- Demo/sample areas

## Demo plant behavior
Demo plants still seed the full Northwind demo environment.

## Files changed
- `functions/index.js`
- `onboarding.js`
