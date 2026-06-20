Factory On Call Display Board Patch

Patched:
- display.js
- display.css

Changes:
- Display now looks closer to Viewer, but TV-focused.
- Active calls now show clear columns:
  Station
  Help Needed
  Area / Cell
  Requested By
  Waiting
  Status
- "Supervisor" is now shown under Help Needed so it is clear it means the requested support role.
- Added clearer Waiting / On the Way status pills.
- Added empty state when no calls are active.
- Added safer timestamp handling.
- Added live rerender every 30 seconds so waiting time updates without needing a new Firestore event.
- Kept dynamic companyId support.
