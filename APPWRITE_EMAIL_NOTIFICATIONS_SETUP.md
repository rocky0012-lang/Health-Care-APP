# Appwrite Manual Setup: Patient Emails

This project now sends emails directly from server actions and also includes an optional Appwrite Function handler.

## What Is Already Implemented In Code

- Account-created email trigger:
  - [lib/actions/patient.action.ts](lib/actions/patient.action.ts)
- Appointment-created email trigger:
  - [lib/actions/appointment.action.ts](lib/actions/appointment.action.ts)
- Shared email sender helpers:
  - [lib/actions/email-notification.action.ts](lib/actions/email-notification.action.ts)
- Optional Appwrite Function handler:
  - [appwrite/functions/patient-notifications/index.js](appwrite/functions/patient-notifications/index.js)

## 1. Configure Appwrite Messaging Provider (Required)

1. Open Appwrite Console.
2. Go to Messaging -> Providers.
3. Add one provider (Mailgun / SMTP / Sendgrid / Resend).
4. Set:
   - Sender name: NetCare
   - Sender email: your verified sender address
5. Enable the provider.
6. Send a test email from provider settings.

## 2. Make Sure Environment Variables Exist In Your App

In your project `.env.local`, confirm:

- `NEXT_PUBLIC_ENDPOINT` (already used)
- `PROJECT_ID` (already used)
- `API_KEY` (already used by server actions)

Because this repo already exports `messaging` from [lib/appwrite.config.ts](lib/appwrite.config.ts), no extra code env var is required for direct action-based notifications.

## 3. Optional: Deploy Function-Based Notifications In Appwrite Console

Use this if you want event-driven emails from Appwrite events.

1. Go to Functions -> Create Function
   - Name: `patient-notifications`
   - Runtime: Node.js
2. Upload code from [appwrite/functions/patient-notifications/index.js](appwrite/functions/patient-notifications/index.js)
3. Add function environment variables:
   - `APPWRITE_FUNCTION_ENDPOINT` = your Appwrite endpoint
   - `APPWRITE_FUNCTION_PROJECT_ID` = your project ID
   - `APPWRITE_FUNCTION_API_KEY` = API key with messaging/users/database read scopes
   - `DATABASE_ID` = your database ID
   - `PATIENT_TABLE_ID` = your patient table ID
   - `APPOINTMENT_TABLE_ID` = your appointments table ID value
4. Add trigger events:
   - `users.*.create`
   - `databases.*.tables.<APPOINTMENT_TABLE_ID>.rows.*.create`
5. Deploy and run test events.

## 4. Recommended Scope Permissions For Function API Key

- `users.read`
- `rows.read` (or table/database read equivalent for your Appwrite version)
- `messaging.write`

## 5. Manual Test Checklist

1. Create a new patient account from signup page.
   - Expect: account-created email.
2. Create a patient appointment from dashboard.
   - Expect: appointment-created email.
3. Check Appwrite logs:
   - Functions logs (if using function triggers)
   - Messaging delivery logs

## Notes

- Email failures are non-blocking in app actions, so account/appointment creation still succeeds even if mail provider is temporarily down.
- If both direct action emails and function triggers are enabled simultaneously, you may receive duplicate emails. Use one strategy or add deduplication.
