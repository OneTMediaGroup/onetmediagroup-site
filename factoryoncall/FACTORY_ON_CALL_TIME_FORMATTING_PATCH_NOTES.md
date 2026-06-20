# Factory On Call Shared Time Formatting Patch

Standardized time labels across the active screens.

Updated:
- admin.js
  - Call Logs duration now changes from minutes to hours/days/weeks automatically.
  - CSV export uses the same readable duration label.
- viewer.js
  - Waiting column now uses smart elapsed labels.
- display.js
  - Waiting field now uses smart elapsed labels.

Examples:
- 42 min
- 3 hr 20 min
- 2 days 4 hr
- 1 wk 2 days

This keeps Dashboard, Call Logs, Viewer, and Display aligned with the same customer-facing time style.
