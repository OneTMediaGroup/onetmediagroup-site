# Factory On Call — Clean Company ID Link Patch

## What changed

Factory On Call now creates new companies with Firestore auto-generated document IDs instead of name-based slugs.

Old style:

```text
companies/pro-plant-tester-oogdpg
supervisor.html?companyId=pro-plant-tester-oogdpg&companyName=Fun+Stuff
```

New style:

```text
companies/FirestoreAutoId
supervisor.html?companyId=FirestoreAutoId
```

## Files updated

- `onboarding.js`
  - Added Firestore `collection` import.
  - New companies now use `doc(collection(db, "companies"))` to generate the Firestore document ID.
  - `companyId` is stored as the Firestore document ID inside the company document.
  - Station IDs still use clean station slugs only.

- `admin.js`
  - Station links no longer include `companyName` in the URL.
  - Supervisor, Interactive Viewer, and Production Display links no longer include `companyName` in the URL.
  - Links now use only `companyId`.

- `company-session.js`
  - Link builders strip legacy `company` and `companyName` URL parameters.
  - New generated links are clean and stable.

## Notes

Existing old test companies are not migrated. The user confirmed old test companies can be discarded and new companies can be created.

The system still reads `companyName` from Firestore branding/company documents, so the name can be changed later without changing links.
