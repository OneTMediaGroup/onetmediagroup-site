# Factory On Call Onboarding v2 Patch

Updated onboarding to follow the simpler Floor Flow-style flow:

1. Welcome screen asks for first name, last name, and email once.
2. User chooses Demo Plant or Production Plant.
3. Demo Plant creates immediately and shows plant code/links.
4. Production Plant shows Monthly/Annual plan selection.
5. Stripe checkout is currently a placeholder return flow until live Stripe links are added.
6. Production activation asks only for plant name, then creates the plant and shows plant code/links.

Also added:
- onboardingVersion field on company docs
- ownerFirstName / ownerLastName / ownerEmail fields
- placeholder stripeStatus for production test activations
- cleaner progress labels
- cleaner ready screen with Plant Code, Admin PIN, and access links
- sound settings defaults in company settings

Next pass:
- replace Stripe placeholder URLs with live monthly/annual checkout links
- build the proper locked demo plant seed
- wire Resend welcome email after successful Stripe activation
