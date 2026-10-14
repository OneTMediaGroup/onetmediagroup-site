# 7D accounts, profiles, and confirmed connections

Dedicated Firebase project: `onet-7d`. Authentication: email/password, verified email required for all profile/invitation/connection data, minimum password length 12 enforced in Firebase. Firestore: Standard edition, `(default)`, `northamerica-northeast2` (Toronto). Hosting remains the existing One T GitHub Pages website at `/7d/app.html`. No Cloud Functions, new domain, billing upgrade, storage upload, or AI service was added.

## Working flows

Create account → verify email → create private profile → invite by exact email → recipient signs in with that verified email → accept → both people appear in each other's universe. Owners can edit display name/bio/colour. Sender can cancel; recipient can decline. Either confirmed member can remove the connection. Email password recovery is included.

Invitations are shown in the app, not emailed automatically. Share the app link manually. Invitations expire within seven days; records are retained. The app displays the latest 50 invitations per inbox/outbox and up to 200 connections. It is an early access foundation, not a public profile directory or a multi-hop search service.

## Data and authorization

- `profiles/{uid}`: name, bio, colour, owner UID, timestamps. No email/address/photos. Direct reads only by owner or confirmed connection; all profile listing denied.
- `invitations/{random20charId}`: sender UID and validated profile name, recipient email, relationship, status, timestamps. Reads limited to sender or verified intended recipient. Send requires an atomic owner profile cooldown update, enforcing one invitation per 30 seconds.
- `members/{uid}/connections/{otherUid}`: reciprocal membership documents. Creation requires recipient-only acceptance of a pending, unexpired invitation and BOTH mirrors in the same atomic transaction. Removing requires both mirrors to be deleted atomically. Accepted invites cannot be replayed to restore a removed edge.

The signed-in browser uses session persistence. All shared data access is governed by database rules, not client visibility. No durable Firestore cache is enabled. Session changes clear private views/subscriptions; connection removal clears loaded profile details. Administrators retain technical project access. Account-data deletion/export requests currently go through the existing One T contact page and require identity verification; self-service deletion is not implemented.

## Development

`npm ci`, `npm run build`, `npm test` (requires Java 21 and Firebase CLI). The local source build emits into `public/`. Deployment source is tracked in the website repository under `.development/7d`, whose build emits into `../../7d/assets/app.js`.

`firebase deploy --only firestore --project onet-7d` deploys only this project's rules and indexes. Never run without the explicit 7D project. Website changes publish through the existing website GitHub Pages main branch. Firebase web config is public by design; no admin credentials are included.

## Verification

15 real emulator security tests passed: owner/stranger/anonymous/unverified access, field validation, invitation query isolation, cooldown, recipient confirmation, mirror atomicity, forged/expired/cancelled/declined acceptance, removal, profile revocation, and replay prevention.

Browser flow passed against isolated Auth and Firestore emulators with fictional Alice/Bob accounts: signup, verification, profile edit, invite, recipient signup/verification, acceptance, both-way profile visibility, and removal. No test accounts or test invitations were created in production. Real verification/reset email delivery must be checked with an actual account controlled by the user.

## Next work

Test with a small trusted group before broader promotion. Add operational account-data deletion/export tooling, invitation abuse handling/blocking, App Check, and monitoring as the service grows. Add photos/pets/circles/memories and their permission models before AI. No AI provider is configured. The existing guide remains an explicit interface preview.

Implementation references: https://firebase.google.com/docs/auth/web/password-auth and https://firebase.google.com/docs/firestore/security/rules-conditions.
