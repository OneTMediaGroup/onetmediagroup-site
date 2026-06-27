# Factory On Call — Call Log Filter Spacing Polish

Patched from Archive(188).zip.

## What changed

- Split the call log status area into a clean result row and a separate filter panel.
- Added `Sorted: ...` as a quiet right-side status label instead of mixing sort into the filter chips.
- Filter chips now appear inside a dedicated `Filters` panel only when active filters exist.
- Increased chip padding and spacing so the area no longer feels cramped.
- Changed `Clear All` into a text action instead of another crowded pill.
- Added responsive behavior so the status/filter area stacks cleanly on smaller screens.

## Files changed

- `admin.html`
- `admin.js`
- `admin.css`
