"use server"

import { ID, Query } from "node-appwrite"

import { APPOINTMENT_TABLE_ID, DATABASE_ID, tablesDB } from "@/lib/appwrite.config"
import { parseStringify } from "@/lib/utils"
import { getDoctorById, getDoctorByUserId, listDoctors } from "@/lib/actions/doctor.action"
import { getPatientById, getPatientByUserId, sendPatientNotification } from "@/lib/actions/patient.action"
import { sendPatientAppointmentCreatedEmail } from "@/lib/actions/email-notification.action"

function assertAppointmentConfig() {
  if (!DATABASE_ID || !APPOINTMENT_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or APPOINTMENT_TABLE_ID in environment")
  }
}

function isValidAppointmentStatus(status: string): status is Status {
  return ["scheduled", "confirmed", "completed", "cancelled", "no-show"].includes(status)
}

function normalizeMessage(value?: string) {
  return value?.trim() || ""
}

const CANCELLATION_REASON_MARKER = "[[CANCELLATION_REASON]]"

function splitAppointmentNotes(rawNotes: unknown) {
  const normalizedNotes = typeof rawNotes === "string" ? rawNotes : ""
  const markerIndex = normalizedNotes.lastIndexOf(CANCELLATION_REASON_MARKER)

  if (markerIndex === -1) {
    return {
      notes: normalizedNotes,
      cancellationReason: null as string | null,
    }
  }

  const notes = normalizedNotes.slice(0, markerIndex).trimEnd()
  const cancellationReason = normalizedNotes
    .slice(markerIndex + CANCELLATION_REASON_MARKER.length)
    .trim()

  return {
    notes,
    cancellationReason: cancellationReason || null,
  }
}

function buildAppointmentNotes(notes: string, cancellationReason?: string) {
  const normalizedNotes = normalizeMessage(notes)
  const normalizedCancellationReason = normalizeMessage(cancellationReason)

  if (!normalizedCancellationReason) {
    return normalizedNotes
  }

  return normalizedNotes
    ? `${normalizedNotes}\n\n${CANCELLATION_REASON_MARKER} ${normalizedCancellationReason}`
    : `${CANCELLATION_REASON_MARKER} ${normalizedCancellationReason}`
}

function getAppointmentStatusLabel(status: Status) {
  if (status === "no-show") {
    return "No-show"
  }

  if (status === "completed") {
    return "Completed"
  }

  if (status === "confirmed") {
    return "Confirmed"
  }

  if (status === "cancelled") {
    return "Cancelled"
  }

  return "Scheduled"
}

function getAppointmentNotificationTone(status: Status): DoctorNotificationTone {
  if (status === "cancelled" || status === "no-show") {
    return "warning"
  }

  if (status === "completed") {
    return "success"
  }

  return "default"
}

function formatAppointmentSummary(appointment: Record<string, any>) {
  const appointmentDate =
    typeof appointment.appointment_date === "string" ? new Date(appointment.appointment_date) : null

  if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
    return appointment.time_slot ? `at ${appointment.time_slot}` : ""
  }

  return `for ${appointmentDate.toLocaleDateString()} at ${appointment.time_slot || appointmentDate.toLocaleTimeString()}`
}

async function notifyPatientAboutAppointmentStatus({
  appointment,
  patientUserId,
  actorRole,
  actorDoctorName,
  cancellationReason,
}: {
  appointment: Record<string, any>
  patientUserId: string
  actorRole: "admin" | "doctor"
  actorDoctorName?: string
  cancellationReason?: string
}) {
  const actorName = actorRole === "doctor" ? actorDoctorName || "Your doctor" : "Clinic admin"
  const statusLabel = getAppointmentStatusLabel(appointment.status)
  const summary = formatAppointmentSummary(appointment)
  const reasonText = cancellationReason ? ` Reason: ${cancellationReason}` : ""

  await sendPatientNotification({
    userId: patientUserId,
    title: `Appointment ${statusLabel.toLowerCase()}`,
    message:
      appointment.status === "cancelled"
        ? `${actorName} cancelled your appointment ${summary}.${reasonText}`.trim()
        : appointment.status === "completed"
          ? `${actorName} marked your appointment ${summary} as completed.`
          : appointment.status === "no-show"
            ? `${actorName} marked your appointment ${summary} as a no-show.`
            : `${actorName} updated your appointment ${summary} to ${statusLabel.toLowerCase()}.`,
    kind: "appointment-update",
    tone: getAppointmentNotificationTone(appointment.status),
  })
}

async function withAppointmentRelations<T extends Record<string, any>>(appointment: T | null) {
  if (!appointment) {
    return null
  }

  const doctorReference = typeof appointment.doctor === "string" ? appointment.doctor : appointment.doctor?.$id
  const patientReference = typeof appointment.patient === "string" ? appointment.patient : appointment.patient?.$id
  const doctor = doctorReference ? await getDoctorById(doctorReference) : null
  const patient = patientReference ? await getPatientById(patientReference) : null

  return {
    ...appointment,
    doctor,
    patient,
    doctorDetails: doctor
      ? {
          id: doctor.$id,
          fullName: doctor.name || doctor.fullName,
          avatarUrl: doctor.avatarUrl || "",
          specialty: doctor.specialization || doctor.specialty || "",
        }
      : null,
    patientDetails: patient
      ? {
          id: patient.$id,
          fullName: patient.name || "Patient",
          avatarUrl: patient.avatarUrl || "",
          phone: patient.phone || "",
        }
      : null,
  }
}

function serializeAppointment<T extends Record<string, any>>(appointment: T | null) {
  if (!appointment) {
    return null
  }

  const resolvedNotesSource =
    typeof appointment.notes === "string"
      ? appointment.notes
      : typeof appointment.note === "string"
        ? appointment.note
        : ""
  const { notes: visibleNotes, cancellationReason } = splitAppointmentNotes(resolvedNotesSource)

  return parseStringify({
    ...appointment,
    appointment_date:
      typeof appointment.appointment_date === "string"
        ? appointment.appointment_date
        : appointment.schedule
          ? new Date(appointment.schedule).toISOString()
          : "",
    time_slot:
      typeof appointment.time_slot === "string"
        ? appointment.time_slot
        : typeof appointment.schedule === "string"
          ? new Date(appointment.schedule).toISOString().slice(11, 16)
          : "",
    reason_for_visit:
      typeof appointment.reason_for_visit === "string"
        ? appointment.reason_for_visit
        : appointment.reason || "",
    notes:
      visibleNotes,
    cancellationReason,
    booking_channel:
      appointment.booking_channel === "mobile" ||
      appointment.booking_channel === "phone"
        ? appointment.booking_channel
        : "web",
  })
}

export const createAppointment = async ({
  patientUserId,
  doctorId,
  appointmentDate,
  timeSlot,
  status,
  reasonForVisit,
  notes,
  bookingChannel,
}: CreateAppointmentParams) => {
  assertAppointmentConfig()

  const normalizedDate = appointmentDate.trim()
  const normalizedTimeSlot = timeSlot.trim()
  const normalizedReason = reasonForVisit.trim()
  const normalizedNotes = notes?.trim() || ""

  if (!patientUserId) {
    throw new Error("Missing patient account for appointment booking.")
  }

  if (!doctorId) {
    throw new Error("Select a doctor before creating the appointment.")
  }

  if (!normalizedDate) {
    throw new Error("Choose an appointment date.")
  }

  if (!normalizedTimeSlot) {
    throw new Error("Choose a time slot.")
  }

  if (!normalizedReason) {
    throw new Error("Enter a reason for your visit.")
  }

  if (bookingChannel !== "web" && bookingChannel !== "mobile" && bookingChannel !== "phone") {
    throw new Error("Invalid booking channel.")
  }

  if (!isValidAppointmentStatus(status)) {
    throw new Error("Invalid appointment status.")
  }

  const [patient, doctor] = await Promise.all([
    getPatientByUserId(patientUserId),
    getDoctorById(doctorId),
  ])

  if (!patient) {
    throw new Error("No patient profile was found for this account.")
  }

  if (!doctor) {
    throw new Error("Selected doctor record could not be found.")
  }

  const appointmentDateTime = new Date(`${normalizedDate}T${normalizedTimeSlot}:00`)

  if (Number.isNaN(appointmentDateTime.getTime())) {
    throw new Error("Choose a valid appointment date and time.")
  }

  const createdAppointment = await tablesDB.createRow({
    databaseId: DATABASE_ID!,
    tableId: APPOINTMENT_TABLE_ID!,
    rowId: ID.unique(),
    data: {
      appointment_date: appointmentDateTime.toISOString(),
      time_slot: normalizedTimeSlot,
      status,
      reason_for_visit: normalizedReason,
      notes: normalizedNotes,
      booking_channel: bookingChannel,
      patient: patient.$id,
      doctor: doctor.$id,
    },
  })

  try {
    await sendPatientAppointmentCreatedEmail({
      userId: patientUserId,
      patientName: patient.name,
      doctorName: doctor.name || doctor.fullName,
      appointmentDate: normalizedDate,
      timeSlot: normalizedTimeSlot,
      reason: normalizedReason,
    })
  } catch (notificationError) {
    console.error("Appointment creation email notification failed:", notificationError)
  }

  return serializeAppointment(await withAppointmentRelations(createdAppointment))
}

export const listPatientAppointments = async (patientUserId: string, limit = 25) => {
  assertAppointmentConfig()

  if (!patientUserId) {
    return []
  }

  const patient = await getPatientByUserId(patientUserId)

  if (!patient) {
    return []
  }

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID!,
    tableId: APPOINTMENT_TABLE_ID!,
    queries: [Query.equal("patient", [patient.$id]), Query.orderDesc("appointment_date"), Query.limit(limit)],
  })

  const appointmentsWithRelations = await Promise.all(
    response.rows.map((appointment) => withAppointmentRelations(appointment))
  )

  return appointmentsWithRelations
    .map((appointment) => serializeAppointment(appointment))
    .filter((appointment): appointment is NonNullable<typeof appointment> => Boolean(appointment))
}

export const listAppointments = async (limit = 100) => {
  assertAppointmentConfig()

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID!,
    tableId: APPOINTMENT_TABLE_ID!,
    queries: [Query.orderDesc("appointment_date"), Query.limit(limit)],
  })

  const appointmentsWithRelations = await Promise.all(
    response.rows.map((appointment) => withAppointmentRelations(appointment))
  )

  return appointmentsWithRelations
    .map((appointment) => serializeAppointment(appointment))
    .filter((appointment): appointment is NonNullable<typeof appointment> => Boolean(appointment))
}

export const listDoctorAppointments = async (doctorUserId: string, limit = 100) => {
  assertAppointmentConfig()

  if (!doctorUserId) {
    return []
  }

  const doctor = await getDoctorByUserId(doctorUserId)

  if (!doctor) {
    return []
  }

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID!,
    tableId: APPOINTMENT_TABLE_ID!,
    queries: [Query.equal("doctor", [doctor.$id]), Query.orderDesc("appointment_date"), Query.limit(limit)],
  })

  const appointmentsWithRelations = await Promise.all(
    response.rows.map((appointment) => withAppointmentRelations(appointment))
  )

  return appointmentsWithRelations
    .map((appointment) => serializeAppointment(appointment))
    .filter((appointment): appointment is NonNullable<typeof appointment> => Boolean(appointment))
}

export const updateAppointmentStatus = async ({
  appointmentId,
  status,
  actorRole,
  actorDoctorUserId,
  cancellationReason,
}: {
  appointmentId: string
  status: Status
  actorRole: "admin" | "doctor"
  actorDoctorUserId?: string
  cancellationReason?: string
}) => {
  assertAppointmentConfig()

  if (!appointmentId) {
    throw new Error("Missing appointment id.")
  }

  if (!isValidAppointmentStatus(status)) {
    throw new Error("Invalid appointment status.")
  }

  const appointment = await tablesDB.getRow({
    databaseId: DATABASE_ID!,
    tableId: APPOINTMENT_TABLE_ID!,
    rowId: appointmentId,
  })

  if (!appointment) {
    throw new Error("Appointment not found.")
  }

  const normalizedCancellationReason = normalizeMessage(cancellationReason)
  let actingDoctorName = ""
  const patientId = typeof appointment.patient === "string" ? appointment.patient : appointment.patient?.$id
  const patient = patientId ? await getPatientById(patientId) : null
  const existingNotesValue =
    typeof appointment.notes === "string"
      ? appointment.notes
      : typeof appointment.note === "string"
        ? appointment.note
        : ""
  const { notes: existingVisibleNotes } = splitAppointmentNotes(existingNotesValue)

  if (actorRole === "doctor") {
    if (!actorDoctorUserId) {
      throw new Error("Missing doctor account for appointment update.")
    }

    const doctor = await getDoctorByUserId(actorDoctorUserId)

    if (!doctor) {
      throw new Error("Doctor record not found.")
    }

    actingDoctorName = doctor.name || doctor.fullName || "Your doctor"

    const appointmentDoctorId = typeof appointment.doctor === "string" ? appointment.doctor : appointment.doctor?.$id

    if (appointmentDoctorId !== doctor.$id) {
      throw new Error("You can only update your own appointments.")
    }

    if (status === "cancelled" && normalizedCancellationReason.length < 10) {
      throw new Error("Provide a valid cancellation reason of at least 10 characters.")
    }
  }

  const updatedAppointment = await tablesDB.updateRow({
    databaseId: DATABASE_ID!,
    tableId: APPOINTMENT_TABLE_ID!,
    rowId: appointmentId,
    data: {
      status,
      notes:
        status === "cancelled"
          ? buildAppointmentNotes(existingVisibleNotes, normalizedCancellationReason)
          : buildAppointmentNotes(existingVisibleNotes),
    },
  })

  if (patient?.userId) {
    await notifyPatientAboutAppointmentStatus({
      appointment: updatedAppointment,
      patientUserId: patient.userId,
      actorRole,
      actorDoctorName: actingDoctorName,
      cancellationReason: status === "cancelled" ? normalizedCancellationReason : undefined,
    })
  }

  return serializeAppointment(await withAppointmentRelations(updatedAppointment))
}

export const sendDoctorMessageToPatient = async ({
  appointmentId,
  doctorUserId,
  message,
}: {
  appointmentId: string
  doctorUserId: string
  message: string
}) => {
  assertAppointmentConfig()

  if (!appointmentId) {
    throw new Error("Missing appointment id.")
  }

  if (!doctorUserId) {
    throw new Error("Missing doctor account.")
  }

  const normalizedMessage = normalizeMessage(message)

  if (normalizedMessage.length < 5) {
    throw new Error("Enter a patient message with at least 5 characters.")
  }

  const [appointment, doctor] = await Promise.all([
    tablesDB.getRow({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_TABLE_ID!,
      rowId: appointmentId,
    }),
    getDoctorByUserId(doctorUserId),
  ])

  if (!appointment) {
    throw new Error("Appointment not found.")
  }

  if (!doctor) {
    throw new Error("Doctor record not found.")
  }

  const appointmentDoctorId = typeof appointment.doctor === "string" ? appointment.doctor : appointment.doctor?.$id

  if (appointmentDoctorId !== doctor.$id) {
    throw new Error("You can only message patients assigned to your appointments.")
  }

  const patientId = typeof appointment.patient === "string" ? appointment.patient : appointment.patient?.$id
  const patient = patientId ? await getPatientById(patientId) : null

  if (!patient?.userId) {
    throw new Error("Patient record not found for this appointment.")
  }

  await sendPatientNotification({
    userId: patient.userId,
    title: `Message from ${doctor.name || doctor.fullName || "your doctor"}`,
    message: normalizedMessage,
    kind: "doctor-message",
    tone: "default",
  })

  return { delivered: true }
}

export const listActiveDoctorsForBooking = async () => {
  const doctors = await listDoctors(500)

  return doctors.filter((doctor) => (doctor.accountStatus || "active") === "active")
}