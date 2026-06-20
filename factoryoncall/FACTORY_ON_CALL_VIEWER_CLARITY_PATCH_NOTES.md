# Factory On Call Viewer Clarity Patch

Patched:
- viewer.js
- viewer.css
- display.js

Changes:
- Viewer stays linear/row-based, not card-heavy.
- Viewer columns now read: Station | Personnel Required | Location | Waiting | Status | Actions.
- Display labels now use the same language: Personnel Required and Location.
- Added empty state for Viewer when there are no active calls.
- Kept existing acknowledge/close workflow intact.
