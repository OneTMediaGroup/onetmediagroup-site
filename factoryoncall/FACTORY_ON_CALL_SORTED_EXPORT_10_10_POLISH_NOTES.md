# Factory On Call — Sorted Export 10/10 Polish Patch

Patched in this build:

- Renamed the resolution filter from "All summaries" to "All Resolution Notes".
- Changed the main call log export button to "Download CSV".
- Added live result count: "Showing X of Y calls".
- Added active filter chips with one-click removal.
- Added a persistent sort chip so managers can see the current sort order.
- Added Clear All Filters chip when any filter is active.
- Added CSV metadata header to Current View, Raw History, and Station Summary exports:
  - Factory On Call Export
  - Company
  - Company ID
  - Generated timestamp
  - Export type
  - Rows exported
  - Sort
  - Active filters

Files changed:
- admin.html
- admin.js
- admin.css
