# Factory On Call — Emergency History Layout/Data Fix

- Moved Emergency History analytics below the normal analytics sections so it behaves like the other detailed stat blocks instead of appearing at the top.
- Fixed the emergency date-range filter so Last 30 Days / Today / All Time properly include emergency events when the range end is open-ended.
- Emergency totals, table rows, average duration, longest duration, active status, and export now use the corrected range logic.
