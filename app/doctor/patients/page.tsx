"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronRight, HeartPulse, Phone, UserRoundPlus, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DoctorShell } from "@/components/doctor-shell"
import { Spinner } from "@/components/ui/spinner"
import { listDoctorAppointments } from "@/lib/actions/appointment.action"
import { getCurrentDoctorUserId } from "@/lib/doctor-session"

type DoctorAppointmentRecord = Awaited<ReturnType<typeof listDoctorAppointments>>[number]

type DoctorPatientRosterItem = {
  id: string
  fullName: string
  phone?: string
  avatarUrl?: string
  appointmentCount: number
  upcomingAppointment?: string
  lastVisitAt?: string
  status: "active" | "follow-up" | "new"
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

function getAppointmentTimestamp(appointmentDate?: string) {
  if (!appointmentDate) {
    return Number.POSITIVE_INFINITY
  }

  const date = new Date(appointmentDate)
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY
  }

  return date.getTime()
}

function getPatientStatus(item: DoctorPatientRosterItem) {
  if (item.upcomingAppointment) {
    return {
      label: "Upcoming",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    }
  }

  if (item.appointmentCount <= 1) {
    return {
      label: "New",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    }
  }

  return {
    label: "Follow-up",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  }
}

export default function DoctorPatientsPage() {
  const [appointments, setAppointments] = useState<DoctorAppointmentRecord[]>([])
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

    const loadAppointments = async () => {
      try {
        const result = await listDoctorAppointments(doctorUserId, 200)
        if (isMounted) {
          setAppointments(result)
        }
      } catch (error) {
        console.error("Failed to load doctor patients roster", error)
        if (isMounted) {
          setErrorMessage("Failed to load your patient roster.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAppointments()

    return () => {
      isMounted = false
    }
  }, [])

  const now = Date.now()
  const roster = useMemo(() => {
    const uniquePatients = new Map<string, DoctorPatientRosterItem>()

    appointments.forEach((appointment) => {
      const patientId = appointment.patientDetails?.id || (typeof appointment.patient !== "string" ? appointment.patient?.$id : "") || appointment.$id
      const current = uniquePatients.get(patientId)
      const appointmentTime = getAppointmentTimestamp(appointment.appointment_date)
      const currentUpcoming = current?.upcomingAppointment ? getAppointmentTimestamp(current.upcomingAppointment) : Number.POSITIVE_INFINITY
      const currentLastVisit = current?.lastVisitAt ? getAppointmentTimestamp(current.lastVisitAt) : Number.NEGATIVE_INFINITY

      uniquePatients.set(patientId, {
        id: patientId,
        fullName: appointment.patientDetails?.fullName || current?.fullName || "Patient",
        phone: appointment.patientDetails?.phone || current?.phone,
        avatarUrl: appointment.patientDetails?.avatarUrl || current?.avatarUrl,
        appointmentCount: (current?.appointmentCount || 0) + 1,
        upcomingAppointment:
          appointmentTime >= now && appointmentTime < currentUpcoming
            ? appointment.appointment_date
            : current?.upcomingAppointment,
        lastVisitAt:
          appointmentTime < now && appointmentTime > currentLastVisit
            ? appointment.appointment_date
            : current?.lastVisitAt,
        status: "active",
      })
    })

    return Array.from(uniquePatients.values())
      .map((item) => ({
        ...item,
        status: (item.upcomingAppointment ? "active" : item.appointmentCount <= 1 ? "new" : "follow-up") as DoctorPatientRosterItem["status"],
      }))
      .sort((left, right) => {
        const leftNext = left.upcomingAppointment ? getAppointmentTimestamp(left.upcomingAppointment) : Number.POSITIVE_INFINITY
        const rightNext = right.upcomingAppointment ? getAppointmentTimestamp(right.upcomingAppointment) : Number.POSITIVE_INFINITY

        if (leftNext !== rightNext) {
          return leftNext - rightNext
        }

        return right.appointmentCount - left.appointmentCount
      })
  }, [appointments, now])

  const upcomingPatients = roster.filter((item) => Boolean(item.upcomingAppointment))
  const newPatients = roster.filter((item) => item.status === "new")
  const followUpPatients = roster.filter((item) => item.status === "follow-up")

  return (
    <DoctorShell
      pageTitle="My Patients"
      pageDescription="Review your assigned roster and keep track of follow-up care."
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
              Loading your patient roster...
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-blue-50/70 dark:bg-blue-950/30">
                <CardHeader>
                  <CardDescription>Assigned Patients</CardDescription>
                  <CardTitle>{roster.length} active</CardTitle>
                  <CardAction>
                    <Users className="size-7 text-blue-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Derived from patients linked to your appointment history.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
                <CardHeader>
                  <CardDescription>New Intake</CardDescription>
                  <CardTitle>{newPatients.length} first reviews</CardTitle>
                  <CardAction>
                    <UserRoundPlus className="size-7 text-emerald-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Patients with only one recorded visit so far.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-amber-50/80 dark:bg-amber-950/30">
                <CardHeader>
                  <CardDescription>Care Plans</CardDescription>
                  <CardTitle>{followUpPatients.length} follow-ups</CardTitle>
                  <CardAction>
                    <HeartPulse className="size-7 text-amber-600" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Returning patients who may need continued care planning.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
              <Card className="bg-slate-100/90 dark:bg-slate-900/80">
                <CardHeader>
                  <CardTitle>Patient Roster</CardTitle>
                  <CardDescription>
                    This list is appointment-derived until a dedicated doctor-to-patient assignment model is added.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roster.map((patient) => {
                      const status = getPatientStatus(patient)
                      const nextVisit = patient.upcomingAppointment
                        ? new Date(patient.upcomingAppointment).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : null
                      const lastVisit = patient.lastVisitAt
                        ? new Date(patient.lastVisitAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                        : null

                      return (
                        <div key={patient.id} className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/55">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="size-11">
                                <AvatarImage src={patient.avatarUrl || ""} alt={patient.fullName} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                  {getInitials(patient.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{patient.fullName}</p>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${status.className}`}>
                                    {status.label}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Phone className="size-3.5" />
                                    {patient.phone || "No phone on file"}
                                  </span>
                                  <span>{patient.appointmentCount} visits</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:min-w-[360px]">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Next appointment</p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-white">{nextVisit || "No upcoming visit"}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Last visit</p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-white">{lastVisit || "No completed visit yet"}</p>
                              </div>
                            </div>

                            <Link href="/doctor/appointments" className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white">
                              Open appointments
                              <ChevronRight className="size-4" />
                            </Link>
                          </div>
                        </div>
                      )
                    })}

                    {roster.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/60">
                        No patients are linked to this doctor account yet.
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardDescription>Upcoming Visits</CardDescription>
                    <CardTitle>{upcomingPatients.length} patients queued</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingPatients.slice(0, 5).map((patient) => (
                      <div key={patient.id} className="rounded-2xl border border-slate-200/70 px-4 py-3 dark:border-slate-800">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{patient.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {patient.upcomingAppointment
                            ? new Date(patient.upcomingAppointment).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                            : "No upcoming visit"}
                        </p>
                      </div>
                    ))}
                    {upcomingPatients.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming appointments are booked yet.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardDescription>Quick actions</CardDescription>
                    <CardTitle>Keep the roster moving</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/doctor/appointments" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white">
                      Review appointment queue
                      <ChevronRight className="size-4" />
                    </Link>
                    <Link href="/doctor/schedule" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white">
                      Update weekly schedule
                      <ChevronRight className="size-4" />
                    </Link>
                    <Link href="/doctor/dashboard" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white">
                      Return to dashboard
                      <ChevronRight className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </section>
    </DoctorShell>
  )
}