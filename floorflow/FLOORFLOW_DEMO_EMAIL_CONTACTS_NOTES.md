# Floor Flow Demo Email + Contacts Patch

Added:
- Demo welcome email sent automatically after Demo Plant setup.
- Demo email sends from Resend as `Floor Flow <floorflow@onetmediagroup.ca>`.
- Demo users are stored in Firestore collection `floorFlowContacts`.
- Paid customers are also stored in `floorFlowContacts` when welcome emails send.
- Private Communications page can now load saved contacts with the private send key.
- Manual sends also upsert recipients into contacts.

Deploy required:
```bash
cd ~/Desktop/AllSites/onetmediagroup-site/floorflow/floorflow-functions
npm install

cd ~/Desktop/AllSites/onetmediagroup-site/floorflow
firebase deploy --only functions:floorflow-functions
```

Expected new function URLs:
- `sendFloorFlowDemoWelcome`
- `listFloorFlowContacts`

The patch already points to:
- `https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/sendFloorFlowDemoWelcome`
- `https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/listFloorFlowContacts`

After deploy:
1. Sync GitHub Pages.
2. Create a demo plant with first name, last name, email.
3. Confirm demo welcome email arrives.
4. Open `/floorflow/communications.html`, enter private key, click Load Saved Contacts.
