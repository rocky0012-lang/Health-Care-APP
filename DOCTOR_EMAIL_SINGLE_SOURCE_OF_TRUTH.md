# Doctor Email Single Source of Truth

## Purpose
Prevent duplicate or incorrect doctor emails by defining one authoritative sender per doctor email type.

## Authoritative Send Paths

1. Doctor welcome email (account creation)
- Template owner: lib/actions/email-notification.action.ts
- Function: sendDoctorWelcomeEmail
- Trigger owner: lib/actions/doctor.action.ts in createDoctorAccount

2. Doctor password recovery email
- Template owner: lib/email.ts (password reset document)
- Trigger owner: lib/actions/doctor.action.ts in initiateDoctorPasswordRecovery via sendDoctorPasswordRecoveryEmail

## Explicitly Disabled Paths

1. Legacy Appwrite users.create email path
- File: appwrite/functions/patient-notifications/index.js
- Status: disabled for users.*.create events
- Reason: avoid duplicate/wrong-template sends

2. Legacy doctor welcome helper in shared email module
- File: lib/email.ts
- Status: removed
- Reason: ensure doctor welcome mail is sent only from email-notification.action.ts

## Guardrails

1. Do not add doctor welcome email sends anywhere except createDoctorAccount.
2. Do not re-enable users.*.create email sending in Appwrite function for onboarding.
3. If Appwrite function code changes, redeploy function bundle immediately.
4. When changing templates, update only the owner file listed above.

## Quick Verification Checklist

1. Search for sendDoctorWelcomeEmail references and confirm only:
- definition in lib/actions/email-notification.action.ts
- call in lib/actions/doctor.action.ts

2. Search Appwrite function for users.*.create branch and confirm it returns ignored for user emails.

3. Create one doctor from admin and verify exactly one welcome email is received.
