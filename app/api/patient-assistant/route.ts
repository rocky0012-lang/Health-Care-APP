import { NextResponse } from "next/server"
import { z } from "zod"
import { ExecutionMethod } from "node-appwrite"

import { listPatientAppointments } from "@/lib/actions/appointment.action"
import { functions } from "@/lib/appwrite.config"
import {
  getPatientBillingPreferences,
  getPatientByUserId,
  getPatientSavedPaymentMethod,
  listPatientDiagnoses,
  listPatientPrescriptions,
  listPatientVitals,
} from "@/lib/actions/patient.action"

const patientAssistantInstructions = `You are the official NetCareFlow Virtual Assistant. You assist authenticated patients within their private portal. 

Your goals are:
1. Help patients understand our services (Cardiology, Pediatrics, Diagnostic Lab).
2. Assist with the booking process by directing users to the /login or /signup pages.
3. Provide general information about our facility.

CONTEXT & DATA:
- Institution: NetCareFlow, located at 123 Medical Plaza, Nairobi.
- Hours: Mon-Fri (8AM-6PM).
- Specialists: Dr. Sarah Johnson (Cardiology), Dr. Francis (General Physician), Dr. Amina (Pediatrics).
- Services: Cardiology, Pediatrics, Laboratory (Blood tests/Scanning).
- Pricing: Consultations ($50), Blood Tests (from $30), Ultrasound (from $80).


STRICT RULES:
1. NO MEDICAL ADVICE: Do not provide diagnoses, prescriptions, or treatment plans.
2. EMERGENCIES: If symptoms suggest an emergency, immediately advise calling local emergency services and visiting 123 Medical Plaza.
3. DATA INTEGRITY: Use only provided context; do not invent facts.
4. TONE: Professional, concise, and supportive.
5. FORMATTING: Return responses in JSON format only.
6. PRIVACY: Do not ask for or store any personal health information.

If you don't know the answer to a specific question, ask the user to contact our support team at support@netcareflow.com.`

const requestSchema = z.object({
  userId: z.string().trim().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1),
      })
    )
    .max(12),
})

type AssistantMatch = {
  title: string
  detail: string
  badge?: string
}

type AssistantPayload = {
  reply: string
  suggestedFilter?: string
  matches?: AssistantMatch[]
  isFallback?: boolean
}

type SnapshotAppointment = {
  date: any
  time: any
  status: any
  reason: any
  doctor: string
}

const DEFAULT_BILLING_PREFERENCES: PatientBillingPreferences = {
  savePaymentMethod: true,
  emailReceipt: true,
  updatedAt: new Date(0).toISOString(),
}

function safeText(value?: string) {
  return value?.trim() || ""
}

function isUpcomingAppointment(appointment: Record<string, any>) {
  const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null

  return Boolean(
    appointmentDate &&
      !Number.isNaN(appointmentDate.getTime()) &&
      appointmentDate >= new Date() &&
      appointment.status !== "cancelled" &&
      appointment.status !== "no-show"
  )
}

function buildSnapshot(
  patient: Awaited<ReturnType<typeof getPatientByUserId>>,
  appointments: Record<string, any>[],
  vitals: Record<string, any>[],
  diagnoses: Record<string, any>[],
  prescriptions: Record<string, any>[],
  billingPreferences: Awaited<ReturnType<typeof getPatientBillingPreferences>>,
  savedPaymentMethod: Awaited<ReturnType<typeof getPatientSavedPaymentMethod>>
) {
  const toSnapshotAppointment = (appointment: Record<string, any>): SnapshotAppointment => ({
    date: appointment.appointment_date,
    time: appointment.time_slot,
    status: appointment.status,
    reason: appointment.reason_for_visit,
    doctor: appointment.doctorDetails?.fullName || appointment.doctorDetails?.name || "Your doctor",
  })

  const recordSections = patient
    ? [
        { label: "Allergies", value: safeText(patient.allergies) },
        { label: "Current medication", value: safeText(patient.currentMedication) },
        { label: "Family history", value: safeText(patient.familyMedicalHistory) },
        { label: "Past history", value: safeText(patient.pastMedicalHistory) },
        { label: "Insurance provider", value: safeText(patient.insuranceProvider) },
        { label: "Policy number", value: safeText(patient.insurancePolicyNumber) },
        { label: "Identification", value: safeText(patient.identificationNumber) },
        { label: "Emergency contact", value: safeText(patient.emergencyContactName) || safeText(patient.emergencyContactNumber) },
        { label: "Primary physician", value: safeText(patient.primaryPhysician) },
      ]
    : []

  return {
    patient: patient
      ? {
          name: safeText(patient.name),
          accountStatus: patient.accountStatus || "active",
          accountStatusMessage: safeText(patient.accountStatusMessage),
          privacyConsent: Boolean(patient.privacyConsent),
          recordCompletion: recordSections.length
            ? Math.round((recordSections.filter((section) => section.value).length / recordSections.length) * 100)
            : 0,
          missingProfileItems: recordSections.filter((section) => !section.value).map((section) => section.label),
        }
      : null,
    appointments: {
      upcoming: appointments.filter(isUpcomingAppointment).slice(0, 5).map(toSnapshotAppointment),
      recent: appointments.slice(0, 5).map(toSnapshotAppointment),
    },
    vitals: vitals.slice(0, 4).map((entry) => ({
      recordedAt: entry.recordedAt,
      bloodPressure:
        [entry.bloodPressureSystolic, entry.bloodPressureDiastolic].every(Boolean)
          ? `${entry.bloodPressureSystolic}/${entry.bloodPressureDiastolic}`
          : "",
      heartRate: entry.heartRate,
      temperatureCelsius: entry.temperatureCelsius,
      oxygenSaturation: entry.oxygenSaturation,
      notes: safeText(entry.notes),
    })),
    diagnoses: diagnoses.slice(0, 6).map((entry) => ({
      diagnosisName: entry.diagnosisName,
      status: entry.status,
      diagnosedAt: entry.diagnosedAt,
      notes: safeText(entry.notes),
    })),
    prescriptions: prescriptions.slice(0, 6).map((entry) => ({
      medicationName: entry.medicationName,
      dosage: entry.dosage,
      frequency: entry.frequency,
      status: entry.status,
      prescribedAt: entry.prescribedAt,
      instructions: safeText(entry.instructions),
      duration: safeText(entry.duration),
    })),
    billing: {
      savePaymentMethod: billingPreferences?.savePaymentMethod !== false,
      emailReceipt: billingPreferences?.emailReceipt !== false,
      paymentMethod: savedPaymentMethod
        ? {
            method: savedPaymentMethod.method,
            brand: savedPaymentMethod.brand,
            last4: savedPaymentMethod.last4 || "",
            updatedAt: savedPaymentMethod.updatedAt,
          }
        : null,
    },
  }
}

function getLocalAssistantReply(message: string, snapshot: ReturnType<typeof buildSnapshot>): AssistantPayload {
  const normalizedMessage = message.toLowerCase()
  const matches: AssistantMatch[] = []
  let suggestedFilter = "Overview"
  let reply = "I reviewed your care snapshot and pulled the most relevant items together."

  if (/appointment|visit|schedule|book|coming up/.test(normalizedMessage)) {
    suggestedFilter = "Appointments"
    const items: SnapshotAppointment[] =
      snapshot.appointments.upcoming.length > 0 ? snapshot.appointments.upcoming : snapshot.appointments.recent

    reply = items.length
      ? "Here are the appointments I found that match your question."
      : "I could not find any appointments in your recent care history."

    items.slice(0, 3).forEach((item) => {
      matches.push({
        title: `${item.reason || "Appointment"} · ${item.status}`,
        detail: `${item.date || "Date unavailable"}${item.time ? ` at ${item.time}` : ""}${item.doctor ? ` · ${item.doctor}` : ""}`,
        badge: "visit",
      })
    })
  } else if (/medication|medicine|prescription|drug/.test(normalizedMessage)) {
    suggestedFilter = "Prescriptions"
    const items = snapshot.prescriptions.filter((item) => item.status === "active")

    reply = items.length
      ? "These are the prescriptions I found in your active medication list."
      : "I could not find an active prescription in your records."

    items.slice(0, 4).forEach((item) => {
      matches.push({
        title: item.medicationName,
        detail: `${item.dosage} · ${item.frequency}${item.duration ? ` · ${item.duration}` : ""}`,
        badge: item.status,
      })
    })
  } else if (/allerg|condition|diagnos|problem|history|record/.test(normalizedMessage)) {
    suggestedFilter = "Records"
    const items = [
      ...(snapshot.patient?.missingProfileItems.map((item) => ({
        title: `Missing: ${item}`,
        detail: "This profile section is still empty.",
        badge: "update",
      })) || []),
      ...snapshot.diagnoses.slice(0, 4).map((item) => ({
        title: item.diagnosisName,
        detail: `${item.status}${item.notes ? ` · ${item.notes}` : ""}`,
        badge: "diagnosis",
      })),
    ]

    reply = snapshot.patient?.missingProfileItems.length
      ? "I found some record areas that still need attention and some existing clinical entries you can review."
      : "Your profile is reasonably complete. I pulled the clinical items that look most relevant."

    matches.push(...items.slice(0, 5))
  } else if (/bill|payment|receipt|insurance|policy/.test(normalizedMessage)) {
    suggestedFilter = "Billing"
    reply = snapshot.billing.savePaymentMethod
      ? "Your billing preferences are enabled for receipts and saved payment methods."
      : "Your billing settings currently avoid saving payment methods."

    if (snapshot.billing.paymentMethod) {
      matches.push({
        title: snapshot.billing.paymentMethod.brand || "Saved payment method",
        detail: `${snapshot.billing.paymentMethod.method}${snapshot.billing.paymentMethod.last4 ? ` ending in ${snapshot.billing.paymentMethod.last4}` : ""}`,
        badge: "billing",
      })
    }

    if (
      snapshot.patient?.missingProfileItems.includes("Insurance provider") ||
      snapshot.patient?.missingProfileItems.includes("Policy number")
    ) {
      matches.push({
        title: "Insurance details missing",
        detail: "Insurance provider or policy number has not been filled in yet.",
        badge: "update",
      })
    }
  } else if (/update|missing|complete|fill|profile/.test(normalizedMessage)) {
    suggestedFilter = "Profile"
    const items = snapshot.patient?.missingProfileItems || []

    reply = items.length
      ? "These are the profile sections that still need updates."
      : "Your profile fields look complete from what I can see."

    items.slice(0, 6).forEach((item) => {
      matches.push({
        title: `Missing: ${item}`,
        detail: "Add this to improve care guidance and record matching.",
        badge: "profile",
      })
    })
  } else {
    reply = "I can help with appointments, prescriptions, records, billing, and what still needs to be updated in your profile."
    matches.push(
      {
        title: "Profile completion",
        detail: `${snapshot.patient?.recordCompletion || 0}% complete`,
        badge: "profile",
      },
      ...snapshot.appointments.upcoming.slice(0, 2).map((item) => ({
        title: item.reason || "Upcoming appointment",
        detail: `${item.date || "Date unavailable"}${item.time ? ` at ${item.time}` : ""}`,
        badge: "visit",
      }))
    )
  }

  return {
    reply,
    suggestedFilter,
    matches,
    isFallback: true,
  }
}

async function getAiAssistantReply(message: string, snapshot: ReturnType<typeof buildSnapshot>): Promise<AssistantPayload> {
  const functionId = process.env.AI_SUPPORT_FUNCTION_ID || process.env.APPWRITE_AI_SUPPORT_FUNCTION_ID || ""

  if (!functionId) {
    return getLocalAssistantReply(message, snapshot)
  }

  const execution = await functions.createExecution({
    functionId,
    async: false,
    method: ExecutionMethod.POST,
    body: JSON.stringify({
      question: message,
      instructions: patientAssistantInstructions,
      snapshot,
    }),
  })

  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    console.error("ai-support function execution failed", {
      status: execution.responseStatusCode,
      errors: execution.errors,
      logs: execution.logs,
    })
    return getLocalAssistantReply(message, snapshot)
  }

  try {
    const parsed = JSON.parse(execution.responseBody || "{}") as AssistantPayload

    return {
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : getLocalAssistantReply(message, snapshot).reply,
      suggestedFilter: typeof parsed.suggestedFilter === "string" ? parsed.suggestedFilter : undefined,
      matches: Array.isArray(parsed.matches)
        ? parsed.matches
            .filter((match): match is AssistantMatch => Boolean(match && typeof match.title === "string" && typeof match.detail === "string"))
            .slice(0, 6)
        : undefined,
      isFallback: false,
    }
  } catch {
    return getLocalAssistantReply(message, snapshot)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assistant request." }, { status: 400 })
    }

    const { userId, messages } = parsed.data
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || ""

    const [patientResult, appointmentsResult, vitalsResult, diagnosesResult, prescriptionsResult, billingPreferencesResult, savedPaymentMethodResult] =
      await Promise.allSettled([
        getPatientByUserId(userId),
        listPatientAppointments(userId, 12),
        listPatientVitals(userId, 8),
        listPatientDiagnoses(userId, 8),
        listPatientPrescriptions(userId, 8),
        getPatientBillingPreferences(userId),
        getPatientSavedPaymentMethod(userId),
      ])

    const patient = patientResult.status === "fulfilled" ? patientResult.value : null
    const appointments = appointmentsResult.status === "fulfilled" ? appointmentsResult.value : []
    const vitals = vitalsResult.status === "fulfilled" ? vitalsResult.value : []
    const diagnoses = diagnosesResult.status === "fulfilled" ? diagnosesResult.value : []
    const prescriptions = prescriptionsResult.status === "fulfilled" ? prescriptionsResult.value : []
    const billingPreferences =
      billingPreferencesResult.status === "fulfilled"
        ? billingPreferencesResult.value
        : DEFAULT_BILLING_PREFERENCES
    const savedPaymentMethod =
      savedPaymentMethodResult.status === "fulfilled" ? savedPaymentMethodResult.value || null : null

    if (!patient) {
      return NextResponse.json(
        {
          reply:
            "I could not load your patient record right now, but the care assistant is still available. Please try again in a moment or contact support if the issue continues.",
          suggestedFilter: "Support",
          matches: [],
          isFallback: true,
        },
        { status: 200 }
      )
    }

    const snapshot = buildSnapshot(
      patient,
      appointments || [],
      vitals || [],
      diagnoses || [],
      prescriptions || [],
      billingPreferences,
      savedPaymentMethod
    )
    const assistantReply = await getAiAssistantReply(latestUserMessage, snapshot)

    return NextResponse.json(assistantReply)
  } catch (error) {
    console.error("patient-assistant route error:", error)

    return NextResponse.json(
      {
        reply:
          "The care assistant is having trouble reaching the care system right now. Please try again shortly, or contact support if you need help immediately.",
        suggestedFilter: "Support",
        matches: [],
        isFallback: true,
      },
      { status: 200 }
    )
  }
}