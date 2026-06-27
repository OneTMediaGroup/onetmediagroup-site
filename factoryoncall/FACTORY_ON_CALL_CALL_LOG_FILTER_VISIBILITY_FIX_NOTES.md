# Factory On Call — Call Log Filter Visibility Fix

Fixed the Call Logs status/filter area after the export polish pass.

## Updates
- Bumped admin CSS/JS cache versions so the browser pulls the latest layout.
- Count and sorted badge now stay on one clean row on desktop.
- Active filter chips are forced visible when any filter/search/date is active.
- Filter panel now uses an explicit `.is-visible` class in addition to `hidden` for reliable rendering.
- Improved chip spacing and Clear All text action styling.

## Files touched
- `admin.html`
- `admin.css`
- `admin.js`
