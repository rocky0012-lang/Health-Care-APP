import Link from "next/link"
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Users,
} from "lucide-react"

import { AdminHeader } from "@/components/admin-header"
import { AdminDataWarningBanner } from "@/components/admin-data-warning-banner"
import { AdminSidebarNav } from "@/components/admin-sidebar-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminHeaderNavItems } from "@/lib/admin-navigation"
import { listAppointments } from "@/lib/actions/appointment.action"
import { listDoctors } from "@/lib/actions/doctor.action"
import { listPatients } from "@/lib/actions/patient.action"
import { loadSafeServerData } from "@/lib/safe-server-data"

export const dynamic = "force-dynamic"

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
]

const appointmentStatusTheme: Record<Status, { label: string; color: string; chipClassName: string }> = {
  scheduled: {
    label: "Scheduled",
    color: "#14b8a6",
    chipClassName: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  confirmed: {
    label: "Confirmed",
    color: "#22c55e",
    chipClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  completed: {
    label: "Completed",
    color: "#0f766e",
    chipClassName: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  },
  cancelled: {
    label: "Cancelled",
    color: "#f97316",
    chipClassName: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  },
  "no-show": {
    label: "No-show",
    color: "#ef4444",
    chipClassName: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
}

type DashboardPatient = Awaited<ReturnType<typeof listPatients>>[number]
type DashboardDoctor = Awaited<ReturnType<typeof listDoctors>>[number]
type DashboardAppointment = Awaited<ReturnType<typeof listAppointments>>[number]

function isDashboardStatus(value: unknown): value is Status {
  return (
    value === "scheduled" ||
    value === "confirmed" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "no-show"
  )
}

function parseAppointmentDate(value?: string) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatCompactDate(value?: string) {
  const parsed = parseAppointmentDate(value)

  if (!parsed) {
    return "No date"
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatTime(value?: string) {
  const parsed = parseAppointmentDate(value)

  if (!parsed) {
    return "Time pending"
  }

  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function getInitials(name?: string) {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "NA"
  )
}

function buildMonthlySeries(appointments: DashboardAppointment[], monthCount = 6) {
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const months = Array.from({ length: monthCount }, (_, index) => {
    const monthDate = new Date(
      startOfCurrentMonth.getFullYear(),
      startOfCurrentMonth.getMonth() - (monthCount - 1 - index),
      1
    )

    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      total: 0,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    }
  })

  const monthMap = new Map(months.map((month) => [month.key, month]))

  for (const appointment of appointments) {
    const appointmentDate = parseAppointmentDate(appointment.appointment_date)

    if (!appointmentDate) {
      continue
    }

    const key = `${appointmentDate.getFullYear()}-${appointmentDate.getMonth()}`
    const bucket = monthMap.get(key)

    if (!bucket) {
      continue
    }

    bucket.total += 1

    if (appointment.status === "scheduled") {
      bucket.scheduled += 1
    } else if (appointment.status === "confirmed") {
      bucket.confirmed += 1
    } else if (appointment.status === "completed") {
      bucket.completed += 1
    } else if (appointment.status === "cancelled") {
      bucket.cancelled += 1
    } else if (appointment.status === "no-show") {
      bucket.noShow += 1
    }
  }

  return months
}

function buildStatusChart(statusCounts: Record<Status, number>) {
  const segments = Object.entries(appointmentStatusTheme).map(([status, theme]) => ({
    status: status as Status,
    label: theme.label,
    color: theme.color,
    value: statusCounts[status as Status],
  }))

  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  if (total === 0) {
    return {
      total,
      segments,
      gradient: "conic-gradient(#dbe4e8 0deg 360deg)",
    }
  }

  let currentAngle = 0
  const gradient = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const nextAngle = currentAngle + (segment.value / total) * 360
      const slice = `${segment.color} ${currentAngle}deg ${nextAngle}deg`
      currentAngle = nextAngle
      return slice
    })
    .join(", ")

  return {
    total,
    segments,
    gradient: `conic-gradient(${gradient})`,
  }
}

function TrendBars({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1)

  return (
    <div className="flex h-12 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={`${index}-${value}`}
          className="flex-1 rounded-full bg-emerald-400/70"
          style={{ height: `${Math.max((value / maxValue) * 100, value > 0 ? 18 : 8)}%` }}
        />
      ))}
    </div>
  )
}

function MetricCard({
  title,
  value,
  accent,
  subtitle,
  trendValues,
}: {
  title: string
  value: string
  accent: string
  subtitle: string
  trendValues: number[]
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="text-slate-500 dark:text-slate-400">{title}</CardDescription>
            <CardTitle className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</CardTitle>
          </div>
          <div
            className="size-3 rounded-full shadow-[0_0_0_8px_rgba(255,255,255,0.65)] dark:shadow-[0_0_0_8px_rgba(15,23,42,0.4)]"
            style={{ backgroundColor: accent }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <TrendBars values={trendValues} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

async function getDashboardData() {
  const [patients, doctors, appointments] = await Promise.all([
    listPatients(500),
    listDoctors(500),
    listAppointments(500),
  ])

  const now = new Date()
  const monthlySeries = buildMonthlySeries(appointments)
  const sparkValues = monthlySeries.map((month) => month.total)
  const patientsActive = patients.filter((patient) => (patient.accountStatus || "active") === "active").length
  const doctorsActive = doctors.filter((doctor) => (doctor.accountStatus || "active") === "active").length
  const patientsAttention = patients.length - patientsActive
  const doctorsAttention = doctors.length - doctorsActive
  const appointmentsToday = appointments.filter((appointment) => {
    const date = parseAppointmentDate(appointment.appointment_date)
    return date ? isSameDay(date, now) : false
  })

  const statusCounts: Record<Status, number> = {
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    "no-show": 0,
  }

  for (const appointment of appointments) {
    if (isDashboardStatus(appointment.status)) {
      statusCounts[appointment.status] += 1
    }
  }

  const completionRate = appointments.length > 0 ? Math.round((statusCounts.completed / appointments.length) * 100) : 0
  const monthlyMax = Math.max(...monthlySeries.map((month) => month.total), 1)
  const statusChart = buildStatusChart(statusCounts)

  const specialtyCounts = Object.entries(
    doctors.reduce<Record<string, number>>((accumulator, doctor) => {
      const specialty = (doctor.specialty || doctor.specialization || "General practice").trim() || "General practice"
      accumulator[specialty] = (accumulator[specialty] || 0) + 1
      return accumulator
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)

  const topDoctorLoad = Object.entries(
    appointments.reduce<Record<string, number>>((accumulator, appointment) => {
      const doctorName = appointment.doctorDetails?.fullName || "Unassigned doctor"
      accumulator[doctorName] = (accumulator[doctorName] || 0) + 1
      return accumulator
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)

  const upcomingAppointments = appointments
    .filter((appointment) => {
      const date = parseAppointmentDate(appointment.appointment_date)
      return date && date >= now && (appointment.status === "scheduled" || appointment.status === "confirmed")
    })
    .sort((left, right) => {
      const leftTime = parseAppointmentDate(left.appointment_date)?.getTime() || 0
      const rightTime = parseAppointmentDate(right.appointment_date)?.getTime() || 0
      return leftTime - rightTime
    })
    .slice(0, 5)

  const bookingChannels = {
    web: appointments.filter((appointment) => appointment.booking_channel === "web").length,
    mobile: appointments.filter((appointment) => appointment.booking_channel === "mobile").length,
    phone: appointments.filter((appointment) => appointment.booking_channel === "phone").length,
  }

  return {
    patients,
    doctors,
    appointments,
    monthlySeries,
    monthlyMax,
    sparkValues,
    patientsActive,
    doctorsActive,
    patientsAttention,
    doctorsAttention,
    appointmentsToday,
    statusChart,
    completionRate,
    specialtyCounts,
    topDoctorLoad,
    upcomingAppointments,
    bookingChannels,
  }
}

function buildOverviewFallbackData() {
  const emptyMonthlySeries = buildMonthlySeries([])

  return {
    patients: [] as DashboardPatient[],
    doctors: [] as DashboardDoctor[],
    appointments: [] as DashboardAppointment[],
    monthlySeries: emptyMonthlySeries,
    monthlyMax: 1,
    sparkValues: emptyMonthlySeries.map((month) => month.total),
    patientsActive: 0,
    doctorsActive: 0,
    patientsAttention: 0,
    doctorsAttention: 0,
    appointmentsToday: [] as DashboardAppointment[],
    statusChart: buildStatusChart({
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      "no-show": 0,
    }),
    completionRate: 0,
    specialtyCounts: [] as Array<[string, number]>,
    topDoctorLoad: [] as Array<[string, number]>,
    upcomingAppointments: [] as DashboardAppointment[],
    bookingChannels: {
      web: 0,
      mobile: 0,
      phone: 0,
    },
  }
}

export default async function OverviewPage() {
  const overviewResult = await loadSafeServerData({
    load: getDashboardData,
    fallback: buildOverviewFallbackData,
    errorContext: "OverviewPage data load failed",
    defaultMessage: "The overview datasource is currently unreachable. Showing the page without live metrics.",
  })

  const {
    patients,
    doctors,
    appointments,
    monthlySeries,
    monthlyMax,
    sparkValues,
    patientsActive,
    doctorsActive,
    patientsAttention,
    doctorsAttention,
    appointmentsToday,
    statusChart,
    completionRate,
    specialtyCounts,
    topDoctorLoad,
    upcomingAppointments,
    bookingChannels,
  } = overviewResult.data
  const { dataUnavailable, dataErrorMessage } = overviewResult

  return (
    <SidebarProvider className="min-h-screen w-full flex-row items-stretch">
      <Sidebar
        collapsible="icon"
        className="border-r border-slate-300/80 bg-slate-200/90 [&_[data-sidebar=sidebar]]:bg-slate-200/90 dark:border-slate-700 dark:bg-slate-800/90 dark:[&_[data-sidebar=sidebar]]:bg-slate-800/90"
      >
        <SidebarHeader>
          <div className="px-2 py-3">
            <p className="text-lg font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              NetCare Admin
            </p>
            <p className="text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Clinic operations dashboard
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              <p className="text-lg font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Dashboard
              </p>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="flex-col gap-1">
                <AdminSidebarNav items={navItems} activeHref="/admin/overview" />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mb-4">
          <Link href="/" className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-700" title="Back to home">
            <LogOut className="size-5" />
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_22%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(240,253,244,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.1),_transparent_18%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(3,12,22,0.98))]">
        <AdminHeader
          pageTitle="Overview"
          pageDescription="Live clinic metrics built from your real patients, doctors, and appointments."
          subNavItems={adminHeaderNavItems.map((item) => ({
            ...item,
            active: item.href === "/admin/overview",
          }))}
        />

        <section className="space-y-6 p-4 md:p-6">
          {dataUnavailable ? (
            <AdminDataWarningBanner
              title="Live overview data is temporarily unavailable"
              message={dataErrorMessage}
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Patients"
              value={patients.length.toLocaleString()}
              accent="#10b981"
              subtitle={`${patientsActive} active records, ${patientsAttention} need admin attention.`}
              trendValues={sparkValues}
            />
            <MetricCard
              title="Doctors"
              value={doctors.length.toLocaleString()}
              accent="#0ea5e9"
              subtitle={`${doctorsActive} available, ${doctorsAttention} suspended or deactivated.`}
              trendValues={sparkValues.map((value, index) => Math.max(value - index, 0))}
            />
            <MetricCard
              title="Appointments Today"
              value={appointmentsToday.length.toLocaleString()}
              accent="#f59e0b"
              subtitle={`${appointments.filter((appointment) => appointment.status === "confirmed").length} confirmed appointments across all time.`}
              trendValues={monthlySeries.map((month) => month.confirmed + month.scheduled)}
            />
            <MetricCard
              title="Completion Rate"
              value={`${completionRate}%`}
              accent="#14b8a6"
              subtitle={`${appointments.filter((appointment) => appointment.status === "completed").length} appointments were completed.`}
              trendValues={monthlySeries.map((month) => month.completed)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Appointments flow</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Six-month appointment activity</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(appointmentStatusTheme).map(([status, theme]) => (
                    <span key={status} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${theme.chipClassName}`}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: theme.color }} />
                      {theme.label}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid h-[320px] grid-cols-6 items-end gap-4 rounded-[28px] bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.58))] p-5 dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.22),rgba(15,23,42,0.3))]">
                  {monthlySeries.map((month) => {
                    const segmentHeights = [
                      { key: "scheduled", value: month.scheduled, color: appointmentStatusTheme.scheduled.color },
                      { key: "confirmed", value: month.confirmed, color: appointmentStatusTheme.confirmed.color },
                      { key: "completed", value: month.completed, color: appointmentStatusTheme.completed.color },
                      { key: "cancelled", value: month.cancelled, color: appointmentStatusTheme.cancelled.color },
                      { key: "noShow", value: month.noShow, color: appointmentStatusTheme["no-show"].color },
                    ]

                    return (
                      <div key={month.key} className="flex h-full flex-col justify-end gap-3">
                        <div className="relative flex-1 overflow-hidden rounded-[22px] border border-white/70 bg-white/80 p-3 shadow-inner dark:border-slate-800/70 dark:bg-slate-950/65">
                          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col-reverse gap-[2px] px-3 pb-3 pt-6">
                            {segmentHeights.map((segment) => (
                              <div
                                key={segment.key}
                                className="rounded-full"
                                style={{
                                  backgroundColor: segment.color,
                                  height: `${month.total > 0 ? (segment.value / monthlyMax) * 100 : 0}%`,
                                  opacity: segment.value > 0 ? 1 : 0.12,
                                }}
                              />
                            ))}
                          </div>
                          <p className="relative z-10 text-xs font-medium text-slate-500 dark:text-slate-400">{month.total} total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{month.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
                <CardHeader>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Appointments status mix</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Operational distribution</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                  <div className="flex items-center justify-center">
                    <div className="relative size-52 rounded-full" style={{ background: statusChart.gradient }}>
                      <div className="absolute inset-[22px] flex items-center justify-center rounded-full bg-white/95 text-center shadow-inner dark:bg-slate-950/95">
                        <div>
                          <p className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{appointments.length}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">appointments tracked</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {statusChart.segments.map((segment) => (
                      <div key={segment.status} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/45">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="size-3 rounded-full" style={{ backgroundColor: segment.color }} />
                            <p className="font-medium text-slate-800 dark:text-slate-100">{segment.label}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{segment.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
                <CardHeader>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Booking channels</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">How patients are booking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(bookingChannels).map(([channel, count]) => {
                    const percentage = appointments.length > 0 ? Math.round((count / appointments.length) * 100) : 0

                    return (
                      <div key={channel} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-medium capitalize text-slate-800 dark:text-slate-100">{channel}</p>
                          <p className="text-slate-500 dark:text-slate-400">{count} bookings</p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#facc15)]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader>
                <CardDescription className="text-slate-500 dark:text-slate-400">Doctor distribution</CardDescription>
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Top specialties in the directory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {specialtyCounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No doctors available yet.
                  </div>
                ) : (
                  specialtyCounts.map(([specialty, count], index) => {
                    const width = Math.max((count / specialtyCounts[0][1]) * 100, 12)

                    return (
                      <div key={specialty} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{specialty}</p>
                          <p className="text-slate-500 dark:text-slate-400">{count} doctors</p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${width}%`,
                              background: index % 2 === 0 ? "linear-gradient(90deg,#14b8a6,#34d399)" : "linear-gradient(90deg,#0ea5e9,#22c55e)",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader>
                <CardDescription className="text-slate-500 dark:text-slate-400">Doctor workload</CardDescription>
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Highest appointment volume</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topDoctorLoad.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No appointment activity yet.
                  </div>
                ) : (
                  topDoctorLoad.map(([doctorName, count]) => {
                    const width = Math.max((count / topDoctorLoad[0][1]) * 100, 18)

                    return (
                      <div key={doctorName} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/45">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{doctorName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{count} visits</p>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#0ea5e9)]" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Upcoming queue</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Next active appointments</CardTitle>
                </div>
                <Link href="/admin/appointments" className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                  Open appointment management
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingAppointments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No upcoming confirmed or scheduled appointments.
                  </div>
                ) : (
                  upcomingAppointments.map((appointment) => {
                    const patientName = appointment.patientDetails?.fullName || "Patient"
                    const doctorName = appointment.doctorDetails?.fullName || "Doctor"
                    const appointmentStatus = isDashboardStatus(appointment.status) ? appointment.status : "scheduled"

                    return (
                      <div key={appointment.$id} className="flex flex-col gap-4 rounded-[24px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,253,245,0.84))] px-4 py-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.78),rgba(6,78,59,0.2))] md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                            {getInitials(patientName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{patientName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">with {doctorName}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 md:justify-end">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatCompactDate(appointment.appointment_date)}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(appointment.appointment_date)}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${appointmentStatusTheme[appointmentStatus].chipClassName}`}>
                            {appointmentStatusTheme[appointmentStatus].label}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
                <CardHeader>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Admin attention</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Accounts and operational alerts</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.9))] p-4 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.4),rgba(15,23,42,0.9))]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <Users className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Patients needing review</p>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{patientsAttention}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.9))] p-4 dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.55),rgba(15,23,42,0.9))]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
                        <Stethoscope className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Doctors needing review</p>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{doctorsAttention}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(255,255,255,0.9))] p-4 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.5),rgba(15,23,42,0.9))]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <CalendarDays className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cancelled visits</p>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{statusChart.segments.find((segment) => segment.status === "cancelled")?.value || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(239,68,68,0.14),rgba(255,255,255,0.9))] p-4 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.48),rgba(15,23,42,0.9))]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300">
                        <AlertTriangle className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">No-shows</p>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{statusChart.segments.find((segment) => segment.status === "no-show")?.value || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
                <CardHeader>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Snapshot</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Live system summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Registered patients</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{patients.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Listed doctors</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{doctors.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Tracked appointments</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{appointments.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Most active month in view</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{monthlySeries.reduce((best, month) => (month.total > best.total ? month : best), monthlySeries[0])?.label || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
