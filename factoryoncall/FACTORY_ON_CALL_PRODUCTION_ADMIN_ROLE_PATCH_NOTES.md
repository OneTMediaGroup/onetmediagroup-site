# Factory On Call — Production Admin Role Patch

## Change
Production plants now seed one clean system role:

- Admin

The onboarding-created administrator user is assigned to this role.

## Production behavior
Production plants still do not seed demo data:

- no sample stations
- no sample operational roles
- no sample calls
- no demo users

Only the protected Admin role is created so the production plant does not appear inconsistent.

## Admin role protection
The Admin role is marked as protected/system/locked:

- visible in Roles
- users can be assigned to Admin
- cannot be edited
- cannot be archived
- not callable from Call Station

## Existing production plants
Admin page now auto-heals missing Admin role for non-demo plants when an administrator opens Admin.
