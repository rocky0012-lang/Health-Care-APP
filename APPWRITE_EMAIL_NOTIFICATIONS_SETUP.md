# Appwrite Manual Setup: Patient Emails (Function-First)

This project is configured for function-driven email delivery to avoid duplicate sends.

## What Is Already Implemented In Code

- Appwrite function handler:
   - [appwrite/functions/patient-notifications/index.js](appwrite/functions/patient-notifications/index.js)
- Function package metadata:
   - [appwrite/functions/patient-notifications/package.json](appwrite/functions/patient-notifications/package.json)

## 1. Configure Appwrite Messaging Provider (Required)

1. Open Appwrite Console.
2. Go to Messaging -> Providers.
3. Add one provider (Mailgun / SMTP / Sendgrid / Resend).
4. Set:
   - Sender name: NetCare
   - Sender email: your verified sender address
5. Enable the provider.
6. Send a test email from provider settings.

## 2. Deploy Function-Based Notifications In Appwrite Console

1. Go to Functions -> Create Function
   - Name: `patient-notifications`
   - Runtime: Node.js
2. Upload both files:
   - [appwrite/functions/patient-notifications/index.js](appwrite/functions/patient-notifications/index.js)
   - [appwrite/functions/patient-notifications/package.json](appwrite/functions/patient-notifications/package.json)
3. Add function environment variables:
   - `APPWRITE_FUNCTION_ENDPOINT` = your Appwrite endpoint
   - `APPWRITE_FUNCTION_PROJECT_ID` = your project ID
   - `APPWRITE_FUNCTION_API_KEY` = API key with messaging/users/database read scopes
   - `DATABASE_ID` = your database ID
   - `PATIENT_TABLE_ID` = your patient table ID
   - `APPOINTMENT_TABLE_ID` = your appointments table ID value
4. Add trigger events:
   - `users.*.create`
   - `databases.69c90b4400393bb1bace.tables.appointment.rows.*.create`
5. Deploy and run test events.

## 3. Recommended Scope Permissions For Function API Key

- `users.read`
- `rows.read` (or table/database read equivalent for your Appwrite version)
- `messaging.write`

## 4. Manual Test Checklist

1. Create a new patient account from signup page.
   - Expect: account-created email.
2. Create a patient appointment from dashboard.
   - Expect: appointment-created email.
3. Check Appwrite logs:
   - Functions logs (if using function triggers)
   - Messaging delivery logs

## Notes

- If no email is sent, first verify that the function received the event in function logs.
- If function logs show success but no mail is delivered, verify provider API key and sender/domain verification in Messaging -> Providers.
