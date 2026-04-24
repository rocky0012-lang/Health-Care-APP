# Post-Deploy Checklist

## Immediate smoke checks

1. Open the landing page and verify navigation, FAQ toggles, and contact form submission.
2. Create a patient account, log in, and verify dashboard, appointments, records, and billing pages load.
3. Create a doctor account from admin and confirm the doctor welcome email template is correct.
4. Test doctor password recovery end-to-end (`forgot-password` -> email link -> reset -> login).
5. Open Patient Care Assistant and verify normal replies and fallback warning behavior.

## Environment and infrastructure

1. Confirm required env vars are present in production: `PROJECT_ID`, `API_KEY`, `NEXT_PUBLIC_ENDPOINT`, `RESEND_API_KEY`, database/table IDs, and doctor portal URL.
2. Verify Appwrite Messaging, Functions, and Tables permissions align with runtime calls.
3. Confirm domain, TLS, and DNS for app URLs and email links.

## Monitoring and operations

1. Check server logs for Appwrite timeout/retry spikes and assistant fallback frequency.
2. Verify outbound email success rates for doctor onboarding, patient notifications, and contact form messages.
3. Track key user flows: signup conversion, login success, and appointment creation completion.

## Planned upgrades (later)

1. Replace deprecated middleware-related assumptions with future Next.js proxy updates as framework guidance evolves.
2. Add lightweight startup env validation for all external integrations beyond Appwrite (email, AI function, optional URLs).
3. Add an automated CI smoke suite for auth, booking, and contact form flows.
