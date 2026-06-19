# Demo Email Admin Link Check

Checked `floorflow-functions/index.js`.

The demo welcome email now uses the Admin Console link:

`https://onetmediagroup.ca/floorflow/admin.html?plantId=${plantId}`

It no longer uses:

`https://onetmediagroup.ca/floorflow/onboarding.html?plantId=${plantId}`

Also cleaned wording:
- "Open your Demo Plant Admin Console here"
- "Thank you for choosing Floor Flow!"

Important:
After copying this patch, deploy functions again:

`cd ~/Desktop/AllSites/onetmediagroup-site/floorflow`
`firebase deploy --only functions:floorflow-functions`

Then test with a brand new demo plant. Existing demo plants may not resend because `demoWelcomeEmailSentAt` prevents duplicate demo emails.
