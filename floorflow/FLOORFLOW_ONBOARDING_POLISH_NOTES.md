# Floor Flow Onboarding Polish

Implemented:
- Production flow now asks for Plant Name before Stripe Checkout.
- Demo and Production admin setup now use First Name and Last Name fields.
- Demo onboarding now requires Email Address for follow-up.
- Admin full name is automatically built from first + last name.
- Demo contact details are stored on the plant and admin user.
- Production plant records store onboarding contact details when available.

Test:
1. Demo plant:
   - choose Demo
   - enter plant name
   - enter first name, last name, email, numeric PIN
   - finish setup
   - verify Admin opens

2. Production monthly:
   - choose Production
   - enter plant name before checkout
   - complete Stripe
   - verify returned plant email uses the real plant name
   - finish setup with first/last name

3. Production yearly:
   - same as monthly
   - verify return URL stays on onetmediagroup.ca/floorflow
