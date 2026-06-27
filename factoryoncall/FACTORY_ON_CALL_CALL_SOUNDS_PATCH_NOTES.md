# Factory On Call — Call Sound Patch

Added one-shot sound cues to the live dashboards:

- `call-chime.mp3` plays once when a new regular waiting call appears.
- `acknowledge.mp3` plays once when a call changes to acknowledged.
- `call-closed.mp3` plays once when a call changes to closed.
- Existing `emergency-alert.mp3` loop behavior is unchanged.

Applied to:
- Supervisor Queue
- Interactive Viewer
- Production Display

Implementation notes:
- Existing calls on first page load do not play sounds.
- Sounds are based on Firestore document state transitions.
- Emergency call records are ignored by the standard chime logic so emergency audio stays separate.
- Page refresh / reconnect should not replay sound for existing calls.
