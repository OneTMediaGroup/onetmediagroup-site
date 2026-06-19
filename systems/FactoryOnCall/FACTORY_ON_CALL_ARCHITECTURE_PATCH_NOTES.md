# Factory On Call Architecture Patch

Updated `index.js` seeder to match the new company-first structure.

New Firestore structure:

companies/demo-company
- settings/main
- branding/main
- roles
- users
- stations
- calls/_seed_marker
- activity/_seed_marker

Key changes:
- Replaced old `plants/{PLANT_ID}` seed path with `companies/{COMPANY_ID}`.
- Replaced `authorized_pins` with `users`.
- Added seed stations.
- Added settings and branding subdocuments.
- Added activity collection marker for future logs/reports.
- Demo company is marked with `isDemo: true`, `mode: "demo"`, and `environment: "demo"`.

Run from the Factory On Call folder:

node index.js

Then test:

admin.html?companyId=demo-company
call.html?companyId=demo-company
viewer.html?companyId=demo-company
display.html?companyId=demo-company
