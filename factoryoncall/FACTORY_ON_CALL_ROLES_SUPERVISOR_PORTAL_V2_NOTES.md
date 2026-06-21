Factory On Call Roles + Supervisor Portal V2 Patch

Changes:
- Moves Supervisor Portal out of Live Screens and into an Operations Portal sidebar group.
- Keeps Viewer and Display as live screens.
- Roles now support:
  - Callable personnel type
  - Can acknowledge matching calls
  - Can close matching calls
  - Can acknowledge any call
  - Can close any call
  - Supervisor Portal access
- Role table displays response access as badges to avoid long permission strings.
- Replaces supervisor.html/css/js with a real supervisor operations portal:
  - Live stats
  - Search
  - Area filter
  - Personnel filter
  - Status filter
  - Active call management
  - Recent activity
  - Acknowledge and Close buttons
- Supervisor action buttons respect role access when a uid/userId is supplied.
