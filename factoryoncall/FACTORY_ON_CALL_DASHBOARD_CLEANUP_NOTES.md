Factory On Call Dashboard Cleanup Patch

Patched files:
- admin.html
- admin.css
- admin.js

Changes:
- Removed duplicate lower stat cards from the Dashboard.
- Removed placeholder Quick Statistics / Quick Actions blocks.
- Dashboard now uses:
  - Top stat cards: Today’s Calls, Active Calls, Closed Today
  - Current Priority full-width row
  - System Snapshot full-width row
  - Recent Activity full-width rows
- Added smart elapsed time:
  - Just now
  - 42 min
  - 3 hr 20 min
  - 2 days 4 hr
  - 1 wk
- Recent Activity and Current Priority now use clearer linear rows.
