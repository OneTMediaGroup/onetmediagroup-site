# Factory On Call — Emergency History Analytics Patch

Added Emergency History reporting to Analytics.

## Included
- Emergency events are shown in a dedicated Analytics section.
- Summary cards:
  - Total Emergencies
  - Active Emergency
  - Average Duration
  - Longest Duration
  - This Month
- History table columns:
  - Date / Time
  - Station
  - Area
  - Cleared By
  - Duration
  - Status
- Export Emergency CSV button.
- Emergency activation now stores station and area.
- Emergency clear now stores durationSeconds when possible.

## Design choice
No Activated By column. Station owns the emergency activation. Cleared By is kept for audit trail.
