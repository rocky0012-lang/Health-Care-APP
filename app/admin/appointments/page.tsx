"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Users,
} from "lucide-react"

import { AdminHeader } from "@/components/admin-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { adminHeaderNavItems } from "@/lib/admin-navigation"
import { listAppointments, updateAppointmentStatus } from "@/lib/actions/appointment.action"

type AdminAppointmentRecord = Awaited<ReturnType<typeof listAppointments>>[number]

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
]

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
      .join("") || "NA"
  )
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointmentRecord[]>([])
  const [draftStatuses, setDraftStatuses] = useState<Record<string, Status>>({})
  const [savingAppointmentId, setSavingAppointmentId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [saveMessage, setSaveMessage] = useState("")

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const rows = await listAppointments(150)
        setAppointments(rows)
        setDraftStatuses(
          rows.reduce<Record<string, Status>>((accumulator, appointment) => {
            accumulator[appointment.$id] = appointment.status
            return accumulator
          }, {})
        )
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load appointments.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadAppointments()
  }, [])

  const todayAppointments = useMemo(() => {
    const now = new Date()

    return appointments.filter((appointment) => {
      const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
      return appointmentDate && !Number.isNaN(appointmentDate.getTime()) && isSameLocalDay(appointmentDate, now)
    })
  }, [appointments])

  const thisWeekAppointments = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    return appointments.filter((appointment) => {
      const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
      return (
        appointmentDate &&
        !Number.isNaN(appointmentDate.getTime()) &&
        appointmentDate >= now &&
        appointmentDate <= nextWeek
      )
    })
  }, [appointments])

  const attentionCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "cancelled" || appointment.status === "no-show").length,
    [appointments]
  )

  const handleStatusSave = async (appointmentId: string) => {
    const nextStatus = draftStatuses[appointmentId]

    if (!nextStatus) {
      return
    }

    setSavingAppointmentId(appointmentId)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const updatedAppointment = await updateAppointmentStatus({
        appointmentId,
        status: nextStatus,
        actorRole: "admin",
      })

      if (!updatedAppointment) {
        throw new Error("Appointment update returned no data.")
      }

      setAppointments((current) =>
        current.map((appointment) => (appointment.$id === appointmentId ? updatedAppointment : appointment))
      )
      setSaveMessage("Appointment status updated.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update appointment status.")
    } finally {
      setSavingAppointmentId("")
    }
  }

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
                {navItems.map((item) => {
                  const isActive = item.href === "/admin/appointments"
                  return (
                    <SidebarMenuItem key={item.label}>
                      <div
                        className={`rounded-md transition-colors ${
                          isActive ? "bg-blue-500" : "hover:bg-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:justify-center"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className={`group-data-[collapsible=icon]:hidden ${isActive ? "text-white" : ""}`}>
                              {item.label}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </div>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mb-4">
          <Link
            href="/"
            className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-700"
            title="Back to home"
          >
            <LogOut className="size-5" />
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-slate-50/50 dark:bg-slate-950">
        <AdminHeader
          pageTitle="Appointments"
          pageDescription="View and manage all appointments."
          subNavItems={adminHeaderNavItems.map((item) => ({
            ...item,
            active: item.href === "/admin/appointments",
          }))}
        />

        <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Card>
            <CardHeader>
              <CardDescription>Scheduled Today</CardDescription>
              <CardTitle>{todayAppointments.length} appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Confirmed and scheduled visits happening today.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Next 7 Days</CardDescription>
              <CardTitle>{thisWeekAppointments.length} bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upcoming appointment load across the clinic.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Attention Needed</CardDescription>
              <CardTitle>{attentionCount} cases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cancelled or missed visits that may need follow-up.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="px-4 pb-6 md:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Queue</CardTitle>
              <CardDescription>
                Update visit statuses as patients move through the clinic.
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
                <div className="flex items-center justify-center rounded-lg border border-dashed px-4 py-12 text-sm text-muted-foreground">
                  <Spinner className="mr-2 size-4" />
                  Loading appointments...
                </div>
              ) : appointments.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                  No appointments are available yet.
                </div>
              ) : (
                appointments.map((appointment) => {
                  const patientName = appointment.patientDetails?.fullName || "Patient"
                  const doctorName = appointment.doctorDetails?.fullName || "Doctor"
                  const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
                  const appointmentDateLabel =
                    appointmentDate && !Number.isNaN(appointmentDate.getTime())
                      ? appointmentDate.toLocaleString()
                      : "Date not available"

                  return (
                    <div key={appointment.$id} className="rounded-xl border bg-white/90 p-4 dark:bg-slate-950/70">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid flex-1 gap-4 md:grid-cols-2">
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm" className="size-10">
                                <AvatarImage src={appointment.patientDetails?.avatarUrl || ""} alt={patientName} />
                                <AvatarFallback className="bg-blue-500 text-white">
                                  {getInitials(patientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{patientName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.patientDetails?.phone || "No phone on file"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm" className="size-10">
                                <AvatarImage src={appointment.doctorDetails?.avatarUrl || ""} alt={doctorName} />
                                <AvatarFallback className="bg-indigo-500 text-white">
                                  {getInitials(doctorName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{doctorName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.doctorDetails?.specialty || "Clinic doctor"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <p className="font-medium text-foreground">{appointment.reason_for_visit}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{appointmentDateLabel}</p>
                            {appointment.notes ? (
                              <p className="mt-2 text-sm text-muted-foreground">{appointment.notes}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 lg:w-64">
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
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
                          <Button
                            type="button"
                            onClick={() => void handleStatusSave(appointment.$id)}
                            disabled={savingAppointmentId === appointment.$id || draftStatuses[appointment.$id] === appointment.status}
                          >
                            {savingAppointmentId === appointment.$id ? <Spinner className="mr-2 size-4" /> : null}
                            Update status
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}