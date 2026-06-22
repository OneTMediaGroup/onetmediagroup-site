# Factory On Call Viewer Auth + Filter Patch

## Updated
- Added search box to Viewer.
- Added Area, Personnel, and Status filters.
- Viewer remains open/no login for visibility.
- Acknowledge and Close now open a User ID + PIN authorization popup.
- Authorization checks active user, PIN, and role response permissions.
- Actions record ack/close user details.
- Hidden malformed legacy calls with no station metadata.

## Permission model
- Respond Any roles can respond to any call.
- Respond Matching roles can respond only to calls matching their role.
- Supervisor Portal/respond-all legacy permissions remain supported.
