"use server"

import { ID } from "node-appwrite"

import { messaging } from "@/lib/appwrite.config"

const DEFAULT_EMAIL_LOGO_URL = "https://netcareflow.com/assets/icons/logo-full.svg.png"
const getEmailLogoHtml = () => `
  <div style="margin-bottom:18px; text-align:center;">
    <img src="${DEFAULT_EMAIL_LOGO_URL}" alt="NetCare Flow" style="width:175px; max-width:100%; height:auto; display:block; margin:0 auto 16px;" />
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
      <p style="margin: 0 0 8px;">Hi ${safePatientName}, your appointment has been created successfully.</p>
      <ul style="margin: 0 0 8px 18px; padding: 0;">
        <li><strong>Doctor:</strong> ${safeDoctorName}</li>
        <li><strong>Date & time:</strong> ${formattedDate}</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>
      <p style="margin: 0;">Please arrive a few minutes early for check-in.</p>
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
    </div>
  `

  await sendEmailToUser({
    userId,
    subject: "Welcome to the Team! Your Account at Netcare Flow is Ready",
    html,
  })
}
