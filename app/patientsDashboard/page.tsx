"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  FileText,
  FolderHeart,
  MessageSquareText,
  ShieldCheck,
  Wallet,
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
  getPatientBillingPreferences,
  getPatientByUserId,
  getPatientSavedPaymentMethod,
} from "@/lib/actions/patient.action"
import { getCurrentPatientUserId } from "@/lib/patient-session"

type PatientDashboardData = {
  patient: Awaited<ReturnType<typeof getPatientByUserId>>
  appointments: Awaited<ReturnType<typeof listPatientAppointments>>
  billingPreferences: Awaited<ReturnType<typeof getPatientBillingPreferences>>
  savedPaymentMethod: Awaited<ReturnType<typeof getPatientSavedPaymentMethod>>
}

const quickLinks = [
  {
    href: "/patientsDashboard/appointments",
    label: "Appointments",
    description: "Book and manage visits",
    icon: CalendarCheck,
    accentClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    href: "/patientsDashboard/messages",
    label: "Messages",
    description: "Review doctor and admin notices",
    icon: MessageSquareText,
    accentClassName: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  {
    href: "/patientsDashboard/records",
    label: "Records",
    description: "Check profile and health information",
    icon: FolderHeart,
    accentClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    href: "/patientsDashboard/billing",
    label: "Billing",
    description: "Update payment and receipt preferences",
    icon: Wallet,
    accentClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
] as const

function getMonthKeyLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short" })
}

function buildAppointmentTrend(appointments: NonNullable<PatientDashboardData["appointments"]>) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index), 1)
    date.setHours(0, 0, 0, 0)

    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: getMonthKeyLabel(date),
      total: 0,
    }
  })

  const monthLookup = new Map(months.map((month) => [month.key, month]))

  appointments.forEach((appointment) => {
    const appointmentDate = new Date(appointment.appointment_date)
    if (Number.isNaN(appointmentDate.getTime())) {
      return
    }

    const key = `${appointmentDate.getFullYear()}-${appointmentDate.getMonth()}`
    const month = monthLookup.get(key)

    if (month) {
      month.total += 1
    }
  })

  return months
}

function getStatusClass(status: Status) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  }

  if (status === "cancelled" || status === "no-show") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
  }

  if (status === "confirmed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
}

function getNotificationLabel(kind: PatientNotificationKind) {
  if (kind === "doctor-message") {
    return "Doctor"
  }

  if (kind === "appointment-update") {
    return "Appointment"
  }

  if (kind === "emergency-message") {
    return "Urgent"
  }

  if (kind === "broadcast") {
    return "Broadcast"
  }

  if (kind === "status") {
    return "Status"
  }

  return "Admin"
}

export default function PatientDashboardPage() {
  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null)
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

    const loadDashboard = async () => {
      try {
        const [patient, appointments, billingPreferences, savedPaymentMethod] = await Promise.all([
          getPatientByUserId(patientUserId),
          listPatientAppointments(patientUserId, 50),
          getPatientBillingPreferences(patientUserId),
          getPatientSavedPaymentMethod(patientUserId),
        ])

        if (!isMounted) {
          return
        }

        setDashboardData({
          patient,
          appointments,
          billingPreferences,
          savedPaymentMethod,
        })
      } catch (error) {
        console.error("Failed to load patient dashboard", error)
        if (isMounted) {
          setErrorMessage("Failed to load your patient overview.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const appointments = dashboardData?.appointments || []
  const patient = dashboardData?.patient || null
  const notifications = patient?.adminNotifications || []
  const billingPreferences = dashboardData?.billingPreferences
  const savedPaymentMethod = dashboardData?.savedPaymentMethod

  const now = new Date()
  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) => new Date(appointment.appointment_date) >= now && appointment.status !== "cancelled" && appointment.status !== "no-show"),
    [appointments, now]
  )
  const completedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "completed"),
    [appointments]
  )
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.readAt),
    [notifications]
  )
  const doctorMessages = useMemo(
    () => notifications.filter((notification) => notification.kind === "doctor-message"),
    [notifications]
  )
  const appointmentUpdates = useMemo(
    () => notifications.filter((notification) => notification.kind === "appointment-update"),
    [notifications]
  )
  const urgentNotifications = useMemo(
    () => notifications.filter((notification) => notification.tone === "warning"),
    [notifications]
  )
  const recordSections = useMemo(() => {
    if (!patient) {
      return []
    }

    return [
      { label: "Allergies", filled: Boolean(patient.allergies) },
      { label: "Current medication", filled: Boolean(patient.currentMedication) },
      { label: "Family history", filled: Boolean(patient.familyMedicalHistory) },
      { label: "Past history", filled: Boolean(patient.pastMedicalHistory) },
      { label: "Insurance provider", filled: Boolean(patient.insuranceProvider) },
      { label: "Policy number", filled: Boolean(patient.insurancePolicyNumber) },
      { label: "Identification", filled: Boolean(patient.identificationNumber) },
      { label: "Uploaded document", filled: Boolean(patient.identificationDocumentUrl) },
    ]
  }, [patient])
  const completedRecordSections = recordSections.filter((section) => section.filled).length
  const recordCompletionRate = recordSections.length > 0 ? Math.round((completedRecordSections / recordSections.length) * 100) : 0
  const appointmentTrend = useMemo(() => buildAppointmentTrend(appointments), [appointments])
  const maxTrendValue = Math.max(...appointmentTrend.map((entry) => entry.total), 1)
  const nextAppointment = upcomingAppointments[0]

  return (
    <PatientShell pageTitle="My Dashboard" pageDescription="Track appointments, messages, records, and billing in one view.">
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
              Loading your patient overview...
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="bg-blue-50/75 dark:bg-blue-950/30">
                <CardHeader>
                  <CardDescription>Appointments</CardDescription>
                  <CardTitle>{upcomingAppointments.length} upcoming</CardTitle>
                  <CardAction>
                    <CalendarCheck className="size-7 text-blue-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {completedAppointments.length} completed visits and {appointments.length} total bookings recorded.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-indigo-50/75 dark:bg-indigo-950/30">
                <CardHeader>
                  <CardDescription>Messages</CardDescription>
                  <CardTitle>{unreadNotifications.length} unread</CardTitle>
                  <CardAction>
                    <Bell className="size-7 text-indigo-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {doctorMessages.length} doctor updates and {urgentNotifications.length} messages needing attention.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-50/75 dark:bg-emerald-950/30">
                <CardHeader>
                  <CardDescription>Records</CardDescription>
                  <CardTitle>{recordCompletionRate}% complete</CardTitle>
                  <CardAction>
                    <FileText className="size-7 text-emerald-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {completedRecordSections} of {recordSections.length || 8} key record fields are filled in.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-amber-50/80 dark:bg-amber-950/30">
                <CardHeader>
                  <CardDescription>Billing</CardDescription>
                  <CardTitle>{savedPaymentMethod ? "Payment ready" : "Needs setup"}</CardTitle>
                  <CardAction>
                    <CreditCard className="size-7 text-amber-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {billingPreferences?.emailReceipt ? "Receipts enabled." : "Receipts disabled."} {savedPaymentMethod ? savedPaymentMethod.referenceHint : "No payment method saved yet."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
              <Card className="overflow-hidden border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(238,242,255,0.82))] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.72))]">
                <CardHeader>
                  <CardDescription>Six-month activity</CardDescription>
                  <CardTitle>Appointments overview</CardTitle>
                  <CardAction>
                    <div className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                      {appointments.length} visits logged
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/45">
                      <div className="flex h-52 items-end gap-3">
                        {appointmentTrend.map((entry) => (
                          <div key={entry.key} className="flex flex-1 flex-col items-center gap-3">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{entry.total}</div>
                            <div className="flex h-36 w-full items-end rounded-2xl bg-slate-100 p-1 dark:bg-slate-900/70">
                              <div
                                className="w-full rounded-xl bg-[linear-gradient(180deg,#38bdf8,#2563eb)] transition-all"
                                style={{ height: `${Math.max((entry.total / maxTrendValue) * 100, entry.total > 0 ? 12 : 6)}%` }}
                              />
                            </div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{entry.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/45">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Next appointment</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                          {nextAppointment
                            ? new Date(nextAppointment.appointment_date).toLocaleString()
                            : "No upcoming appointment"}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {nextAppointment?.doctorDetails?.fullName
                            ? `With ${nextAppointment.doctorDetails.fullName}${nextAppointment.doctorDetails.specialty ? ` • ${nextAppointment.doctorDetails.specialty}` : ""}`
                            : "Book a visit to get care on your schedule."}
                        </p>
                        <Link href="/patientsDashboard/appointments" className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
                          Manage appointments
                        </Link>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/45">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Recent upcoming visits</p>
                        <div className="mt-4 space-y-3">
                          {upcomingAppointments.slice(0, 3).map((appointment) => (
                            <div key={appointment.$id} className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-900/70">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {appointment.doctorDetails?.fullName || "Assigned doctor pending"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                    {new Date(appointment.appointment_date).toLocaleString()}
                                  </p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getStatusClass(appointment.status)}`}>
                                  {appointment.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {upcomingAppointments.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              No upcoming visits scheduled.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(224,231,255,0.78))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(49,46,129,0.28))]">
                  <CardHeader>
                    <CardDescription>Inbox pulse</CardDescription>
                    <CardTitle>Messages at a glance</CardTitle>
                    <CardAction>
                      <Bell className="size-6 text-indigo-600" />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-950/45">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Unread</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{unreadNotifications.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-950/45">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Doctor</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{doctorMessages.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-950/45">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Updates</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{appointmentUpdates.length}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {notifications.slice(0, 3).map((notification) => (
                        <div key={notification.id} className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/45">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{notification.title}</p>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {getNotificationLabel(notification.kind)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          No messages yet.
                        </div>
                      ) : null}
                    </div>
                    <Link href="/patientsDashboard/messages" className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      Open inbox
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.82))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(6,95,70,0.28))]">
                  <CardHeader>
                    <CardDescription>Health record readiness</CardDescription>
                    <CardTitle>Records completion</CardTitle>
                    <CardAction>
                      <FolderHeart className="size-6 text-emerald-600" />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span>Profile coverage</span>
                        <span>{recordCompletionRate}%</span>
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#14b8a6)]" style={{ width: `${recordCompletionRate}%` }} />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {recordSections.map((section) => (
                        <div key={section.label} className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-950/45">
                          <span className="text-slate-700 dark:text-slate-200">{section.label}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${section.filled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {section.filled ? "Added" : "Missing"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link href="/patientsDashboard/records" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                      Review records
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,247,237,0.86))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(120,53,15,0.24))]">
                  <CardHeader>
                    <CardDescription>Billing readiness</CardDescription>
                    <CardTitle>Payments and receipts</CardTitle>
                    <CardAction>
                      <ShieldCheck className="size-6 text-amber-600" />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-950/45">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Payment method</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {savedPaymentMethod?.referenceHint || "No saved method"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-950/45">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Receipt preference</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {billingPreferences?.emailReceipt ? "Email receipts enabled" : "Email receipts disabled"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                      Ledger totals and invoice history are not persisted in this project yet, so this overview shows payment readiness rather than a fabricated balance.
                    </div>
                    <Link href="/patientsDashboard/billing" className="inline-flex text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                      Open billing settings
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.86))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.72))]">
              <CardHeader>
                <CardDescription>Quick access</CardDescription>
                <CardTitle>Patient workspace</CardTitle>
                <CardAction>
                  <CalendarClock className="size-6 text-slate-600 dark:text-slate-300" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {quickLinks.map((item) => {
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group rounded-3xl border border-slate-200/70 bg-white/85 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/45 dark:hover:border-slate-700"
                      >
                        <div className={`flex size-11 items-center justify-center rounded-2xl ${item.accentClassName}`}>
                          <Icon className="size-5" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </PatientShell>
  )
}
