"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, CalendarClock, ChevronDown, ChevronUp, CircleAlert, FileClock, HeartPulse, Pencil, Pill, Ruler, ShieldCheck, Stethoscope, Thermometer, Trash2, Wind, X } from "lucide-react"

import { DoctorShell } from "@/components/doctor-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { listDoctorAppointments, sendDoctorMessageToPatient, updateAppointmentStatus } from "@/lib/actions/appointment.action"
import {
  createPatientDiagnosis,
  createPatientPrescription,
  createPatientVital,
  deletePatientDiagnosis,
  deletePatientPrescription,
  deletePatientVital,
  listAppointmentDiagnoses,
  listAppointmentPrescriptions,
  listAppointmentVitals,
  updatePatientDiagnosis,
  updatePatientPrescription,
  updatePatientVital,
} from "@/lib/actions/patient.action"
import { getCurrentDoctorUserId } from "@/lib/doctor-session"

type DoctorAppointmentRecord = Awaited<ReturnType<typeof listDoctorAppointments>>[number]
type AppointmentVitalRecord = Awaited<ReturnType<typeof listAppointmentVitals>>[number]
type AppointmentDiagnosisRecord = Awaited<ReturnType<typeof listAppointmentDiagnoses>>[number]
type AppointmentPrescriptionRecord = Awaited<ReturnType<typeof listAppointmentPrescriptions>>[number]

type AppointmentClinicalRecords = {
  vitals: AppointmentVitalRecord[]
  diagnoses: AppointmentDiagnosisRecord[]
  prescriptions: AppointmentPrescriptionRecord[]
}

type VitalDraft = {
  recordedAt: string
  bloodPressureSystolic: string
  bloodPressureDiastolic: string
  heartRate: string
  temperatureCelsius: string
  respiratoryRate: string
  oxygenSaturation: string
  weightKg: string
  heightCm: string
  notes: string
}

type DiagnosisDraft = {
  diagnosisName: string
  status: PatientDiagnosisStatus
  diagnosedAt: string
  notes: string
}

type PrescriptionDraft = {
  medicationName: string
  dosage: string
  frequency: string
  status: PatientPrescriptionStatus
  prescribedAt: string
  duration: string
  instructions: string
}

type DeleteTarget = {
  kind: "vital" | "diagnosis" | "prescription"
  appointmentId: string
  recordId: string
  doctorId: string
  label: string
}

const appointmentStatusOptions: Array<{ value: Status; label: string }> = [
  { value: "confirmed", label: "Confirmed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No-show" },
]

function getStatusLabel(status: Status) {
  return appointmentStatusOptions.find((option) => option.value === status)?.label || status
}

function getStatusClass(status: Status) {
  if (status === "completed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
  }

  if (status === "confirmed") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
  }

  if (status === "no-show") {
    return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }

  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "PT"
  )
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function getAppointmentTimestamp(appointment: DoctorAppointmentRecord) {
  const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null

  if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
    return Number.POSITIVE_INFINITY
  }

  return appointmentDate.getTime()
}

function toDateTimeLocalValue(value?: string) {
  const resolvedDate = value ? new Date(value) : new Date()

  if (Number.isNaN(resolvedDate.getTime())) {
    const fallback = new Date()
    const fallbackOffset = fallback.getTimezoneOffset() * 60_000
    return new Date(fallback.getTime() - fallbackOffset).toISOString().slice(0, 16)
  }

  const offset = resolvedDate.getTimezoneOffset() * 60_000
  return new Date(resolvedDate.getTime() - offset).toISOString().slice(0, 16)
}

function formatRecordAuditLabel(createdAt?: string, updatedAt?: string) {
  const createdDate = createdAt ? new Date(createdAt) : null
  const updatedDate = updatedAt ? new Date(updatedAt) : null
  const createdLabel = createdDate && !Number.isNaN(createdDate.getTime())
    ? `Created ${createdDate.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`
    : "Created date unavailable"

  if (!updatedDate || Number.isNaN(updatedDate.getTime())) {
    return createdLabel
  }

  if (createdDate && Math.abs(updatedDate.getTime() - createdDate.getTime()) < 60_000) {
    return createdLabel
  }

  return `${createdLabel} · Updated ${updatedDate.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`
}

function createEmptyVitalDraft(): VitalDraft {
  return {
    recordedAt: toDateTimeLocalValue(),
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperatureCelsius: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weightKg: "",
    heightCm: "",
    notes: "",
  }
}

function createEmptyDiagnosisDraft(): DiagnosisDraft {
  return {
    diagnosisName: "",
    status: "active",
    diagnosedAt: toDateTimeLocalValue(),
    notes: "",
  }
}

function createEmptyPrescriptionDraft(): PrescriptionDraft {
  return {
    medicationName: "",
    dosage: "",
    frequency: "",
    status: "active",
    prescribedAt: toDateTimeLocalValue(),
    duration: "",
    instructions: "",
  }
}

function createVitalDraftFromRecord(record: AppointmentVitalRecord): VitalDraft {
  return {
    recordedAt: toDateTimeLocalValue(record.recordedAt),
    bloodPressureSystolic: record.bloodPressureSystolic?.toString() || "",
    bloodPressureDiastolic: record.bloodPressureDiastolic?.toString() || "",
    heartRate: record.heartRate?.toString() || "",
    temperatureCelsius: typeof record.temperatureCelsius === "number" ? record.temperatureCelsius.toString() : "",
    respiratoryRate: record.respiratoryRate?.toString() || "",
    oxygenSaturation: record.oxygenSaturation?.toString() || "",
    weightKg: typeof record.weightKg === "number" ? record.weightKg.toString() : "",
    heightCm: typeof record.heightCm === "number" ? record.heightCm.toString() : "",
    notes: record.notes || "",
  }
}

function createDiagnosisDraftFromRecord(record: AppointmentDiagnosisRecord): DiagnosisDraft {
  return {
    diagnosisName: record.diagnosisName,
    status: record.status,
    diagnosedAt: toDateTimeLocalValue(record.diagnosedAt),
    notes: record.notes || "",
  }
}

function createPrescriptionDraftFromRecord(record: AppointmentPrescriptionRecord): PrescriptionDraft {
  return {
    medicationName: record.medicationName,
    dosage: record.dosage,
    frequency: record.frequency,
    status: record.status,
    prescribedAt: toDateTimeLocalValue(record.prescribedAt),
    duration: record.duration || "",
    instructions: record.instructions || "",
  }
}

export default function DoctorAppointmentsPage() {
  const [doctorUserId, setDoctorUserId] = useState("")
  const [appointments, setAppointments] = useState<DoctorAppointmentRecord[]>([])
  const [expandedAppointmentId, setExpandedAppointmentId] = useState("")
  const [draftStatuses, setDraftStatuses] = useState<Record<string, Status>>({})
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({})
  const [savingAppointmentId, setSavingAppointmentId] = useState("")
  const [messagingAppointmentId, setMessagingAppointmentId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [clinicalRecordsByAppointment, setClinicalRecordsByAppointment] = useState<Record<string, AppointmentClinicalRecords>>({})
  const [clinicalLoadingByAppointment, setClinicalLoadingByAppointment] = useState<Record<string, boolean>>({})
  const [savingClinicalKey, setSavingClinicalKey] = useState("")
  const [vitalDrafts, setVitalDrafts] = useState<Record<string, VitalDraft>>({})
  const [diagnosisDrafts, setDiagnosisDrafts] = useState<Record<string, DiagnosisDraft>>({})
  const [prescriptionDrafts, setPrescriptionDrafts] = useState<Record<string, PrescriptionDraft>>({})
  const [editingVitalIds, setEditingVitalIds] = useState<Record<string, string>>({})
  const [editingDiagnosisIds, setEditingDiagnosisIds] = useState<Record<string, string>>({})
  const [editingPrescriptionIds, setEditingPrescriptionIds] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    const currentDoctorUserId = getCurrentDoctorUserId()
    setDoctorUserId(currentDoctorUserId)

    if (!currentDoctorUserId) {
      setErrorMessage("Doctor session is missing. Please sign in again.")
      setIsLoading(false)
      return
    }

    const loadAppointments = async () => {
      try {
        const rows = await listDoctorAppointments(currentDoctorUserId, 150)
        setAppointments(rows)
        setDraftStatuses(
          rows.reduce<Record<string, Status>>((accumulator, appointment) => {
            accumulator[appointment.$id] = appointment.status
            return accumulator
          }, {})
        )
        setDraftMessages(
          rows.reduce<Record<string, string>>((accumulator, appointment) => {
            accumulator[appointment.$id] = appointment.cancellationReason || ""
            return accumulator
          }, {})
        )
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load your appointments.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadAppointments()
  }, [])

  useEffect(() => {
    if (!expandedAppointmentId || clinicalRecordsByAppointment[expandedAppointmentId] || clinicalLoadingByAppointment[expandedAppointmentId]) {
      return
    }

    let isMounted = true

    const loadClinicalRecords = async () => {
      setClinicalLoadingByAppointment((current) => ({
        ...current,
        [expandedAppointmentId]: true,
      }))

      try {
        const [vitals, diagnoses, prescriptions] = await Promise.all([
          listAppointmentVitals(expandedAppointmentId, 10),
          listAppointmentDiagnoses(expandedAppointmentId, 10),
          listAppointmentPrescriptions(expandedAppointmentId, 10),
        ])

        if (!isMounted) {
          return
        }

        setClinicalRecordsByAppointment((current) => ({
          ...current,
          [expandedAppointmentId]: {
            vitals,
            diagnoses,
            prescriptions,
          },
        }))
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setErrorMessage("Failed to load clinical records for this appointment.")
        }
      } finally {
        if (isMounted) {
          setClinicalLoadingByAppointment((current) => ({
            ...current,
            [expandedAppointmentId]: false,
          }))
        }
      }
    }

    void loadClinicalRecords()

    return () => {
      isMounted = false
    }
  }, [clinicalLoadingByAppointment, clinicalRecordsByAppointment, expandedAppointmentId])

  const todayCount = useMemo(() => {
    const now = new Date()

    return appointments.filter((appointment) => {
      const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
      return appointmentDate && !Number.isNaN(appointmentDate.getTime()) && isSameLocalDay(appointmentDate, now)
    }).length
  }, [appointments])

  const activeWeekCount = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    return appointments.filter((appointment) => {
      const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
      return (
        appointmentDate &&
        !Number.isNaN(appointmentDate.getTime()) &&
        appointmentDate >= now &&
        appointmentDate <= nextWeek &&
        (appointment.status === "confirmed" || appointment.status === "scheduled")
      )
    }).length
  }, [appointments])

  const attentionCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "cancelled" || appointment.status === "no-show").length,
    [appointments]
  )

  const activeAppointments = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => appointment.status === "confirmed" || appointment.status === "scheduled")
        .sort((left, right) => getAppointmentTimestamp(left) - getAppointmentTimestamp(right)),
    [appointments]
  )

  const pastOrCancelledAppointments = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => appointment.status !== "confirmed" && appointment.status !== "scheduled")
        .sort((left, right) => getAppointmentTimestamp(right) - getAppointmentTimestamp(left)),
    [appointments]
  )

  const renderAppointmentRow = (appointment: DoctorAppointmentRecord) => {
    const patientName = appointment.patientDetails?.fullName || "Patient"
    const patientRecord = appointment.patient && typeof appointment.patient !== "string" ? appointment.patient : null
    const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
    const appointmentDateLabel =
      appointmentDate && !Number.isNaN(appointmentDate.getTime())
        ? appointmentDate.toLocaleString()
        : "Date not available"
    const isCancellationSelected = (draftStatuses[appointment.$id] || appointment.status) === "cancelled"
    const messageValue = draftMessages[appointment.$id] || ""
    const isExpanded = expandedAppointmentId === appointment.$id
    const clinicalRecords = clinicalRecordsByAppointment[appointment.$id] || {
      vitals: [],
      diagnoses: [],
      prescriptions: [],
    }
    const vitalDraft = vitalDrafts[appointment.$id] || createEmptyVitalDraft()
    const diagnosisDraft = diagnosisDrafts[appointment.$id] || createEmptyDiagnosisDraft()
    const prescriptionDraft = prescriptionDrafts[appointment.$id] || createEmptyPrescriptionDraft()
    const editingVitalId = editingVitalIds[appointment.$id] || ""
    const editingDiagnosisId = editingDiagnosisIds[appointment.$id] || ""
    const editingPrescriptionId = editingPrescriptionIds[appointment.$id] || ""
    const isClinicalLoading = clinicalLoadingByAppointment[appointment.$id]
    const patientId = appointment.patientDetails?.id || patientRecord?.$id || ""
    const patientUserId = patientRecord?.userId || ""
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""

    return (
      <div key={appointment.$id} className="rounded-xl border bg-white/90 p-4 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="sm" className="size-10">
                <AvatarImage src={appointment.patientDetails?.avatarUrl || ""} alt={patientName} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {getInitials(patientName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{patientName}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.patientDetails?.phone || "No phone on file"}
                </p>
              </div>
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(appointment.status)}`}>
              {getStatusLabel(appointment.status)}
            </span>
            <button
              type="button"
              onClick={() => setExpandedAppointmentId((current) => (current === appointment.$id ? "" : appointment.$id))}
              className="inline-flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 lg:w-56"
            >
              <span>{isExpanded ? "Hide details" : "View details"}</span>
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>

          {isExpanded ? (
            <div className="space-y-4 rounded-xl border bg-slate-50/80 p-4 dark:bg-slate-900/60">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-foreground">{appointment.reason_for_visit}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{appointmentDateLabel}</p>
                    {appointment.notes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{appointment.notes}</p>
                    ) : null}
                    {appointment.status === "cancelled" && appointment.cancellationReason ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        Cancellation reason sent to patient: {appointment.cancellationReason}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Phone</p>
                      <p className="mt-1 text-sm text-foreground">{appointment.patientDetails?.phone || "No phone on file"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Email</p>
                      <p className="mt-1 text-sm text-foreground">{patientRecord?.email || "No email on file"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Gender</p>
                      <p className="mt-1 text-sm text-foreground">{patientRecord?.gender || "Not provided"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Occupation</p>
                      <p className="mt-1 text-sm text-foreground">{patientRecord?.occupation || "Not provided"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Address</p>
                      <p className="mt-1 text-sm text-foreground">{patientRecord?.address || "Not provided"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Emergency contact</p>
                      <p className="mt-1 text-sm text-foreground">{patientRecord?.emergencyContactName || "Not provided"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-950/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Emergency number</p>
                      <p className="mt-1 text-sm text-foreground">{patientRecord?.emergencyContactNumber || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3">
                  <select
                    value={draftStatuses[appointment.$id] || appointment.status}
                    onChange={(event) =>
                      setDraftStatuses((current) => ({
                        ...current,
                        [appointment.$id]: event.target.value as Status,
                      }))
                    }
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {appointmentStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    value={messageValue}
                    onChange={(event) =>
                      setDraftMessages((current) => ({
                        ...current,
                        [appointment.$id]: event.target.value,
                      }))
                    }
                    placeholder={
                      isCancellationSelected
                        ? "Cancellation reason for the patient"
                        : "Message the patient about this appointment"
                    }
                    className="min-h-24"
                  />
                  {isCancellationSelected ? (
                    <p className="text-xs text-muted-foreground">
                      Doctors must provide a cancellation reason of at least 10 characters.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Send a direct appointment message to this patient from your portal.
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={() => void handleStatusSave(appointment.$id)}
                    disabled={
                      savingAppointmentId === appointment.$id ||
                      draftStatuses[appointment.$id] === appointment.status ||
                      (isCancellationSelected && messageValue.trim().length < 10)
                    }
                  >
                    {savingAppointmentId === appointment.$id ? <Spinner className="mr-2 size-4" /> : null}
                    Update status
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSendPatientMessage(appointment.$id)}
                    disabled={messagingAppointmentId === appointment.$id || messageValue.trim().length < 5}
                  >
                    {messagingAppointmentId === appointment.$id ? <Spinner className="mr-2 size-4" /> : null}
                    Message patient
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                      <Activity className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Vitals</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input type="datetime-local" value={vitalDraft.recordedAt} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), recordedAt: event.target.value } }))} />
                    <Input type="number" placeholder="Systolic" value={vitalDraft.bloodPressureSystolic} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), bloodPressureSystolic: event.target.value } }))} />
                    <Input type="number" placeholder="Diastolic" value={vitalDraft.bloodPressureDiastolic} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), bloodPressureDiastolic: event.target.value } }))} />
                    <Input type="number" placeholder="Heart rate" value={vitalDraft.heartRate} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), heartRate: event.target.value } }))} />
                    <Input type="number" step="0.1" placeholder="Temperature °C" value={vitalDraft.temperatureCelsius} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), temperatureCelsius: event.target.value } }))} />
                    <Input type="number" placeholder="Respiratory" value={vitalDraft.respiratoryRate} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), respiratoryRate: event.target.value } }))} />
                    <Input type="number" placeholder="Oxygen %" value={vitalDraft.oxygenSaturation} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), oxygenSaturation: event.target.value } }))} />
                    <Input type="number" step="0.1" placeholder="Weight kg" value={vitalDraft.weightKg} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), weightKg: event.target.value } }))} />
                    <Input type="number" step="0.1" placeholder="Height cm" value={vitalDraft.heightCm} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), heightCm: event.target.value } }))} />
                  </div>
                  <Textarea value={vitalDraft.notes} onChange={(event) => setVitalDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyVitalDraft()), notes: event.target.value } }))} placeholder="Vitals notes" className="min-h-20" />
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void handleSaveVital(appointment)} disabled={savingClinicalKey === `${appointment.$id}:vital` || !patientId || !patientUserId}>
                      {savingClinicalKey === `${appointment.$id}:vital` ? <Spinner className="mr-2 size-4" /> : null}
                      {editingVitalId ? "Update vitals" : "Save vitals"}
                    </Button>
                    {editingVitalId ? (
                      <Button type="button" variant="outline" onClick={() => handleCancelVitalEdit(appointment.$id)}>
                        <X className="mr-1 size-4" />
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {isClinicalLoading ? <p className="text-xs text-muted-foreground">Loading entries...</p> : null}
                    {clinicalRecords.vitals.slice(0, 2).map((vital) => (
                      <div key={vital.$id} className="rounded-xl border border-blue-200/80 bg-white/85 px-3 py-3 text-xs text-muted-foreground shadow-sm dark:border-blue-900/50 dark:bg-slate-950/70">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-foreground">{new Date(vital.recordedAt).toLocaleString()}</p>
                            <p>
                              {vital.bloodPressureSystolic && vital.bloodPressureDiastolic ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}` : "BP n/a"}
                              {typeof vital.temperatureCelsius === "number" ? ` · ${vital.temperatureCelsius.toFixed(1)} °C` : ""}
                              {typeof vital.heartRate === "number" ? ` · ${vital.heartRate} bpm` : ""}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                <Activity className="size-3" />
                                {vital.bloodPressureSystolic && vital.bloodPressureDiastolic ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}` : "BP n/a"}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                                <HeartPulse className="size-3" />
                                {typeof vital.heartRate === "number" ? `${vital.heartRate} bpm` : "Heart rate n/a"}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-[11px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
                                <Thermometer className="size-3" />
                                {typeof vital.temperatureCelsius === "number" ? `${vital.temperatureCelsius.toFixed(1)} °C` : "Temp n/a"}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-[11px] font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
                                <Wind className="size-3" />
                                {typeof vital.respiratoryRate === "number" ? `${vital.respiratoryRate}/min` : "Resp n/a"}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-medium text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
                                <ShieldCheck className="size-3" />
                                {typeof vital.oxygenSaturation === "number" ? `${vital.oxygenSaturation}%` : "O2 n/a"}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                                <Ruler className="size-3" />
                                {typeof vital.weightKg === "number" || typeof vital.heightCm === "number"
                                  ? `${typeof vital.weightKg === "number" ? `${vital.weightKg.toFixed(1)} kg` : "-"} · ${typeof vital.heightCm === "number" ? `${vital.heightCm.toFixed(1)} cm` : "-"}`
                                  : "Body metrics n/a"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {formatRecordAuditLabel(vital.$createdAt, vital.$updatedAt)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleStartVitalEdit(appointment.$id, vital)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setDeleteTarget({ kind: "vital", appointmentId: appointment.$id, recordId: vital.$id, doctorId, label: `vitals from ${new Date(vital.recordedAt).toLocaleString()}` })}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                      <Stethoscope className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Diagnosis</p>
                  </div>
                  <Input value={diagnosisDraft.diagnosisName} onChange={(event) => setDiagnosisDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyDiagnosisDraft()), diagnosisName: event.target.value } }))} placeholder="Diagnosis name" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select value={diagnosisDraft.status} onChange={(event) => setDiagnosisDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyDiagnosisDraft()), status: event.target.value as PatientDiagnosisStatus } }))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                      <option value="chronic">Chronic</option>
                    </select>
                    <Input type="datetime-local" value={diagnosisDraft.diagnosedAt} onChange={(event) => setDiagnosisDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyDiagnosisDraft()), diagnosedAt: event.target.value } }))} />
                  </div>
                  <Textarea value={diagnosisDraft.notes} onChange={(event) => setDiagnosisDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyDiagnosisDraft()), notes: event.target.value } }))} placeholder="Clinical notes for this diagnosis" className="min-h-20" />
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void handleSaveDiagnosis(appointment)} disabled={savingClinicalKey === `${appointment.$id}:diagnosis` || !patientId || !patientUserId || !doctorId || diagnosisDraft.diagnosisName.trim().length < 2}>
                      {savingClinicalKey === `${appointment.$id}:diagnosis` ? <Spinner className="mr-2 size-4" /> : null}
                      {editingDiagnosisId ? "Update diagnosis" : "Save diagnosis"}
                    </Button>
                    {editingDiagnosisId ? (
                      <Button type="button" variant="outline" onClick={() => handleCancelDiagnosisEdit(appointment.$id)}>
                        <X className="mr-1 size-4" />
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {clinicalRecords.diagnoses.slice(0, 2).map((diagnosis) => (
                      <div key={diagnosis.$id} className="rounded-xl border border-amber-200/80 bg-white/85 px-3 py-3 text-xs text-muted-foreground shadow-sm dark:border-amber-900/50 dark:bg-slate-950/70">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                                <Stethoscope className="size-3.5" />
                              </div>
                              <p className="font-medium text-foreground">{diagnosis.diagnosisName}</p>
                            </div>
                            <p>{diagnosis.status} · {new Date(diagnosis.diagnosedAt).toLocaleDateString()}</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {formatRecordAuditLabel(diagnosis.$createdAt, diagnosis.$updatedAt)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleStartDiagnosisEdit(appointment.$id, diagnosis)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setDeleteTarget({ kind: "diagnosis", appointmentId: appointment.$id, recordId: diagnosis.$id, doctorId, label: diagnosis.diagnosisName })}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                      <Pill className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Prescription</p>
                  </div>
                  <Input value={prescriptionDraft.medicationName} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), medicationName: event.target.value } }))} placeholder="Medication name" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={prescriptionDraft.dosage} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), dosage: event.target.value } }))} placeholder="Dosage" />
                    <Input value={prescriptionDraft.frequency} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), frequency: event.target.value } }))} placeholder="Frequency" />
                    <Input value={prescriptionDraft.duration} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), duration: event.target.value } }))} placeholder="Duration" />
                    <select value={prescriptionDraft.status} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), status: event.target.value as PatientPrescriptionStatus } }))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="stopped">Stopped</option>
                    </select>
                  </div>
                  <Input type="datetime-local" value={prescriptionDraft.prescribedAt} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), prescribedAt: event.target.value } }))} />
                  <Textarea value={prescriptionDraft.instructions} onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appointment.$id]: { ...(current[appointment.$id] || createEmptyPrescriptionDraft()), instructions: event.target.value } }))} placeholder="Instructions for the patient" className="min-h-20" />
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void handleSavePrescription(appointment)} disabled={savingClinicalKey === `${appointment.$id}:prescription` || !patientId || !patientUserId || !doctorId || prescriptionDraft.medicationName.trim().length < 2 || prescriptionDraft.dosage.trim().length < 1 || prescriptionDraft.frequency.trim().length < 1}>
                      {savingClinicalKey === `${appointment.$id}:prescription` ? <Spinner className="mr-2 size-4" /> : null}
                      {editingPrescriptionId ? "Update prescription" : "Save prescription"}
                    </Button>
                    {editingPrescriptionId ? (
                      <Button type="button" variant="outline" onClick={() => handleCancelPrescriptionEdit(appointment.$id)}>
                        <X className="mr-1 size-4" />
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {clinicalRecords.prescriptions.slice(0, 2).map((prescription) => (
                      <div key={prescription.$id} className="rounded-xl border border-emerald-200/80 bg-white/85 px-3 py-3 text-xs text-muted-foreground shadow-sm dark:border-emerald-900/50 dark:bg-slate-950/70">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                                <Pill className="size-3.5" />
                              </div>
                              <p className="font-medium text-foreground">{prescription.medicationName}</p>
                            </div>
                            <p>{prescription.dosage} · {prescription.frequency}</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {formatRecordAuditLabel(prescription.$createdAt, prescription.$updatedAt)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleStartPrescriptionEdit(appointment.$id, prescription)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setDeleteTarget({ kind: "prescription", appointmentId: appointment.$id, recordId: prescription.$id, doctorId, label: prescription.medicationName })}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const handleStatusSave = async (appointmentId: string) => {
    const nextStatus = draftStatuses[appointmentId]

    if (!nextStatus || !doctorUserId) {
      return
    }

    setSavingAppointmentId(appointmentId)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const reasonForPatient = draftMessages[appointmentId] || ""
      const updatedAppointment = await updateAppointmentStatus({
        appointmentId,
        status: nextStatus,
        actorRole: "doctor",
        actorDoctorUserId: doctorUserId,
        cancellationReason: nextStatus === "cancelled" ? reasonForPatient : undefined,
      })

      if (!updatedAppointment) {
        throw new Error("Appointment update returned no data.")
      }

      setAppointments((current) =>
        current.map((appointment) => (appointment.$id === appointmentId ? updatedAppointment : appointment))
      )
      if (nextStatus !== "cancelled") {
        setDraftMessages((current) => ({
          ...current,
          [appointmentId]: updatedAppointment.cancellationReason || current[appointmentId] || "",
        }))
      }
      setSaveMessage("Appointment status updated.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update appointment status.")
    } finally {
      setSavingAppointmentId("")
    }
  }

  const handleSendPatientMessage = async (appointmentId: string) => {
    const message = draftMessages[appointmentId] || ""

    if (!doctorUserId) {
      setErrorMessage("Doctor session is missing. Please sign in again.")
      return
    }

    setMessagingAppointmentId(appointmentId)
    setErrorMessage("")
    setSaveMessage("")

    try {
      await sendDoctorMessageToPatient({
        appointmentId,
        doctorUserId,
        message,
      })

      setDraftMessages((current) => ({
        ...current,
        [appointmentId]: "",
      }))
      setSaveMessage("Message sent to the patient.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to send the patient message.")
    } finally {
      setMessagingAppointmentId("")
    }
  }

  const handleCreateVital = async (appointment: DoctorAppointmentRecord) => {
    const patientRecord = appointment.patient && typeof appointment.patient !== "string" ? appointment.patient : null
    const patientId = appointment.patientDetails?.id || patientRecord?.$id || ""
    const patientUserId = patientRecord?.userId || ""
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""
    const draft = vitalDrafts[appointment.$id] || createEmptyVitalDraft()

    if (!patientId || !patientUserId) {
      setErrorMessage("This appointment is missing patient context for clinical records.")
      return
    }

    setSavingClinicalKey(`${appointment.$id}:vital`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const createdRecord = await createPatientVital({
        patientId,
        patientUserId,
        appointmentId: appointment.$id,
        doctorId,
        bloodPressureSystolic: draft.bloodPressureSystolic,
        bloodPressureDiastolic: draft.bloodPressureDiastolic,
        heartRate: draft.heartRate,
        temperatureCelsius: draft.temperatureCelsius,
        respiratoryRate: draft.respiratoryRate,
        oxygenSaturation: draft.oxygenSaturation,
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        notes: draft.notes,
        recordedAt: draft.recordedAt,
      })

      if (!createdRecord) {
        throw new Error("Vitals entry could not be created.")
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [appointment.$id]: {
          vitals: [createdRecord, ...(current[appointment.$id]?.vitals || [])],
          diagnoses: current[appointment.$id]?.diagnoses || [],
          prescriptions: current[appointment.$id]?.prescriptions || [],
        },
      }))
      setVitalDrafts((current) => ({
        ...current,
        [appointment.$id]: createEmptyVitalDraft(),
      }))
      setSaveMessage("Vitals saved to the patient record.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to save vitals.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  const handleStartVitalEdit = (appointmentId: string, vital: AppointmentVitalRecord) => {
    setEditingVitalIds((current) => ({ ...current, [appointmentId]: vital.$id }))
    setVitalDrafts((current) => ({ ...current, [appointmentId]: createVitalDraftFromRecord(vital) }))
  }

  const handleCancelVitalEdit = (appointmentId: string) => {
    setEditingVitalIds((current) => ({ ...current, [appointmentId]: "" }))
    setVitalDrafts((current) => ({ ...current, [appointmentId]: createEmptyVitalDraft() }))
  }

  const handleStartDiagnosisEdit = (appointmentId: string, diagnosis: AppointmentDiagnosisRecord) => {
    setEditingDiagnosisIds((current) => ({ ...current, [appointmentId]: diagnosis.$id }))
    setDiagnosisDrafts((current) => ({ ...current, [appointmentId]: createDiagnosisDraftFromRecord(diagnosis) }))
  }

  const handleCancelDiagnosisEdit = (appointmentId: string) => {
    setEditingDiagnosisIds((current) => ({ ...current, [appointmentId]: "" }))
    setDiagnosisDrafts((current) => ({ ...current, [appointmentId]: createEmptyDiagnosisDraft() }))
  }

  const handleStartPrescriptionEdit = (appointmentId: string, prescription: AppointmentPrescriptionRecord) => {
    setEditingPrescriptionIds((current) => ({ ...current, [appointmentId]: prescription.$id }))
    setPrescriptionDrafts((current) => ({ ...current, [appointmentId]: createPrescriptionDraftFromRecord(prescription) }))
  }

  const handleCancelPrescriptionEdit = (appointmentId: string) => {
    setEditingPrescriptionIds((current) => ({ ...current, [appointmentId]: "" }))
    setPrescriptionDrafts((current) => ({ ...current, [appointmentId]: createEmptyPrescriptionDraft() }))
  }

  const handleSaveVital = async (appointment: DoctorAppointmentRecord) => {
    const editingId = editingVitalIds[appointment.$id]
    if (editingId) {
      return handleUpdateVital(appointment, editingId)
    }

    return handleCreateVital(appointment)
  }

  const handleSaveDiagnosis = async (appointment: DoctorAppointmentRecord) => {
    const editingId = editingDiagnosisIds[appointment.$id]
    if (editingId) {
      return handleUpdateDiagnosis(appointment, editingId)
    }

    return handleCreateDiagnosis(appointment)
  }

  const handleSavePrescription = async (appointment: DoctorAppointmentRecord) => {
    const editingId = editingPrescriptionIds[appointment.$id]
    if (editingId) {
      return handleUpdatePrescription(appointment, editingId)
    }

    return handleCreatePrescription(appointment)
  }

  const handleCreateDiagnosis = async (appointment: DoctorAppointmentRecord) => {
    const patientRecord = appointment.patient && typeof appointment.patient !== "string" ? appointment.patient : null
    const patientId = appointment.patientDetails?.id || patientRecord?.$id || ""
    const patientUserId = patientRecord?.userId || ""
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""
    const draft = diagnosisDrafts[appointment.$id] || createEmptyDiagnosisDraft()

    if (!patientId || !patientUserId || !doctorId) {
      setErrorMessage("This appointment is missing patient or doctor context for diagnoses.")
      return
    }

    setSavingClinicalKey(`${appointment.$id}:diagnosis`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const createdRecord = await createPatientDiagnosis({
        patientId,
        patientUserId,
        doctorId,
        appointmentId: appointment.$id,
        diagnosisName: draft.diagnosisName,
        status: draft.status,
        diagnosedAt: draft.diagnosedAt,
        notes: draft.notes,
      })

      if (!createdRecord) {
        throw new Error("Diagnosis entry could not be created.")
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [appointment.$id]: {
          vitals: current[appointment.$id]?.vitals || [],
          diagnoses: [createdRecord, ...(current[appointment.$id]?.diagnoses || [])],
          prescriptions: current[appointment.$id]?.prescriptions || [],
        },
      }))
      setDiagnosisDrafts((current) => ({
        ...current,
        [appointment.$id]: createEmptyDiagnosisDraft(),
      }))
      setSaveMessage("Diagnosis saved to the patient record.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to save diagnosis.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  const handleUpdateVital = async (appointment: DoctorAppointmentRecord, vitalId: string) => {
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""
    const draft = vitalDrafts[appointment.$id] || createEmptyVitalDraft()

    setSavingClinicalKey(`${appointment.$id}:vital`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const updatedRecord = await updatePatientVital({
        vitalId,
        doctorId,
        bloodPressureSystolic: draft.bloodPressureSystolic,
        bloodPressureDiastolic: draft.bloodPressureDiastolic,
        heartRate: draft.heartRate,
        temperatureCelsius: draft.temperatureCelsius,
        respiratoryRate: draft.respiratoryRate,
        oxygenSaturation: draft.oxygenSaturation,
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        notes: draft.notes,
        recordedAt: draft.recordedAt,
      })

      if (!updatedRecord) {
        throw new Error("Vitals entry could not be updated.")
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [appointment.$id]: {
          vitals: (current[appointment.$id]?.vitals || []).map((vital) => (vital.$id === vitalId ? updatedRecord : vital)),
          diagnoses: current[appointment.$id]?.diagnoses || [],
          prescriptions: current[appointment.$id]?.prescriptions || [],
        },
      }))
      handleCancelVitalEdit(appointment.$id)
      setSaveMessage("Vitals updated.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update vitals.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  const handleUpdateDiagnosis = async (appointment: DoctorAppointmentRecord, diagnosisId: string) => {
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""
    const draft = diagnosisDrafts[appointment.$id] || createEmptyDiagnosisDraft()

    setSavingClinicalKey(`${appointment.$id}:diagnosis`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const updatedRecord = await updatePatientDiagnosis({
        diagnosisId,
        doctorId,
        diagnosisName: draft.diagnosisName,
        status: draft.status,
        diagnosedAt: draft.diagnosedAt,
        notes: draft.notes,
      })

      if (!updatedRecord) {
        throw new Error("Diagnosis entry could not be updated.")
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [appointment.$id]: {
          vitals: current[appointment.$id]?.vitals || [],
          diagnoses: (current[appointment.$id]?.diagnoses || []).map((diagnosis) => (diagnosis.$id === diagnosisId ? updatedRecord : diagnosis)),
          prescriptions: current[appointment.$id]?.prescriptions || [],
        },
      }))
      handleCancelDiagnosisEdit(appointment.$id)
      setSaveMessage("Diagnosis updated.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update diagnosis.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  const handleCreatePrescription = async (appointment: DoctorAppointmentRecord) => {
    const patientRecord = appointment.patient && typeof appointment.patient !== "string" ? appointment.patient : null
    const patientId = appointment.patientDetails?.id || patientRecord?.$id || ""
    const patientUserId = patientRecord?.userId || ""
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""
    const draft = prescriptionDrafts[appointment.$id] || createEmptyPrescriptionDraft()

    if (!patientId || !patientUserId || !doctorId) {
      setErrorMessage("This appointment is missing patient or doctor context for prescriptions.")
      return
    }

    setSavingClinicalKey(`${appointment.$id}:prescription`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const createdRecord = await createPatientPrescription({
        patientId,
        patientUserId,
        doctorId,
        appointmentId: appointment.$id,
        medicationName: draft.medicationName,
        dosage: draft.dosage,
        frequency: draft.frequency,
        status: draft.status,
        prescribedAt: draft.prescribedAt,
        duration: draft.duration,
        instructions: draft.instructions,
      })

      if (!createdRecord) {
        throw new Error("Prescription entry could not be created.")
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [appointment.$id]: {
          vitals: current[appointment.$id]?.vitals || [],
          diagnoses: current[appointment.$id]?.diagnoses || [],
          prescriptions: [createdRecord, ...(current[appointment.$id]?.prescriptions || [])],
        },
      }))
      setPrescriptionDrafts((current) => ({
        ...current,
        [appointment.$id]: createEmptyPrescriptionDraft(),
      }))
      setSaveMessage("Prescription saved to the patient record.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to save prescription.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  const handleUpdatePrescription = async (appointment: DoctorAppointmentRecord, prescriptionId: string) => {
    const doctorId = appointment.doctorDetails?.id || (appointment.doctor && typeof appointment.doctor !== "string" ? appointment.doctor.$id : "") || ""
    const draft = prescriptionDrafts[appointment.$id] || createEmptyPrescriptionDraft()

    setSavingClinicalKey(`${appointment.$id}:prescription`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const updatedRecord = await updatePatientPrescription({
        prescriptionId,
        doctorId,
        medicationName: draft.medicationName,
        dosage: draft.dosage,
        frequency: draft.frequency,
        status: draft.status,
        prescribedAt: draft.prescribedAt,
        duration: draft.duration,
        instructions: draft.instructions,
      })

      if (!updatedRecord) {
        throw new Error("Prescription entry could not be updated.")
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [appointment.$id]: {
          vitals: current[appointment.$id]?.vitals || [],
          diagnoses: current[appointment.$id]?.diagnoses || [],
          prescriptions: (current[appointment.$id]?.prescriptions || []).map((prescription) => (prescription.$id === prescriptionId ? updatedRecord : prescription)),
        },
      }))
      handleCancelPrescriptionEdit(appointment.$id)
      setSaveMessage("Prescription updated.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update prescription.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  const handleDeleteClinicalRecord = async () => {
    if (!deleteTarget) {
      return
    }

    setSavingClinicalKey(`${deleteTarget.appointmentId}:${deleteTarget.kind}:delete`)
    setErrorMessage("")
    setSaveMessage("")

    try {
      if (deleteTarget.kind === "vital") {
        await deletePatientVital({ vitalId: deleteTarget.recordId, doctorId: deleteTarget.doctorId })
      } else if (deleteTarget.kind === "diagnosis") {
        await deletePatientDiagnosis({ diagnosisId: deleteTarget.recordId, doctorId: deleteTarget.doctorId })
      } else {
        await deletePatientPrescription({ prescriptionId: deleteTarget.recordId, doctorId: deleteTarget.doctorId })
      }

      setClinicalRecordsByAppointment((current) => ({
        ...current,
        [deleteTarget.appointmentId]: {
          vitals: deleteTarget.kind === "vital" ? (current[deleteTarget.appointmentId]?.vitals || []).filter((item) => item.$id !== deleteTarget.recordId) : current[deleteTarget.appointmentId]?.vitals || [],
          diagnoses: deleteTarget.kind === "diagnosis" ? (current[deleteTarget.appointmentId]?.diagnoses || []).filter((item) => item.$id !== deleteTarget.recordId) : current[deleteTarget.appointmentId]?.diagnoses || [],
          prescriptions: deleteTarget.kind === "prescription" ? (current[deleteTarget.appointmentId]?.prescriptions || []).filter((item) => item.$id !== deleteTarget.recordId) : current[deleteTarget.appointmentId]?.prescriptions || [],
        },
      }))
      setSaveMessage(`${deleteTarget.label} deleted.`)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to delete clinical record.")
    } finally {
      setSavingClinicalKey("")
    }
  }

  return (
    <DoctorShell
      pageTitle="Appointments"
      pageDescription="Track today’s clinic flow and update visit statuses in real time."
    >
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete clinical record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.label || "this record"} from the appointment panel and patient record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteClinicalRecord()} variant="destructive">
              {savingClinicalKey.endsWith(":delete") ? <Spinner className="mr-2 size-4" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <Card className="bg-blue-50/70 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Today</CardDescription>
            <CardTitle>{todayCount} booked</CardTitle>
            <CardAction>
              <CalendarClock className="size-7 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visits assigned to you for today.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
          <CardHeader>
            <CardDescription>This Week</CardDescription>
            <CardTitle>{activeWeekCount} active</CardTitle>
            <CardAction>
              <FileClock className="size-7 text-emerald-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Confirmed and scheduled visits in the next seven days.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Attention Needed</CardDescription>
            <CardTitle>{attentionCount} issues</CardTitle>
            <CardAction>
              <CircleAlert className="size-7 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Missed or cancelled visits that may require follow-up.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
          <CardHeader>
            <CardTitle>Upcoming Visits</CardTitle>
            <CardDescription>
              Move each visit through its current clinic status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(errorMessage || saveMessage) && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  errorMessage
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                }`}
              >
                {errorMessage || saveMessage}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-white/80 px-4 py-10 text-sm text-muted-foreground dark:border-indigo-900/60 dark:bg-slate-950/60">
                <Spinner className="mr-2 size-4" />
                Loading appointments...
              </div>
            ) : activeAppointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-indigo-200 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-indigo-900/60 dark:bg-slate-950/60">
                No active upcoming visits are scheduled for this doctor yet.
              </div>
            ) : (
              activeAppointments.map((appointment) => renderAppointmentRow(appointment))
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 bg-slate-100/90 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Past/Cancelled Visits</CardTitle>
            <CardDescription>
              Review completed, missed, and cancelled appointments separately from active visits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                <Spinner className="mr-2 size-4" />
                Loading visit history...
              </div>
            ) : pastOrCancelledAppointments.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No past or cancelled visits are available yet.
              </div>
            ) : (
              pastOrCancelledAppointments.map((appointment) => renderAppointmentRow(appointment))
            )}
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}