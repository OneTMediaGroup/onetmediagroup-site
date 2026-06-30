# Factory On Call Demo Welcome Email Function Fix

This patch confirms the server-side Firebase Function sends welcome emails for both Demo and Production plants.

## Important

The demo email will not send until the updated Firebase Function is deployed.

Run:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:sendFactoryOnCallWelcome --project factoryoncall
```

If Firebase asks whether to delete old functions, choose **No**.

## What changed

- The function no longer skips demo plants.
- Demo plants receive a branded Demo Plant welcome email.
- Production plants continue receiving the production welcome email.
- Added clearer logs showing whether the function is sending Demo or Production email.

## Test

After deployment, create a brand-new Demo Plant and run:

```bash
firebase functions:log --project factoryoncall
```

Look for:

`Preparing Factory On Call welcome email`
