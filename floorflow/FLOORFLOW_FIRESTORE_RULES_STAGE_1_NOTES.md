# Floor Flow Firestore Rules Lockdown - Stage 1

Added:
- `firestore.rules`
- `firestore.indexes.json`
- Updated `firebase.json` to point to those files.

What this locks down:
- Blocks top-level `mail`, `billingCustomers`, `floorFlowContacts`, and `floorFlowCommunications` from browser access.
- Blocks old global `/users`, `/presses`, and `/test`.
- Allows only plant-scoped Floor Flow data under `/plants/{plantId}`.
- Prevents browser clients from changing billing activation fields on an existing plant.
- Prevents browser clients from creating a plant already marked paid/active.
- Blocks activity log edits/deletes after creation.

Important:
- This is Stage 1 because Floor Flow currently uses plant links/PINs, not Firebase Auth.
- Anyone with a valid `plantId` link can still access that plant's plant-scoped data.
- True role-based rules require Firebase Auth/custom claims or a server-issued session token.

Deploy:
```bash
cd ~/Desktop/AllSites/onetmediagroup-site/floorflow
firebase deploy --only firestore:rules
```

After deploy, test:
1. Demo onboarding
2. Production monthly checkout
3. Production yearly checkout
4. Admin add/edit user
5. Admin add/edit work cell
6. Parts Library add/edit/delete
7. Supervisor queue save/running/pause/clear
8. Display Board and Floor Board load
9. Communications page still loads contacts and sends emails
