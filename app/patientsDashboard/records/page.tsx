"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FileBadge2,
  FileText,
  HeartPulse,
  IdCard,
  Pill,
  Ruler,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react"

import { PatientShell } from "@/components/patient-shell"
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { listPatientAppointments } from "@/lib/actions/appointment.action"
import {
  getPatientByUserId,
  listPatientDiagnoses,
  listPatientPrescriptions,
  listPatientVitals,
} from "@/lib/actions/patient.action"
import { getCurrentPatientUserId } from "@/lib/patient-session"

type PatientRecordsData = {
  patient: Awaited<ReturnType<typeof getPatientByUserId>>
  appointments: Awaited<ReturnType<typeof listPatientAppointments>>
  vitals: Awaited<ReturnType<typeof listPatientVitals>>
  diagnoses: Awaited<ReturnType<typeof listPatientDiagnoses>>
  prescriptions: Awaited<ReturnType<typeof listPatientPrescriptions>>
}

function getStatusClass(status: Status) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  }

  if (status === "confirmed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
  }

  if (status === "scheduled") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  }

  return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
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

export default function PatientRecordsPage() {
  const [recordsData, setRecordsData] = useState<PatientRecordsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const patientUserId = getCurrentPatientUserId()

    if (!patientUserId) {
      setErrorMessage("Patient session is missing. Please sign in again.")
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadRecords = async () => {
      try {
        const [patient, appointments, vitals, diagnoses, prescriptions] = await Promise.all([
          getPatientByUserId(patientUserId),
          listPatientAppointments(patientUserId, 20),
          listPatientVitals(patientUserId, 12),
          listPatientDiagnoses(patientUserId, 12),
          listPatientPrescriptions(patientUserId, 12),
        ])

        if (!isMounted) {
          return
        }

        setRecordsData({ patient, appointments, vitals, diagnoses, prescriptions })
      } catch (error) {
        console.error("Failed to load patient records", error)
        if (isMounted) {
          setErrorMessage("Failed to load your records.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadRecords()

    return () => {
      isMounted = false
    }
  }, [])

  const patient = recordsData?.patient || null
  const appointments = recordsData?.appointments || []
  const vitals = recordsData?.vitals || []
  const diagnoses = recordsData?.diagnoses || []
  const prescriptions = recordsData?.prescriptions || []
  const recordSections = useMemo(() => {
    if (!patient) {
      return []
    }

    return [
      {
        title: "Allergies",
        value: patient.allergies || "No allergies recorded yet.",
        filled: Boolean(patient.allergies),
        icon: CircleAlert,
      },
      {
        title: "Current Medication",
        value: patient.currentMedication || "No current medication listed.",
        filled: Boolean(patient.currentMedication),
        icon: Pill,
      },
      {
        title: "Family Medical History",
        value: patient.familyMedicalHistory || "Family history has not been added yet.",
        filled: Boolean(patient.familyMedicalHistory),
        icon: HeartPulse,
      },
      {
        title: "Past Medical History",
        value: patient.pastMedicalHistory || "Past medical history has not been added yet.",
        filled: Boolean(patient.pastMedicalHistory),
        icon: FileText,
      },
    ]
  }, [patient])
  const profileChecks = useMemo(() => {
    if (!patient) {
      return []
    }

    return [
      { label: "Insurance provider", filled: Boolean(patient.insuranceProvider) },
      { label: "Policy number", filled: Boolean(patient.insurancePolicyNumber) },
      { label: "Identification type", filled: Boolean(patient.identificationType) },
      { label: "Identification number", filled: Boolean(patient.identificationNumber) },
      { label: "Uploaded document", filled: Boolean(patient.identificationDocumentUrl) },
      { label: "Emergency contact", filled: Boolean(patient.emergencyContactName && patient.emergencyContactNumber) },
      { label: "Primary physician", filled: Boolean(patient.primaryPhysician) },
      { label: "Privacy consent", filled: Boolean(patient.privacyConsent) },
    ]
  }, [patient])
  const completedChecks = profileChecks.filter((item) => item.filled).length
  const completionRate = profileChecks.length > 0 ? Math.round((completedChecks / profileChecks.length) * 100) : 0
  const missingItems = profileChecks.filter((item) => !item.filled)
  const completedAppointments = appointments.filter((appointment) => appointment.status === "completed")
  const upcomingAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.appointment_date)
    return !Number.isNaN(appointmentDate.getTime()) && appointmentDate >= new Date() && appointment.status !== "cancelled" && appointment.status !== "no-show"
  })
  const latestVitals = vitals[0]
  const activeDiagnoses = diagnoses.filter((diagnosis) => diagnosis.status === "active" || diagnosis.status === "chronic")
  const activePrescriptions = prescriptions.filter((prescription) => prescription.status === "active")

  return (
    <PatientShell pageTitle="Records" pageDescription="Review your medical records and recent updates.">
      <section className="space-y-6 p-4 md:p-6">
        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading your records...
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
                <CardHeader>
                  <CardDescription>Record Completion</CardDescription>
                  <CardTitle>{completionRate}% complete</CardTitle>
                  <CardAction>
                    <ShieldCheck className="size-7 text-emerald-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {completedChecks} of {profileChecks.length || 8} record checkpoints are filled.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50/70 dark:bg-blue-950/30">
                <CardHeader>
                  <CardDescription>Vitals on File</CardDescription>
                  <CardTitle>{vitals.length} entries</CardTitle>
                  <CardAction>
                    <Activity className="size-7 text-blue-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {latestVitals
                      ? `Latest entry recorded ${new Date(latestVitals.recordedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}.`
                      : "No vital signs have been recorded yet."}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-amber-50/80 dark:bg-amber-950/30">
                <CardHeader>
                  <CardDescription>Diagnoses</CardDescription>
                  <CardTitle>{diagnoses.length} recorded</CardTitle>
                  <CardAction>
                    <Stethoscope className="size-7 text-amber-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {activeDiagnoses.length} active or chronic diagnoses are currently on file.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-100/90 dark:bg-slate-900/80">
                <CardHeader>
                  <CardDescription>Prescriptions</CardDescription>
                  <CardTitle>{prescriptions.length} recorded</CardTitle>
                  <CardAction>
                    <Pill className="size-7 text-slate-700 dark:text-slate-200" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {activePrescriptions.length} active medications are available to review.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardDescription>Health Summary</CardDescription>
                    <CardTitle>What is on your record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {recordSections.map((section) => {
                        const Icon = section.icon

                        return (
                          <div key={section.title} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/55">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{section.title}</p>
                                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{section.value}</p>
                              </div>
                              <div className={`flex size-10 items-center justify-center rounded-2xl ${section.filled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"}`}>
                                <Icon className="size-5" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardDescription>Vitals</CardDescription>
                    <CardTitle>Latest measurements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {latestVitals ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 dark:border-blue-900/60 dark:bg-blue-950/25">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">Blood pressure</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                              <Activity className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                            {latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic
                              ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}`
                              : "Not recorded"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-900/60 dark:bg-rose-950/25">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700 dark:text-rose-300">Heart rate</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                              <HeartPulse className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{latestVitals.heartRate ? `${latestVitals.heartRate} bpm` : "Not recorded"}</p>
                        </div>
                        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/80 p-4 dark:border-orange-900/60 dark:bg-orange-950/25">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-orange-700 dark:text-orange-300">Temperature</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200">
                              <Thermometer className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{typeof latestVitals.temperatureCelsius === "number" ? `${latestVitals.temperatureCelsius.toFixed(1)} °C` : "Not recorded"}</p>
                        </div>
                        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/80 p-4 dark:border-teal-900/60 dark:bg-teal-950/25">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-700 dark:text-teal-300">Respiratory rate</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">
                              <Wind className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{latestVitals.respiratoryRate ? `${latestVitals.respiratoryRate}/min` : "Not recorded"}</p>
                        </div>
                        <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/80 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/25">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-700 dark:text-cyan-300">Oxygen saturation</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200">
                              <ShieldCheck className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{latestVitals.oxygenSaturation ? `${latestVitals.oxygenSaturation}%` : "Not recorded"}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 p-4 dark:border-violet-900/60 dark:bg-violet-950/25">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">Weight / Height</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
                              <Ruler className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                            {typeof latestVitals.weightKg === "number" || typeof latestVitals.heightCm === "number"
                              ? `${typeof latestVitals.weightKg === "number" ? `${latestVitals.weightKg.toFixed(1)} kg` : "-"} · ${typeof latestVitals.heightCm === "number" ? `${latestVitals.heightCm.toFixed(1)} cm` : "-"}`
                              : "Not recorded"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 md:col-span-2 xl:col-span-3 dark:border-slate-800 dark:bg-slate-950/70">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Record audit</p>
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                              <FileText className="size-4" />
                            </div>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                            Recorded by {latestVitals.doctorDetails?.fullName || "Clinic doctor"}
                          </p>
                          {latestVitals.doctorDetails?.specialty ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {latestVitals.doctorDetails.specialty}
                            </p>
                          ) : null}
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {formatRecordAuditLabel(latestVitals.$createdAt, latestVitals.$updatedAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/60">
                        No vitals have been recorded yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardDescription>Care Activity</CardDescription>
                    <CardTitle>Recent appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {appointments.slice(0, 6).map((appointment) => (
                        <div key={appointment.$id} className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/55">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{appointment.reason_for_visit || "General consultation"}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {new Date(appointment.appointment_date).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                              </p>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Doctor: {appointment.doctorDetails?.fullName || "Not assigned"}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getStatusClass(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {appointments.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/60">
                          No appointment activity is available yet.
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardDescription>Diagnoses and prescriptions</CardDescription>
                    <CardTitle>Clinical overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Diagnoses</p>
                        {diagnoses.slice(0, 5).map((diagnosis) => (
                          <div key={diagnosis.$id} className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 dark:border-amber-900/60 dark:bg-amber-950/25">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="flex size-8 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                                    <Stethoscope className="size-4" />
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{diagnosis.diagnosisName}</p>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(diagnosis.diagnosedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                                  Authoring doctor: {diagnosis.doctorDetails?.fullName || "Clinic doctor"}
                                </p>
                                {diagnosis.doctorDetails?.specialty ? (
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {diagnosis.doctorDetails.specialty}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  {formatRecordAuditLabel(diagnosis.$createdAt, diagnosis.$updatedAt)}
                                </p>
                                {diagnosis.notes ? (
                                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{diagnosis.notes}</p>
                                ) : null}
                              </div>
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                {diagnosis.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {diagnoses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No diagnoses have been recorded yet.</p>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Prescriptions</p>
                        {prescriptions.slice(0, 5).map((prescription) => (
                          <div key={prescription.$id} className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="flex size-8 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                                    <Pill className="size-4" />
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{prescription.medicationName}</p>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {prescription.dosage} · {prescription.frequency}
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(prescription.prescribedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                                  Authoring doctor: {prescription.doctorDetails?.fullName || "Clinic doctor"}
                                </p>
                                {prescription.doctorDetails?.specialty ? (
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {prescription.doctorDetails.specialty}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  {formatRecordAuditLabel(prescription.$createdAt, prescription.$updatedAt)}
                                </p>
                                {prescription.instructions ? (
                                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{prescription.instructions}</p>
                                ) : null}
                              </div>
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                {prescription.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {prescriptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No prescriptions have been recorded yet.</p>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardDescription>Identity and Insurance</CardDescription>
                    <CardTitle>Coverage on file</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Insurance provider</p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-white">{patient?.insuranceProvider || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Policy number</p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-white">{patient?.insurancePolicyNumber || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Identification</p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-white">{patient?.identificationType || "No ID type"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{patient?.identificationNumber || "No ID number on file"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Stored document</p>
                      {patient?.identificationDocumentUrl ? (
                        <a href={patient.identificationDocumentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                          <FileBadge2 className="size-4" />
                          Open identification document
                        </a>
                      ) : (
                        <p className="mt-1 font-medium text-slate-900 dark:text-white">No document uploaded</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardDescription>Appointment file</CardDescription>
                    <CardTitle>{appointments.length} visits on file</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Completed visits</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{completedAppointments.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Upcoming visits</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{upcomingAppointments.length}</p>
                    </div>
                    <Link href="/patientsDashboard/appointments" className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white">
                      Open appointments
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardDescription>Needs Attention</CardDescription>
                    <CardTitle>Finish your record</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {missingItems.slice(0, 5).map((item) => (
                      <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/25">
                        <CircleAlert className="mt-0.5 size-4 text-amber-600 dark:text-amber-300" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Missing {item.label.toLowerCase()}</p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Add this detail from your profile to keep your record complete.</p>
                        </div>
                      </div>
                    ))}
                    {missingItems.length === 0 ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                        <CheckCircle2 className="mt-0.5 size-4 text-emerald-600 dark:text-emerald-300" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Your core record is complete</p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Insurance, identity, contact, and consent details are all present.</p>
                        </div>
                      </div>
                    ) : null}

                    <Link href="/profile" className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                      Update profile details
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </section>
    </PatientShell>
  )
}
