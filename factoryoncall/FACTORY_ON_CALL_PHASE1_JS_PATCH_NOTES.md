# Factory On Call Phase 1 JS Patch

Patched the four supplied files:

## admin.js
- Call button generated links now include `companyId`.
- Loads/stores company name for generated URLs.
- Users now support both older seed fields (`name`, `employeeNumber`) and newer admin fields (`firstName`, `lastName`, `uid`).
- New users are saved using UID as the document ID instead of random auto IDs.
- User listener no longer requires `firstName` to exist before it can load demo users.
- User search includes name, UID, employee number, role, department.

## call.js
- Stores company name from URL/localStorage.
- User PIN verification supports both `uid` and `employeeNumber`.
- Caller name supports both split names and seeded full name.
- Call documents include `companyName`.
- Closing a call records `closedBy` and `closedByUid`.

## viewer.js
- Stores company name from URL/localStorage.
- Viewer user lookup supports both `uid` and `employeeNumber`.
- Viewer name supports split names and seeded full name.
- Acknowledge records `ackByUid`.
- Close records `closedBy` and `closedByUid`.

## index.js
- Seeder users now match Admin UI fields:
  - `uid`
  - `employeeNumber`
  - `firstName`
  - `lastName`
  - `name`
  - `role`
  - `dept`
  - `pin`
- Seeder stations now include:
  - `description`
  - `cells`
  - timestamps

All four files passed `node --check`.
