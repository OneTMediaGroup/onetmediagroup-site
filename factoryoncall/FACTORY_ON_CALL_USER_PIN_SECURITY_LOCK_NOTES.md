# Factory On Call — User ID + PIN Security Lock

Patched into Archive(197).

## Added
- Admin page now requires Admin access.
- Supervisor Queue now requires Supervisor, Manager, or Admin access.
- Interactive Viewer now requires Supervisor, Manager, or Admin access.
- Login uses simple plant-floor User ID + PIN.
- Session is stored in sessionStorage and expires after 12 hours.
- Logout pill appears after successful unlock.
- Inactive or archived users are blocked.
- Direct URL access is blocked by the page overlay.

## Role rules
- Admin page:
  - `admin: true`, `isAdmin: true`, role `Admin`, or role `Administrator`.
- Supervisor / Viewer:
  - Admin users
  - Supervisor
  - Manager
  - Production Manager
  - Administrator
  - Admin

## Demo defaults
The demo plant has Factory Administrator user:
- User ID: `1000`
- PIN: `1000`

Other demo supervisors can unlock Supervisor / Viewer:
- Sarah Mitchell: User ID `1007`, PIN `7777`
- Mike Anderson: User ID `1008`, PIN `8888`
- Rachel Green: User ID `1013`, PIN `1414`

## Notes
This is the UI/session security layer. Firestore rules should still be added in the final security pass to enforce the same role boundaries server-side.
