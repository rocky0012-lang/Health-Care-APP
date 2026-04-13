"use server"

import { ID } from "node-appwrite"

import { messaging } from "@/lib/appwrite.config"

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
