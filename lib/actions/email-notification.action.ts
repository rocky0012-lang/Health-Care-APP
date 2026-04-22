"use server"

import { ID } from "node-appwrite"

import { messaging } from "@/lib/appwrite.config"

const DEFAULT_EMAIL_LOGO_URL = "https://netcareflow.com/assets/icons/logo-full.svg.png"
const getEmailLogoHtml = () => `
  <div style="margin-bottom:18px; text-align:center;">
    <img src="${DEFAULT_EMAIL_LOGO_URL}" alt="NetCare Flow" style="width:175px; max-width:100%; height:auto; display:block; margin:0 auto 16px;" />
  </div>
`

const renderEmailFooter = (includeUnsubscribe = true) => `
  <div style="margin-top: 24px; background-color: #f8f9fa; padding: 30px 20px; border-top: 1px solid #e9ecef; text-align: center; font-family: 'Segoe UI', Arial, sans-serif;">
    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #333;">NetCare Flow Institution</p>
    <p style="margin: 0 0 20px 0; font-size: 12px; color: #777; line-height: 1.5;">123 Medical Plaza, Nairobi, Kenya<br />Questions? Contact us at <a href="mailto:support@netcareflow.com" style="color: #1a73e8; text-decoration: none;">support@netcareflow.com</a></p>
    ${includeUnsubscribe ? `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 20px;">
          <a href="mailto:support@netcareflow.com?subject=Unsubscribe%20from%20NetCare%20emails" style="background-color: #ffffff; border: 1px solid #d1d5db; color: #4b5563; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">UNSUBSCRIBE FROM THESE EMAILS</a>
        </td>
      </tr>
    </table>
    ` : `
    <p style="margin: 0 0 18px 0; font-size: 12px; color: #777; line-height: 1.6; max-width: 520px; margin-left: auto; margin-right: auto;">You are receiving this mandatory service announcement regarding your scheduled healthcare appointment. These messages are essential for your care and cannot be turned off.</p>
    `}
    <div style="font-size: 11px; color: #999;">
      <a href="https://netcareflow.com/privacy" style="color: #999; text-decoration: underline;">Privacy Policy</a>
      &nbsp;&bull;&nbsp;
      <a href="https://netcareflow.com/settings" style="color: #999; text-decoration: underline;">Notification Settings</a>
    </div>
    <p style="margin-top: 20px; font-size: 10px; color: #bbb; line-height: 1.4; max-width: 500px; margin-left: auto; margin-right: auto;">CONFIDENTIALITY NOTICE: This message may contain protected health information. If you are not the intended recipient, please delete this email and notify the sender immediately.</p>
  </div>
`

async function sendEmailToUser({
  userId,
  subject,
  html,
}: {
  userId: string
  subject: string
  html: string
}) {
  if (!userId || !subject || !html) {
    return
  }

  await messaging.createEmail({
    messageId: ID.unique(),
    subject,
    content: html,
    users: [userId],
    html: true,
    draft: false,
  })
}

export async function sendPatientAccountCreatedEmail({
  userId,
  name,
}: {
  userId: string
  name?: string
}) {
  const safeName = (name || "Patient").trim() || "Patient"

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      ${getEmailLogoHtml()}
      <h2 style="margin: 0 0 12px;">Welcome to NetCare, ${safeName}</h2>
      <p style="margin: 0 0 8px;">Your patient account was created successfully.</p>
      <p style="margin: 0;">You can now complete your profile and book appointments from your dashboard.</p>
      ${renderEmailFooter(true)}
    </div>
  `

  await sendEmailToUser({
    userId,
    subject: "Your NetCare account was created",
    html,
  })
}

export async function sendPatientAppointmentCreatedEmail({
  userId,
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
  reason,
}: {
  userId: string
  patientName?: string
  doctorName?: string
  appointmentDate: string
  timeSlot: string
  reason: string
}) {
  const safePatientName = (patientName || "Patient").trim() || "Patient"
  const safeDoctorName = (doctorName || "Your doctor").trim() || "Your doctor"

  const dateObject = new Date(`${appointmentDate}T${timeSlot}:00`)
  const formattedDate = Number.isNaN(dateObject.getTime())
    ? `${appointmentDate} ${timeSlot}`
    : dateObject.toLocaleString()

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      ${getEmailLogoHtml()}
      <h2 style="margin: 0 0 12px;">Appointment confirmed</h2>
      <p style="margin: 0 0 8px;">Hi ${safePatientName},</p>
      <p style="margin: 0 0 8px;">Your appointment has been successfully scheduled. We\'ve reserved your time slot, and our team is ready to assist you.</p>
      <p style="margin: 0 0 8px;"><strong>Appointment Details:</strong></p>
      <ul style="margin: 0 0 8px 18px; padding: 0;">
        <li><strong>Reason/Service:</strong> ${reason}</li>
        <li><strong>Date:</strong> ${formattedDate}</li>
        <li><strong>Time:</strong> ${timeSlot}</li>
        <li><strong>Status:</strong> Confirmed ✅</li>
      </ul>
      <p style="margin: 0 0 8px;"><strong>What should I bring?</strong><br />Please ensure you have all necessary documentation ready for the verification process to avoid any delays.</p>
      <p style="margin: 0 0 8px;"><strong>Need to make a change?</strong><br />If you need to reschedule or cancel, please visit our portal or contact support at least 24 hours in advance.</p>
      <p style="margin: 0;">Best regards,<br />The NetCare Flow Team</p>
      ${renderEmailFooter(false)}
    </div>
  `

  await sendEmailToUser({
    userId,
    subject: "Your NetCare appointment is booked",
    html,
  })
}

export async function sendPatientAppointmentCancelledEmail({
  userId,
  patientName,
  appointmentDate,
  timeSlot,
  portalLink,
}: {
  userId: string
  patientName?: string
  appointmentDate: string
  timeSlot: string
  portalLink?: string
}) {
  const safePatientName = (patientName || "Patient").trim() || "Patient"
  const safePortalLink = portalLink?.trim() || "https://netcare.example.com/portal"
  const appointmentSource = appointmentDate.includes("T")
    ? appointmentDate
    : `${appointmentDate}T${timeSlot}:00`
  const appointmentDateObject = new Date(appointmentSource)
  const formattedDate = Number.isNaN(appointmentDateObject.getTime())
    ? [appointmentDate, timeSlot].filter(Boolean).join(" ")
    : appointmentDateObject.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      ${getEmailLogoHtml()}
      <h2 style="margin: 0 0 12px;">Update regarding your appointment on ${formattedDate}</h2>
      <p style="margin: 0 0 8px;">Hi ${safePatientName},</p>
      <p style="margin: 0 0 8px;">We are reaching out to let you know that we’ve had to cancel your upcoming appointment due to essential system optimizations aimed at improving our patient services.</p>
      <p style="margin: 0 0 8px;"><strong>What happens next?</strong></p>
      <p style="margin: 0 0 8px;">You can reschedule immediately via our portal here: <a href="${safePortalLink}">${safePortalLink}</a>, or wait for our coordinator to call you within 24 hours to find a new time that works for you.</p>
      <p style="margin: 0;">We apologize for this inconvenience and appreciate your patience as we improve our platform.</p>
      ${renderEmailFooter(false)}
    </div>
  `

  await sendEmailToUser({
    userId,
    subject: `Update regarding your appointment on ${formattedDate}`,
    html,
  })
}

export async function sendPatientAppointmentCompletedEmail({
  userId,
  patientName,
  doctorName,
  appointmentDate,
  portalLink,
}: {
  userId: string
  patientName?: string
  doctorName?: string
  appointmentDate: string
  portalLink?: string
}) {
  const safePatientName = (patientName || "Patient").trim() || "Patient"
  const safeDoctorName = (doctorName || "Your doctor").trim() || "Your doctor"
  const safePortalLink = portalLink?.trim() || "https://netcareflow.com/portal"
  const appointmentSource = appointmentDate.includes("T") ? appointmentDate : `${appointmentDate}`
  const appointmentDateObject = new Date(appointmentSource)
  const formattedDate = Number.isNaN(appointmentDateObject.getTime())
    ? appointmentSource
    : appointmentDateObject.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      ${getEmailLogoHtml()}
      <h2 style="margin: 0 0 12px;">Recap of your visit with Dr. ${safeDoctorName}</h2>
      <p style="margin: 0 0 8px;">Hi ${safePatientName},</p>
      <p style="margin: 0 0 8px;">Thank you for visiting us on ${formattedDate} — it was a pleasure seeing you.</p>
      <p style="margin: 0 0 8px;">We’ve updated your records with your treatment plan. A summary of your visit and any next steps are available in your patient portal.</p>
      <p style="margin: 0 0 8px;">If you have any questions or need support, feel free to reach out at any time.</p>
      <p style="margin: 0 0 8px;">Take care,</p>
      <p style="margin: 0;">NetCare Flow</p>
      <p style="margin: 0 0 8px;"><a href="${safePortalLink}">${safePortalLink}</a></p>
      ${renderEmailFooter(false)}
    </div>
  `

  await sendEmailToUser({
    userId,
    subject: `Recap of your visit with Dr. ${safeDoctorName}`,
    html,
  })
}

export async function sendDoctorWelcomeEmail({
  userId,
  doctorName,
  email,
  temporaryPassword,
  loginUrl,
}: {
  userId: string
  doctorName?: string
  email: string
  temporaryPassword: string
  loginUrl?: string
}) {
  const safeName = (doctorName || "Doctor").trim() || "Doctor"
  const safeLastName = safeName.split(/\s+/).filter(Boolean).slice(-1)[0] || safeName
  const safeLoginUrl = loginUrl?.trim() || "https://netcareflow.com/doctor/login"

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      ${getEmailLogoHtml()}
      <h2 style="margin: 0 0 12px;">Welcome to the Team! Your Account at Netcare Flow is Ready</h2>
      <p style="margin: 0 0 8px;">Dear Dr. ${safeLastName},</p>
      <p style="margin: 0 0 8px;">Congratulations on joining Netcare Flow! We are thrilled to have you with us.</p>
      <p style="margin: 0 0 8px;">Your practitioner account has been successfully created. You can now access the clinical dashboard to manage your schedule and patient records.</p>
      <p style="margin: 0 0 8px;"><strong>Your Login Credentials:</strong></p>
      <ul style="margin: 0 0 8px 18px; padding: 0;">
        <li><strong>Login URL:</strong> <a href="${safeLoginUrl}">${safeLoginUrl}</a></li>
        <li><strong>Username:</strong> ${email}</li>
        <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
      </ul>
      <p style="margin: 0 0 8px;"><strong>Security Note:</strong> For your protection, please log in as soon as possible and update your password under the "Account Settings" tab or change your password via the link provided.</p>
      <p style="margin: 0 0 8px;">We look forward to your contributions to the team. If you encounter any issues logging in, please contact the IT support desk.</p>
      <p style="margin: 0;">Best regards,<br />Medical Administration Team<br />NetCare Flow</p>
      ${renderEmailFooter(true)}
    </div>
  `

  await sendEmailToUser({
    userId,
    subject: "Welcome to the Team! Your Account at Netcare Flow is Ready",
    html,
  })
}
