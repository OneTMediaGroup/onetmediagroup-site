# Factory On Call — Resend Welcome Email Patch

## Added

- New Firebase Functions project scaffold:
  - `firebase.json`
  - `.firebaserc`
  - `functions/package.json`
  - `functions/index.js`
- Firestore trigger: `sendFactoryOnCallWelcome`
- Sends a Resend welcome email when a new production company document is created.
- Sender: `Factory On Call <factoryoncall@onetmediagroup.ca>`
- Reply-To: `factoryoncall2025@gmail.com`

## Email includes

- Plant name
- Plant code
- Administrator User ID
- Administrator PIN
- Admin Portal link
- Supervisor Portal link
- Call Station link
- Interactive Viewer link
- Production Display link

## Onboarding update

`onboarding.js` now stores these fields on the company document for production plants:

- `adminUserId`
- `adminPin`
- `portalBaseUrl`
- `welcomeEmailStatus`

## Deploy commands

From this project root:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:sendFactoryOnCallWelcome --project factoryoncall
```

The Resend secret has already been set with:

```bash
firebase functions:secrets:set RESEND_API_KEY --project factoryoncall
```

## Notes

- Demo plants do not send welcome emails.
- Production plants send the welcome email when the company doc is first created.
- Current production Stripe flow is still placeholder/test until live Stripe checkout is wired in.
