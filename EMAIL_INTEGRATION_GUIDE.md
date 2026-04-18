# Email Integration Guide

## Logo Fix & Patient Email Implementation

### ✅ What's Fixed

1. **Logo Display Issue**: 
   - Changed from inline image URLs to a centralized `LOGO_URL` constant
   - Uses `NEXT_PUBLIC_APP_URL` from `.env.local` (https://netcareflow.com)
   - Logo URL: `https://netcareflow.com/assets/icons/logo-full.svg.png`
   - Updated to use HTML table-based email layout (better email client compatibility)

2. **Email Templates Improved**:
   - All emails now use responsive HTML table layout
   - Logo appears at the top of every email (150px × 26px)
   - Better mobile compatibility with viewport meta tags
   - Professional styling with proper spacing and colors

### 📧 Available Email Functions

#### Doctor Emails
- `sendDoctorWelcomeEmail()` - Welcome email when doctor account is created
- `sendEmail()` with password reset template - Password reset emails

#### Patient Emails (New)
- `sendPatientWelcomeEmail()` - Welcome when patient creates account
- `sendAppointmentConfirmationEmail()` - When appointment is booked
- `sendAppointmentReminderEmail()` - Before appointment (24 hours)

### 🔧 Implementation Examples

#### Send Patient Welcome Email
```typescript
import { sendPatientWelcomeEmail } from "@/lib/email";

await sendPatientWelcomeEmail({
  patientName: "John Doe",
  email: "john@example.com",
});
```

#### Send Appointment Confirmation
```typescript
import { sendAppointmentConfirmationEmail } from "@/lib/email";

await sendAppointmentConfirmationEmail({
  patientName: "John Doe",
  email: "john@example.com",
  doctorName: "Dr. Smith",
  appointmentDate: "April 25, 2026",
  appointmentTime: "2:00 PM",
});
```

#### Send Appointment Reminder
```typescript
import { sendAppointmentReminderEmail } from "@/lib/email";

await sendAppointmentReminderEmail({
  patientName: "John Doe",
  email: "john@example.com",
  doctorName: "Dr. Smith",
  appointmentDate: "April 25, 2026",
  appointmentTime: "2:00 PM",
});
```

### 📝 Where to Add These Calls

1. **Patient Welcome** - In `lib/actions/patient.action.ts` when patient registers
2. **Appointment Confirmation** - In `lib/actions/appointment.action.ts` after booking
3. **Appointment Reminder** - In a scheduled job or API endpoint (triggered 24 hours before)

### 🎨 Email Styling

All emails include:
- NetCare logo at the top (150px × 26px)
- Blue accent color (#2563eb) for headers and buttons
- Responsive design for mobile devices
- Professional table-based layout for email client compatibility
- Proper spacing and typography

### ⚙️ Environment Configuration

Already configured in `.env.local`:
```
RESEND_API_KEY=re_E4eqf3Gy_FsWuWzAAJPMB5ZU5MNT1TKfX
NEXT_PUBLIC_APP_URL=https://netcareflow.com
```

The logo URL is automatically constructed as: `${NEXT_PUBLIC_APP_URL}/assets/icons/logo-full.svg.png`

### 📌 Next Steps

1. ✅ Update patient registration to send welcome email
2. ✅ Update appointment creation to send confirmation email
3. ✅ Set up a scheduled job for 24-hour appointment reminders
4. ✅ Add any additional email templates as needed

All emails now consistently display the NetCare logo properly across all email clients!