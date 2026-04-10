import Link from "next/link"
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  TrendingUp,
  Stethoscope,
  Users,
} from "lucide-react"
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
import { AdminHeader } from "@/components/admin-header"
import { AdminDataWarningBanner } from "@/components/admin-data-warning-banner"
import { AdminSidebarNav } from "@/components/admin-sidebar-nav"
import { adminHeaderNavItems } from "@/lib/admin-navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listAppointments } from "@/lib/actions/appointment.action"
import { listDoctors } from "@/lib/actions/doctor.action"
import { loadSafeServerData } from "@/lib/safe-server-data"

export const dynamic = "force-dynamic"

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
]

type ReportAppointment = Awaited<ReturnType<typeof listAppointments>>[number]
type ReportDoctor = Awaited<ReturnType<typeof listDoctors>>[number]

function isReportStatus(value: unknown): value is Status {
  return (
    value === "scheduled" ||
    value === "confirmed" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "no-show"
  )
}

function parseDate(value?: string) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function buildMonthlyOutcomeSeries(appointments: ReportAppointment[], monthCount = 6) {
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
      completed: 0,
      active: 0,
      leakage: 0,
    }
  })

  const monthMap = new Map(months.map((month) => [month.key, month]))

  for (const appointment of appointments) {
    const appointmentDate = parseDate(appointment.appointment_date)

    if (!appointmentDate || !isReportStatus(appointment.status)) {
      continue
    }

    const bucket = monthMap.get(`${appointmentDate.getFullYear()}-${appointmentDate.getMonth()}`)

    if (!bucket) {
      continue
    }

    if (appointment.status === "completed") {
      bucket.completed += 1
    } else if (appointment.status === "scheduled" || appointment.status === "confirmed") {
      bucket.active += 1
    } else if (appointment.status === "cancelled" || appointment.status === "no-show") {
      bucket.leakage += 1
    }
  }

  return months
}

function buildDoctorReports(doctors: ReportDoctor[], appointments: ReportAppointment[]) {
  const reports = doctors.map((doctor) => {
    const doctorAppointments = appointments.filter(
      (appointment) => appointment.doctorDetails?.id === doctor.$id
    )

    const completed = doctorAppointments.filter((appointment) => appointment.status === "completed").length
    const confirmed = doctorAppointments.filter((appointment) => appointment.status === "confirmed").length
    const scheduled = doctorAppointments.filter((appointment) => appointment.status === "scheduled").length
    const cancelled = doctorAppointments.filter((appointment) => appointment.status === "cancelled").length
    const noShow = doctorAppointments.filter((appointment) => appointment.status === "no-show").length
    const uniquePatients = new Set(
      doctorAppointments.map((appointment) => appointment.patientDetails?.id).filter(Boolean)
    ).size
    const completedOrLost = completed + cancelled + noShow
    const completionRate = completedOrLost > 0 ? (completed / completedOrLost) * 100 : 0
    const throughputScore = completed * 3 + confirmed * 2 + scheduled - cancelled - noShow

    return {
      id: doctor.$id,
      name: doctor.name || doctor.fullName || "Doctor",
      specialty: doctor.specialty || doctor.specialization || "General practice",
      totalAppointments: doctorAppointments.length,
      completed,
      confirmed,
      scheduled,
      cancelled,
      noShow,
      uniquePatients,
      completionRate,
      throughputScore,
      accountStatus: doctor.accountStatus || "active",
    }
  })

  return reports.sort((left, right) => {
    if (right.completed !== left.completed) {
      return right.completed - left.completed
    }

    if (right.completionRate !== left.completionRate) {
      return right.completionRate - left.completionRate
    }

    return right.totalAppointments - left.totalAppointments
  })
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string
  value: string
  subtitle: string
  accent: string
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
      <CardHeader>
        <CardDescription className="text-slate-500 dark:text-slate-400">{title}</CardDescription>
        <div className="mt-2 flex items-start justify-between gap-3">
          <CardTitle className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</CardTitle>
          <div className="size-3 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function buildReportsFallbackData() {
  return {
    appointments: [] as ReportAppointment[],
    doctors: [] as ReportDoctor[],
  }
}

export default async function ReportsPage() {
  const reportsResult = await loadSafeServerData({
    load: async () => {
      const [appointments, doctors] = await Promise.all([listAppointments(500), listDoctors(500)])

      return {
        appointments,
        doctors,
      }
    },
    fallback: buildReportsFallbackData,
    errorContext: "ReportsPage data load failed",
    defaultMessage: "The reports datasource is currently unreachable. Showing the page without live metrics.",
  })

  const { appointments, doctors } = reportsResult.data
  const { dataUnavailable, dataErrorMessage } = reportsResult

  const doctorReports = buildDoctorReports(doctors, appointments)
  const topDoctors = doctorReports.slice(0, 6)
  const monthlyOutcomes = buildMonthlyOutcomeSeries(appointments)
  const monthlyMax = Math.max(
    ...monthlyOutcomes.map((month) => month.completed + month.active + month.leakage),
    1
  )
  const completedAppointments = appointments.filter((appointment) => appointment.status === "completed").length
  const cancelledAppointments = appointments.filter((appointment) => appointment.status === "cancelled").length
  const noShowAppointments = appointments.filter((appointment) => appointment.status === "no-show").length
  const activeAppointments = appointments.filter(
    (appointment) => appointment.status === "scheduled" || appointment.status === "confirmed"
  ).length
  const leakageCount = cancelledAppointments + noShowAppointments
  const activeDoctors = doctors.filter((doctor) => (doctor.accountStatus || "active") === "active").length
  const doctorsWithCompletedVisits = doctorReports.filter((doctor) => doctor.completed > 0).length
  const realizedRevenueRecords = 0
  const revenueCoverageRate = 0
  const averageCompletionRate =
    doctorReports.length > 0
      ? doctorReports.reduce((sum, doctor) => sum + doctor.completionRate, 0) / doctorReports.length
      : 0
  const topThroughput = topDoctors[0]?.throughputScore || 0

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
                <AdminSidebarNav items={navItems} activeHref="/admin/reports" />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mb-4">
          <Link href="/" className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" title="Back to home">
            <LogOut className="size-5" />
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_20%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.1),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_18%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(3,7,18,0.98))]">
        <AdminHeader
          pageTitle="Reports"
          pageDescription="Doctor performance, operational health, and revenue-readiness reporting built from real project data."
          subNavItems={adminHeaderNavItems.map((item) => ({
            ...item,
            active: item.href === "/admin/reports",
          }))}
        />

        <section className="space-y-6 p-4 md:p-6">
          {dataUnavailable ? (
            <AdminDataWarningBanner
              title="Live report data is temporarily unavailable"
              message={dataErrorMessage}
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Doctor Performance"
              value={topDoctors.length > 0 ? formatPercent(averageCompletionRate) : "0%"}
              subtitle={`${doctorsWithCompletedVisits} doctors have completed visits on record.`}
              accent="#0ea5e9"
            />
            <MetricCard
              title="Chargeable Activity"
              value={completedAppointments.toLocaleString()}
              subtitle="Completed appointments are the closest real revenue signal currently stored."
              accent="#10b981"
            />
            <MetricCard
              title="Revenue Coverage"
              value={`${revenueCoverageRate}%`}
              subtitle="No invoice, payment, or fee records exist yet in the current schema."
              accent="#f59e0b"
            />
            <MetricCard
              title="Leakage Risk"
              value={leakageCount.toLocaleString()}
              subtitle="Cancelled and no-show appointments reduce downstream billing opportunity."
              accent="#ef4444"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.9fr)]">
            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Doctor leaderboard</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Performance by assigned appointment volume</CardTitle>
                </div>
                <Link href="/admin/doctors" className="text-sm font-medium text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200">
                  Open doctor directory
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {topDoctors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No doctor activity is available yet.
                  </div>
                ) : (
                  topDoctors.map((doctor) => {
                    const completedWidth = doctor.totalAppointments > 0 ? (doctor.completed / doctor.totalAppointments) * 100 : 0
                    const activeWidth = doctor.totalAppointments > 0 ? ((doctor.confirmed + doctor.scheduled) / doctor.totalAppointments) * 100 : 0
                    const leakageWidth = doctor.totalAppointments > 0 ? ((doctor.cancelled + doctor.noShow) / doctor.totalAppointments) * 100 : 0

                    return (
                      <div key={doctor.id} className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.8))] p-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.85),rgba(3,105,161,0.12))]">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-900 dark:text-white">{doctor.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {doctor.completed} completed
                            </span>
                            <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                              {doctor.confirmed + doctor.scheduled} active
                            </span>
                            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              {doctor.cancelled + doctor.noShow} leakage
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="flex h-full w-full">
                            <div className="h-full bg-emerald-500" style={{ width: `${completedWidth}%` }} />
                            <div className="h-full bg-sky-500" style={{ width: `${activeWidth}%` }} />
                            <div className="h-full bg-red-500" style={{ width: `${leakageWidth}%` }} />
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Completion</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatPercent(doctor.completionRate)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Patients served</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.uniquePatients}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Total visits</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.totalAppointments}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Throughput score</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.throughputScore}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
                <CardHeader>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Revenue report</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Revenue readiness and billing coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[28px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(254,243,199,0.82),rgba(255,255,255,0.94))] p-5 dark:border-amber-900/50 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.32),rgba(15,23,42,0.92))]">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Billing data is not stored yet</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          The current project has no invoice, payment, charge, fee, or claim tables, so the report cannot calculate real revenue yet.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50/80 px-4 py-4 dark:bg-slate-950/45">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Revenue-tracked records</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{realizedRevenueRecords}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50/80 px-4 py-4 dark:bg-slate-950/45">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Coverage rate</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{revenueCoverageRate}%</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-100">Completed visits available for billing</p>
                        <p className="text-slate-500 dark:text-slate-400">{completedAppointments}</p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#34d399)]" style={{ width: `${appointments.length > 0 ? (completedAppointments / appointments.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-100">Lost opportunity from cancellations and no-shows</p>
                        <p className="text-slate-500 dark:text-slate-400">{leakageCount}</p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#ef4444)]" style={{ width: `${appointments.length > 0 ? (leakageCount / appointments.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
                <CardHeader>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Report summary</CardDescription>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Operational reporting snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Active doctors</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeDoctors}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Scheduled or confirmed visits</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Completed visits</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{completedAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-slate-950/45">
                    <span className="text-slate-500 dark:text-slate-400">Top throughput score</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{topThroughput}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader>
                <CardDescription className="text-slate-500 dark:text-slate-400">Outcome trend</CardDescription>
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Monthly delivery versus leakage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid h-[320px] grid-cols-6 items-end gap-4 rounded-[28px] bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(255,255,255,0.62))] p-5 dark:bg-[linear-gradient(180deg,rgba(8,47,73,0.26),rgba(15,23,42,0.32))]">
                  {monthlyOutcomes.map((month) => {
                    const total = month.completed + month.active + month.leakage

                    return (
                      <div key={month.key} className="flex h-full flex-col justify-end gap-3">
                        <div className="relative flex-1 overflow-hidden rounded-[22px] border border-white/70 bg-white/80 p-3 shadow-inner dark:border-slate-800/70 dark:bg-slate-950/65">
                          <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse gap-[2px] px-3 pb-3 pt-6">
                            <div className="rounded-full bg-red-500" style={{ height: `${(month.leakage / monthlyMax) * 100}%`, opacity: month.leakage > 0 ? 1 : 0.12 }} />
                            <div className="rounded-full bg-sky-500" style={{ height: `${(month.active / monthlyMax) * 100}%`, opacity: month.active > 0 ? 1 : 0.12 }} />
                            <div className="rounded-full bg-emerald-500" style={{ height: `${(month.completed / monthlyMax) * 100}%`, opacity: month.completed > 0 ? 1 : 0.12 }} />
                          </div>
                          <p className="relative z-10 text-xs font-medium text-slate-500 dark:text-slate-400">{total} total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{month.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <span className="size-2 rounded-full bg-sky-500" />
                    Active pipeline
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    <span className="size-2 rounded-full bg-red-500" />
                    Leakage
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
              <CardHeader>
                <CardDescription className="text-slate-500 dark:text-slate-400">What this report measures</CardDescription>
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Required reporting areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl bg-slate-50/80 px-4 py-4 dark:bg-slate-950/45">
                  <p className="font-semibold text-slate-900 dark:text-white">Doctor performance</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    Based on real appointment totals, completion rate, active pipeline, cancelled visits, and no-shows per doctor.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 px-4 py-4 dark:bg-slate-950/45">
                  <p className="font-semibold text-slate-900 dark:text-white">Revenue readiness</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    Uses completed appointments and leakage indicators as leading signals while true billing records are not yet captured.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 px-4 py-4 dark:bg-slate-950/45">
                  <p className="font-semibold text-slate-900 dark:text-white">Operational health</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    Highlights doctor availability, active visit pipeline, and missed billing opportunity from cancellations and no-shows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardDescription className="text-slate-500 dark:text-slate-400">Doctor report table</CardDescription>
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Detailed doctor performance report</CardTitle>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <TrendingUp className="size-3.5" />
                Sorted by completed visits and efficiency
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctorReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No doctor reports can be generated until doctors and appointments exist.
                </div>
              ) : (
                doctorReports.map((doctor) => (
                  <div key={doctor.id} className="grid gap-4 rounded-[24px] border border-slate-200/70 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/45 md:grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,0.6fr))] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{doctor.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Completed</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.completed}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Active</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.confirmed + doctor.scheduled}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Leakage</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.cancelled + doctor.noShow}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Patients</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{doctor.uniquePatients}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Completion</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatPercent(doctor.completionRate)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
