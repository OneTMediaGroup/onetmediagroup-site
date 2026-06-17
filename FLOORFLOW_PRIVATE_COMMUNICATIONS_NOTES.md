# Floor Flow Private Communications

Added:
- `floorflow/communications.html`
- `floorflow/js/communications.js`
- `sendFloorFlowCommunication` Firebase Function
- Email templates for launch, feature updates, maintenance, renewal reminders

Security:
- The page has a private send key field.
- The Firebase Function checks the secret `ONET_ADMIN_SEND_KEY`.
- Without that secret, the function returns `403 Not authorized`.
- This is the real access control, not just hiding the page.

Setup after copying files:
1. In Terminal:
   ```bash
   cd ~/Desktop/AllSites/onetmediagroup-site/floorflow/floorflow-functions
   npm install
   firebase functions:secrets:set ONET_ADMIN_SEND_KEY
   ```
   Pick a private phrase/password. Do not put it in the code.

2. Deploy:
   ```bash
   cd ~/Desktop/AllSites/onetmediagroup-site/floorflow
   firebase deploy --only functions:floorflow-functions
   ```

3. Copy the function URL printed for:
   `sendFloorFlowCommunication`

4. Open:
   `floorflow/js/communications.js`

5. Replace:
   `PASTE_SEND_FLOOR_FLOW_COMMUNICATION_FUNCTION_URL_HERE`

   with the function URL.

6. Sync the website to GitHub Pages.

Then open:
`https://onetmediagroup.ca/floorflow/communications.html`

Start by sending a test to yourself only.
