# Factory On Call - Supervisor Legacy Call Cleanup Patch

This patch hides legacy/malformed Firestore call records from the Supervisor Portal when they do not contain a real station name.

## Why
Old test records can exist in the calls collection with missing station metadata. They render as:

- Unknown Station
- Support
- Unassigned

These are not actionable live plant calls, but they can still appear in Recent Activity because the Supervisor Portal renders all recent call documents.

## Change
Added Supervisor Portal guards:

- `callStationName(call)`
- `isDisplayableCall(call)`
- `visibleCalls()`

Supervisor counts, Live Call Management, and Recent Activity now use only displayable calls with a real station name.

## Result
Valid calls still show normally:

- Station: Packaging
- Personnel Required: Production Support
- Area: Plant South

Old malformed records are ignored by the Supervisor Portal instead of showing as Unknown Station.
