# Factory On Call Onboarding Patch

Added:
- `onboarding.html`
- `onboarding.css`
- `onboarding.js`

Onboarding supports:
- Demo Company
- Production Company
- Company information
- Admin user
- Starter roles
- Starter stations
- Company access links

Demo Company behavior:
- Demo companies can test calls, viewer updates, and display updates.
- Admin setup changes are locked in demo mode.
- Production companies are editable.

Patched:
- `admin.js` now blocks station/user/role setup changes when company is demo/adminLocked.
- `display.js` now supports `?companyId=` and loads company branding.
- `viewer.js` loads company branding.
- `call.js` loads company branding.
- `package.json` now includes `"type": "module"`.

Test:
1. Open `/factoryoncall/onboarding.html`
2. Create Demo Company.
3. Open links shown on final screen.
4. Confirm calls work end-to-end.
5. Confirm Admin setup changes are blocked in demo.
6. Create Production Company.
7. Confirm Admin setup changes are allowed.
