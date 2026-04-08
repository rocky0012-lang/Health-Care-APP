"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, CircleAlert, FileClock } from "lucide-react"

import { DoctorShell } from "@/components/doctor-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { listDoctorAppointments, sendDoctorMessageToPatient, updateAppointmentStatus } from "@/lib/actions/appointment.action"
import { getCurrentDoctorUserId } from "@/lib/doctor-session"

type DoctorAppointmentRecord = Awaited<ReturnType<typeof listDoctorAppointments>>[number]

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

export default function DoctorAppointmentsPage() {
  const [doctorUserId, setDoctorUserId] = useState("")
  const [appointments, setAppointments] = useState<DoctorAppointmentRecord[]>([])
  const [draftStatuses, setDraftStatuses] = useState<Record<string, Status>>({})
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({})
  const [savingAppointmentId, setSavingAppointmentId] = useState("")
  const [messagingAppointmentId, setMessagingAppointmentId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [saveMessage, setSaveMessage] = useState("")

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

  return (
    <DoctorShell
      pageTitle="Appointments"
      pageDescription="Track today’s clinic flow and update visit statuses in real time."
    >
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
            ) : appointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-indigo-200 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-indigo-900/60 dark:bg-slate-950/60">
                No appointments are scheduled for this doctor yet.
              </div>
            ) : (
              appointments.map((appointment) => {
                const patientName = appointment.patientDetails?.fullName || "Patient"
                const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
                const appointmentDateLabel =
                  appointmentDate && !Number.isNaN(appointmentDate.getTime())
                    ? appointmentDate.toLocaleString()
                    : "Date not available"
                const isCancellationSelected = (draftStatuses[appointment.$id] || appointment.status) === "cancelled"
                const messageValue = draftMessages[appointment.$id] || ""

                return (
                  <div key={appointment.$id} className="rounded-xl border bg-white/90 p-4 dark:bg-slate-950/70">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
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

                        <p className="mt-4 font-medium text-foreground">{appointment.reason_for_visit}</p>
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
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}