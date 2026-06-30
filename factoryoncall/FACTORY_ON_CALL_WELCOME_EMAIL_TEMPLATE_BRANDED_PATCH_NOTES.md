# Factory On Call — Branded Welcome Email Patch

## Updated
- Welcome email now mirrors the clean Floor Flow style.
- Removed customer-facing Gmail address.
- Uses branded support address: `factoryoncall@onetmediagroup.ca`.
- Uses branded reply-to: `factoryoncall@onetmediagroup.ca`.
- Keeps sender as `Factory On Call <factoryoncall@onetmediagroup.ca>`.

## Email includes
- Production Plant name
- Plant Code
- Administrator User ID
- Administrator PIN
- Admin Portal link
- Supervisor Portal link
- Interactive Viewer link
- Production Display link
- Call Station link
- Factory On Call feature list
- Recommended first steps
- Tutorials/updates link
- Factory On Call Team / One T Media Group closing

## Notes
- Demo plants still skip the welcome email.
- Production plants trigger the welcome email through the `sendFactoryOnCallWelcome` Firestore function.
- Firebase Secret required: `RESEND_API_KEY`.
