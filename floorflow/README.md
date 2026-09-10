# Floor Flow

Floor Flow is a browser-based plant floor scheduling and verification platform. It is built for live floor boards, supervisor queue control, admin setup, user access, and scan-ready operator flows.

## Included

- `index.html` - landing page
- `board.html` - floor console / touchscreen board
- `supervisor.html` - supervisor scheduling and queue control screen
- `admin.html` - admin / maintenance screen
- `display.html` - read-only plant display board
- `css/styles.css` - shared styling
- `js/*.js` - Firebase-ready application logic

## Core screens

- Floor Console: mark work ready, complete work, view notes, and advance the queue.
- Supervisor View: plan and edit the current / next queue.
- Display Board: read-only live plant screen.
- Admin / Maintenance: manage equipment, areas, users, branding, activity logs, and system controls.

## Firebase collections in use

Plant data is stored below `plants/{plantId}`: `users`, `workCells`, `areas`, `settings/main`, `partLibrary`, and `activityLogs`. Billing/contact/email collections are server managed. The old global collections are legacy and should not be used.

## Roles

- `operator`
- `dieSetter` - internal role key for authorized floor staff
- `supervisor`
- `admin`

## Notes

- Branding is configurable through Admin > System Controls.
- User import supports Employee ID and optional Badge Code fields.
- Badge printing uses the saved system branding when available.
- Browser sessions are designed for shared machine use with logout and session timeout behavior.

## Security and billing release

Sign-in uses server-verified private PIN hashes and Firebase Authentication. Database rules enforce plant membership, current roles, session expiry, and active billing. Administrators manage users through protected server endpoints. Display accounts are read-only.

Production pricing is CAD24.99/month or CAD249.99/year. Checkout, webhook reconciliation and the billing portal use the Floor Flow Stripe configuration. Deploy functions, migrate legacy test credentials, publish the browser files, and deploy database rules as one coordinated release.

Private credentials, local secret files, migration backups and test access files must never be published. Use firebase.floorflow.json to deploy only the Floor Flow codebase in die-changeover-board.
