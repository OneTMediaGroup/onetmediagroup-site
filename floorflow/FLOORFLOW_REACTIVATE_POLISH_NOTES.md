# Floor Flow Reactivation Polish

Updated:
- Locked screen Reactivate button now opens onboarding with `mode=production&reactivate=true`.
- Onboarding recognizes reactivation mode.
- Existing inactive production plant is loaded by Plant Code.
- Messaging now says Reactivate Production Plant instead of feeling like a new plant setup.
- Checkout reuses the same Plant ID.

Test:
1. Open locked production plant.
2. Click Reactivate Plant.
3. Confirm onboarding says Reactivate Production Plant and shows same Plant Code.
4. Choose monthly/yearly checkout.
5. After payment, same plant should unlock.
