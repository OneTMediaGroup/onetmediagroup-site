# Factory On Call — Emergency History Table Fix

Patched the Analytics Emergency History section so it matches the intended audit table layout.

## Changes
- Emergency History now renders as a real table:
  - Date / Time
  - Station
  - Area
  - Cleared By
  - Duration
  - Status
- Summary stats moved below the table in compact cards.
- Active Emergency stat now follows the live emergency settings document instead of stale history records.
- Stale history events with `active: true` no longer keep Analytics showing Active after the plant emergency is cleared.
- Duration now prefers `durationSeconds`, with fallback to activated/cleared timestamps.
- CSV export uses the same corrected status and cleared-by logic.
