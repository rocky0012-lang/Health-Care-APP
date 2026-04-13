"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock3,
  Stethoscope,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DoctorShell } from "@/components/doctor-shell"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { listDoctorAppointments } from "@/lib/actions/appointment.action"
import { getDoctorByUserId } from "@/lib/actions/doctor.action"
import { getCurrentDoctorUserId } from "@/lib/doctor-session"

type DoctorDashboardData = {
  doctor: Awaited<ReturnType<typeof getDoctorByUserId>>
  appointments: Awaited<ReturnType<typeof listDoctorAppointments>>
}

type DoctorAppointmentRecord = Awaited<ReturnType<typeof listDoctorAppointments>>[number]

const quickLinks = [
  {
    href: "/doctor/patients",
    label: "My Patients",
    description: "Review your active roster and follow-up care.",
    icon: Users,
    accentClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    href: "/doctor/appointments",
    label: "Appointments",
    description: "Manage visits, statuses, and patient messages.",
    icon: CalendarDays,
    accentClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    href: "/doctor/schedule",
    label: "Schedule",
    description: "Update clinic coverage and working hours.",
    icon: Clock3,
    accentClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
] as const

const weekdayLabelByKey: Record<DoctorScheduleDayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
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

function getStatusLabel(status: Status) {
  if (status === "confirmed") {
    return "Confirmed"
  }

  if (status === "scheduled") {
    return "Scheduled"
  }

  if (status === "completed") {
    return "Checked in"
  }

  if (status === "cancelled") {
    return "Cancelled"
  }

  return "No-show"
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

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
  }

  return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
}

function getTaskToneClass(kind: "urgent" | "default" | "success") {
  if (kind === "urgent") {
    return "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/25"
  }

  if (kind === "success") {
    return "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25"
  }

  return "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40"
}

function isKnownAppointmentStatus(value: unknown): value is Status {
  return (
    value === "scheduled" ||
    value === "confirmed" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "no-show"
  )
}

function buildAppointmentsPerDay(appointments: DoctorAppointmentRecord[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    date.setHours(0, 0, 0, 0)

    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      total: 0,
    }
  })

  const dayLookup = new Map(days.map((day) => [day.key, day]))

  appointments.forEach((appointment) => {
    const date = new Date(appointment.appointment_date)
    if (Number.isNaN(date.getTime())) {
      return
    }

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const target = dayLookup.get(key)

    if (target) {
      target.total += 1
    }
  })

  return days
}

function buildSparklinePath(points: number[], width = 220, height = 72) {
  if (points.length === 0) {
    return ""
  }

  const max = Math.max(...points, 1)
  const stepX = points.length === 1 ? width : width / (points.length - 1)

  return points
    .map((point, index) => {
      const x = index * stepX
      const y = height - (point / max) * (height - 8) - 4
      return `${index === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")
}

export default function DoctorDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DoctorDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const doctorUserId = getCurrentDoctorUserId()

    if (!doctorUserId) {
      setErrorMessage("Doctor session is missing. Please sign in again.")
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadDashboard = async () => {
      try {
        const [doctor, appointments] = await Promise.all([
          getDoctorByUserId(doctorUserId),
          listDoctorAppointments(doctorUserId, 150),
        ])

        if (!isMounted) {
          return
        }

        setDashboardData({ doctor, appointments })
      } catch (error) {
        console.error("Failed to load doctor dashboard", error)
        if (isMounted) {
          setErrorMessage("Failed to load your doctor overview.")
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

  const doctor = dashboardData?.doctor || null
  const appointments = dashboardData?.appointments || []
  const now = new Date()
  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => {
      const date = new Date(appointment.appointment_date)
      return !Number.isNaN(date.getTime()) && isSameLocalDay(date, now)
    }).sort((left, right) => getAppointmentTimestamp(left) - getAppointmentTimestamp(right)),
    [appointments, now]
  )
  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "scheduled" || appointment.status === "confirmed"),
    [appointments]
  )
  const completedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "completed"),
    [appointments]
  )
  const attentionAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "cancelled" || appointment.status === "no-show"),
    [appointments]
  )
  const patientMap = useMemo(() => {
    const uniquePatients = new Map<string, {
      id: string
      fullName: string
      phone?: string
      avatarUrl?: string
      appointmentCount: number
      lastVisitAt?: string
    }>()

    appointments.forEach((appointment) => {
      const patientId = appointment.patientDetails?.id || (typeof appointment.patient !== "string" ? appointment.patient?.$id : "") || appointment.$id
      const fullName = appointment.patientDetails?.fullName || "Patient"
      const existing = uniquePatients.get(patientId)

      uniquePatients.set(patientId, {
        id: patientId,
        fullName,
        phone: appointment.patientDetails?.phone || existing?.phone,
        avatarUrl: appointment.patientDetails?.avatarUrl || existing?.avatarUrl,
        appointmentCount: (existing?.appointmentCount || 0) + 1,
        lastVisitAt: existing?.lastVisitAt
          ? (getAppointmentTimestamp(appointment) > new Date(existing.lastVisitAt).getTime() ? appointment.appointment_date : existing.lastVisitAt)
          : appointment.appointment_date,
      })
    })

    return Array.from(uniquePatients.values()).sort((left, right) => (right.appointmentCount - left.appointmentCount))
  }, [appointments])
  const weeklySchedule = doctor?.weeklySchedule
  const enabledScheduleDays = useMemo(
    () => weeklySchedule
      ? (Object.entries(weeklySchedule)
          .filter(([, day]) => day.enabled)
          .map(([key, day]) => ({ key: key as DoctorScheduleDayKey, ...day })))
      : [],
    [weeklySchedule]
  )
  const totalScheduleHours = useMemo(() => enabledScheduleDays.reduce((total, day) => {
    const [startHour, startMinute] = day.startTime.split(":").map(Number)
    const [endHour, endMinute] = day.endTime.split(":").map(Number)
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute
    return total + Math.max(end - start, 0) / 60
  }, 0), [enabledScheduleDays])
  const unreadNotifications = doctor?.adminNotifications?.filter((notification) => !notification.readAt) || []
  const dailyTrend = useMemo(() => buildAppointmentsPerDay(appointments), [appointments])
  const sparklinePath = useMemo(() => buildSparklinePath(dailyTrend.map((entry) => entry.total)), [dailyTrend])
  const maxDailyTotal = Math.max(...dailyTrend.map((entry) => entry.total), 1)
  const taskItems = useMemo(() => {
    const tasks: Array<{
      id: string
      title: string
      subtitle: string
      kind: "urgent" | "default" | "success"
      href: string
      ctaLabel: string
    }> = []

    todayAppointments.slice(0, 3).forEach((appointment) => {
      tasks.push({
        id: `today-${appointment.$id}`,
        title: `Prepare for ${appointment.patientDetails?.fullName || "patient"}`,
        subtitle: appointment.appointment_date ? new Date(appointment.appointment_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Today",
        kind: appointment.status === "scheduled" ? "default" : appointment.status === "confirmed" ? "success" : "urgent",
        href: "/doctor/appointments",
        ctaLabel: "Open visit",
      })
    })

    if (enabledScheduleDays.length === 0) {
      tasks.push({
        id: "schedule-empty",
        title: "Set your weekly schedule",
        subtitle: "No clinic days are enabled right now.",
        kind: "urgent",
        href: "/doctor/schedule",
        ctaLabel: "Update schedule",
      })
    } else if (totalScheduleHours < 20) {
      tasks.push({
        id: "schedule-light",
        title: "Review clinic coverage",
        subtitle: `${totalScheduleHours.toFixed(1)} hours are configured this week.`,
        kind: "default",
        href: "/doctor/schedule",
        ctaLabel: "Adjust hours",
      })
    }

    unreadNotifications.slice(0, 1).forEach((notification) => {
      tasks.push({
        id: notification.id,
        title: notification.title,
        subtitle: notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Admin notice",
        kind: notification.tone === "warning" ? "urgent" : notification.tone === "success" ? "success" : "default",
        href: "/doctor/profile",
        ctaLabel: "View profile",
      })
    })

    attentionAppointments.slice(0, 2).forEach((appointment) => {
      tasks.push({
        id: `attention-${appointment.$id}`,
        title: `Resolve ${appointment.patientDetails?.fullName || "patient"} visit`,
        subtitle: getStatusLabel(appointment.status),
        kind: "urgent",
        href: "/doctor/appointments",
        ctaLabel: "Review visit",
      })
    })

    return tasks.slice(0, 5)
  }, [attentionAppointments, enabledScheduleDays.length, todayAppointments, totalScheduleHours, unreadNotifications])
  const statusSummary = useMemo(() => {
    const counts: Record<Status, number> = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      "no-show": 0,
    }

    appointments.forEach((appointment) => {
      if (isKnownAppointmentStatus(appointment.status)) {
        counts[appointment.status] += 1
      }
    })

    return counts
  }, [appointments])

  return (
    <DoctorShell
      pageTitle="My Dashboard"
      pageDescription="View your schedule, patient list, and daily activity."
    >
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
              Loading your doctor overview...
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_340px]">
              <Card className="overflow-hidden border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,255,0.88))] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.74))]">
                <CardHeader>
                  <CardDescription>Today&apos;s appointments</CardDescription>
                  <CardTitle>Current queue</CardTitle>
                  <CardAction>
                    <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">
                      {todayAppointments.length} today
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {todayAppointments.slice(0, 3).map((appointment, index) => {
                      const patientName = appointment.patientDetails?.fullName || "Patient"
                      const appointmentTime = appointment.appointment_date
                        ? new Date(appointment.appointment_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                        : "Time pending"
                      const isPrimary = index === 0

                      return (
                        <div
                          key={appointment.$id}
                          className={`rounded-[24px] border p-4 transition-colors ${
                            isPrimary
                              ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                              : "border-slate-200 bg-white/85 text-slate-900 dark:border-slate-800 dark:bg-slate-950/45 dark:text-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold">{appointment.reason_for_visit || "Consultation"}</p>
                              <p className={`mt-2 text-sm ${isPrimary ? "text-emerald-300 dark:text-emerald-700" : "text-slate-500 dark:text-slate-400"}`}>
                                {getStatusLabel(appointment.status)}
                              </p>
                            </div>
                            <div className={`flex size-9 items-center justify-center rounded-full ${isPrimary ? "bg-white/10 dark:bg-slate-950/10" : "bg-slate-100 dark:bg-slate-900"}`}>
                              <ChevronRight className="size-4" />
                            </div>
                          </div>

                          <div className="mt-6 flex items-center gap-3">
                            <Avatar className="size-10">
                              <AvatarImage src={appointment.patientDetails?.avatarUrl || ""} alt={patientName} />
                              <AvatarFallback className={isPrimary ? "bg-white/15 text-white dark:bg-slate-950/15 dark:text-slate-950" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}>
                                {getInitials(patientName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{patientName}</p>
                              <p className={`text-xs ${isPrimary ? "text-white/70 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
                                {appointmentTime} · {appointment.time_slot || "slot pending"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {todayAppointments.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/85 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-400 lg:col-span-3">
                        No appointments are scheduled for today.
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.42)] dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(17,24,39,0.86))]">
                <CardHeader>
                  <CardDescription>Today&apos;s tasks</CardDescription>
                  <CardTitle>Action list</CardTitle>
                  <CardAction>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      Pending {taskItems.length}
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  {taskItems.map((task) => (
                    <Link key={task.id} href={task.href} className={`block rounded-[22px] border px-4 py-4 transition-transform hover:-translate-y-0.5 ${getTaskToneClass(task.kind)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{task.subtitle}</p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                            {task.ctaLabel}
                          </p>
                        </div>
                        <div className="mt-1 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                          <ChevronRight className="size-4" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {taskItems.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      No urgent tasks right now.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="relative overflow-hidden bg-blue-50/80 dark:bg-blue-950/30">
                <CardHeader>
                  <CardDescription>My Patients</CardDescription>
                  <CardTitle>{patientMap.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Unique patients seen across your appointment history.</p>
                  <svg viewBox="0 0 220 72" className="mt-4 h-16 w-full opacity-75">
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-300 dark:text-blue-400" />
                  </svg>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-emerald-50/80 dark:bg-emerald-950/30">
                <CardHeader>
                  <CardDescription>Completed Visits</CardDescription>
                  <CardTitle>{completedAppointments.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Patients you have already seen and closed out.</p>
                  <svg viewBox="0 0 220 72" className="mt-4 h-16 w-full opacity-75">
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-300 dark:text-emerald-400" />
                  </svg>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-amber-50/85 dark:bg-amber-950/30">
                <CardHeader>
                  <CardDescription>Critical Alerts</CardDescription>
                  <CardTitle>{attentionAppointments.length + unreadNotifications.filter((item) => item.tone === "warning").length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Cancelled visits, no-shows, and warning notices.</p>
                  <svg viewBox="0 0 220 72" className="mt-4 h-16 w-full opacity-75">
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-300 dark:text-amber-400" />
                  </svg>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-violet-50/80 dark:bg-violet-950/30">
                <CardHeader>
                  <CardDescription>Schedule Coverage</CardDescription>
                  <CardTitle>{enabledScheduleDays.length} days</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{totalScheduleHours.toFixed(1)} hours configured across your weekly schedule.</p>
                  <svg viewBox="0 0 220 72" className="mt-4 h-16 w-full opacity-75">
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-violet-300 dark:text-violet-400" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_320px]">
              <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.82))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(6,78,59,0.24))]">
                <CardHeader>
                  <CardDescription>My Patients</CardDescription>
                  <CardTitle>Roster snapshot</CardTitle>
                  <CardAction>
                    <Users className="size-6 text-emerald-600" />
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {patientMap.slice(0, 5).map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/85 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/45">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarImage src={patient.avatarUrl || ""} alt={patient.fullName} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {getInitials(patient.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{patient.fullName}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{patient.phone || "No phone on file"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.appointmentCount}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">visits</p>
                        </div>
                      </div>
                    ))}
                    {patientMap.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No patient history is linked to this doctor account yet.
                      </div>
                    ) : null}
                  </div>
                  <Link href="/doctor/patients" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                    Open My Patients
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.84))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,64,175,0.18))]">
                <CardHeader>
                  <CardDescription>Appointments</CardDescription>
                  <CardTitle>Status overview</CardTitle>
                  <CardAction>
                    <CalendarRange className="size-6 text-blue-600" />
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  {([
                    ["scheduled", statusSummary.scheduled],
                    ["confirmed", statusSummary.confirmed],
                    ["completed", statusSummary.completed],
                    ["cancelled", statusSummary.cancelled],
                    ["no-show", statusSummary["no-show"]],
                  ] as Array<[Status, number]>).map(([status, count]) => (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{status}</span>
                        <span className="text-slate-500 dark:text-slate-400">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            status === "completed"
                              ? "bg-emerald-500"
                              : status === "confirmed"
                                ? "bg-blue-500"
                                : status === "scheduled"
                                  ? "bg-amber-500"
                                  : status === "cancelled"
                                    ? "bg-rose-500"
                                    : "bg-slate-500"
                          }`}
                          style={{ width: `${appointments.length > 0 ? (count / appointments.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-slate-200/70 bg-white/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/45">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Workload over the last 7 days</p>
                    <div className="mt-4 flex h-36 items-end gap-3">
                      {dailyTrend.map((entry) => (
                        <div key={entry.key} className="flex flex-1 flex-col items-center gap-2">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{entry.total}</div>
                          <div className="flex h-24 w-full items-end rounded-2xl bg-slate-100 p-1 dark:bg-slate-900/70">
                            <div className="w-full rounded-xl bg-[linear-gradient(180deg,#60a5fa,#2563eb)]" style={{ height: `${Math.max((entry.total / maxDailyTotal) * 100, entry.total > 0 ? 14 : 6)}%` }} />
                          </div>
                          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{entry.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href="/doctor/appointments" className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
                    Open appointments workspace
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,247,237,0.84))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(120,53,15,0.20))]">
                <CardHeader>
                  <CardDescription>Schedule</CardDescription>
                  <CardTitle>Weekly availability</CardTitle>
                  <CardAction>
                    <Clock3 className="size-6 text-amber-600" />
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {enabledScheduleDays.map((day) => (
                      <div key={day.key} className="rounded-2xl border border-slate-200/70 bg-white/85 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/45">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{weekdayLabelByKey[day.key]}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{day.startTime} - {day.endTime}</p>
                          </div>
                          <div className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            Enabled
                          </div>
                        </div>
                      </div>
                    ))}
                    {enabledScheduleDays.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No weekdays are enabled in your schedule yet.
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white dark:bg-white dark:text-slate-950">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/60 dark:text-slate-600">Coverage summary</p>
                    <p className="mt-2 text-2xl font-semibold">{totalScheduleHours.toFixed(1)} hrs</p>
                    <p className="mt-1 text-sm text-white/75 dark:text-slate-600">Configured across {enabledScheduleDays.length || 0} working days.</p>
                  </div>

                  <Link href="/doctor/schedule" className="inline-flex text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                    Update schedule
                  </Link>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.74))]">
              <CardHeader>
                <CardDescription>Workspace shortcuts</CardDescription>
                <CardTitle>Doctor tools</CardTitle>
                <CardAction>
                  <Stethoscope className="size-6 text-slate-700 dark:text-slate-200" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {quickLinks.map((item) => {
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group rounded-3xl border border-slate-200/70 bg-white/88 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/45 dark:hover:border-slate-700"
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
    </DoctorShell>
  )
}
