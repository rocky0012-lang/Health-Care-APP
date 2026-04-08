"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarCheck,
  ChevronDown,
  Clock3,
  Stethoscope,
} from "lucide-react"

import { PatientShell } from "@/components/patient-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { createAppointment, listActiveDoctorsForBooking, listPatientAppointments } from "@/lib/actions/appointment.action"
import { getPatientByUserId } from "@/lib/actions/patient.action"
import { getCurrentPatientUserId } from "@/lib/patient-session"

type BookingDoctor = Awaited<ReturnType<typeof listActiveDoctorsForBooking>>[number]
type PatientAppointmentRecord = Awaited<ReturnType<typeof listPatientAppointments>>[number]

const timeSlotOptions = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
]

const weekdayKeyByIndex: Partial<Record<number, DoctorScheduleDayKey>> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
}

function getDoctorInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "DR"
  )
}

function normalizeDoctorMatchValue(value?: string) {
  return value?.trim().toLowerCase() || ""
}

function findDoctorForPrimaryPhysician(doctors: BookingDoctor[], primaryPhysician?: string) {
  const normalizedPrimaryPhysician = normalizeDoctorMatchValue(primaryPhysician)

  if (!normalizedPrimaryPhysician) {
    return null
  }

  return (
    doctors.find((doctor) => {
      const candidates = [doctor.$id, doctor.name, doctor.fullName]
      return candidates.some((candidate) => normalizeDoctorMatchValue(candidate) === normalizedPrimaryPhysician)
    }) || null
  )
}

function getAppointmentStatusLabel(status: Status) {
  if (status === "no-show") {
    return "No-show"
  }

  if (status === "cancelled") {
    return "Cancelled"
  }

  if (status === "completed") {
    return "Completed"
  }

  if (status === "confirmed") {
    return "Confirmed"
  }

  if (status === "scheduled") {
    return "Scheduled"
  }

  return "Scheduled"
}

function getAppointmentStatusClass(status: Status) {
  if (status === "no-show") {
    return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
  }

  if (status === "completed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
  }

  if (status === "confirmed") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  }

  if (status === "scheduled") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  }

  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
}

function buildTimeSlotsForWindow(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)

  if (
    [startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value)) ||
    startTime >= endTime
  ) {
    return []
  }

  const slots: string[] = []
  const startTotalMinutes = startHour * 60 + startMinute
  const endTotalMinutes = endHour * 60 + endMinute

  for (let current = startTotalMinutes; current < endTotalMinutes; current += 30) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0")
    const minutes = String(current % 60).padStart(2, "0")
    slots.push(`${hours}:${minutes}`)
  }

  return slots.filter((slot) => timeSlotOptions.includes(slot))
}

export default function PatientAppointmentsPage() {
  const [patientUserId, setPatientUserId] = useState("")
  const [doctors, setDoctors] = useState<BookingDoctor[]>([])
  const [appointments, setAppointments] = useState<PatientAppointmentRecord[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState("")
  const [primaryDoctorId, setPrimaryDoctorId] = useState("")
  const [appointmentDate, setAppointmentDate] = useState("")
  const [timeSlot, setTimeSlot] = useState(timeSlotOptions[4])
  const [reasonForVisit, setReasonForVisit] = useState("")
  const [notes, setNotes] = useState("")
  const [isDoctorMenuOpen, setIsDoctorMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const doctorMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const currentPatientUserId = getCurrentPatientUserId()
    setPatientUserId(currentPatientUserId)

    const loadData = async () => {
      if (!currentPatientUserId) {
        setErrorMessage("Patient account is missing. Please sign in again.")
        setIsLoading(false)
        return
      }

      try {
        const [availableDoctors, existingAppointments, patient] = await Promise.all([
          listActiveDoctorsForBooking(),
          listPatientAppointments(currentPatientUserId),
          getPatientByUserId(currentPatientUserId),
        ])

        setDoctors(availableDoctors)
        setAppointments(existingAppointments)

        const matchedPrimaryDoctor = findDoctorForPrimaryPhysician(
          availableDoctors,
          patient?.primaryPhysician
        )

        if (matchedPrimaryDoctor) {
          setPrimaryDoctorId(matchedPrimaryDoctor.$id)
          setSelectedDoctorId(matchedPrimaryDoctor.$id)
        } else if (availableDoctors[0]) {
          setPrimaryDoctorId("")
          setSelectedDoctorId(availableDoctors[0].$id)
        }
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load booking details.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (doctorMenuRef.current && !doctorMenuRef.current.contains(event.target as Node)) {
        setIsDoctorMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.$id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  )

  const primaryDoctor = useMemo(
    () => doctors.find((doctor) => doctor.$id === primaryDoctorId) || null,
    [doctors, primaryDoctorId]
  )

  const selectedDoctorScheduleDay = useMemo(() => {
    if (!selectedDoctor || !appointmentDate) {
      return null
    }

    const date = new Date(`${appointmentDate}T00:00:00`)
    const dayKey = weekdayKeyByIndex[date.getDay()]

    if (!dayKey) {
      return null
    }

    return selectedDoctor.weeklySchedule?.[dayKey] || null
  }, [selectedDoctor, appointmentDate])

  const availableTimeSlots = useMemo(() => {
    if (!selectedDoctor) {
      return timeSlotOptions
    }

    if (!appointmentDate) {
      return []
    }

    if (!selectedDoctorScheduleDay?.enabled) {
      return []
    }

    return buildTimeSlotsForWindow(selectedDoctorScheduleDay.startTime, selectedDoctorScheduleDay.endTime)
  }, [appointmentDate, selectedDoctor, selectedDoctorScheduleDay])

  const upcomingAppointments = appointments.filter(
    (appointment) => appointment.status === "scheduled" || appointment.status === "confirmed"
  )
  const completedAppointments = appointments.filter((appointment) => appointment.status === "completed")

  useEffect(() => {
    if (!appointmentDate) {
      return
    }

    if (availableTimeSlots.length === 0) {
      setTimeSlot("")
      return
    }

    if (!availableTimeSlots.includes(timeSlot)) {
      setTimeSlot(availableTimeSlots[0])
    }
  }, [appointmentDate, availableTimeSlots, timeSlot])

  const handleCreateAppointment = async () => {
    setSaveMessage("")
    setErrorMessage("")

    if (!patientUserId) {
      setErrorMessage("Patient account is missing. Please sign in again.")
      return
    }

    if (!selectedDoctorId) {
      setErrorMessage("Select a doctor before creating the appointment.")
      return
    }

    if (!appointmentDate) {
      setErrorMessage("Choose an appointment date.")
      return
    }

    if (availableTimeSlots.length === 0 || !timeSlot) {
      setErrorMessage("The selected doctor is not available on that date. Choose another date or doctor.")
      return
    }

    if (!reasonForVisit.trim()) {
      setErrorMessage("Enter a reason for your visit.")
      return
    }

    setIsSubmitting(true)

    try {
      await createAppointment({
        patientUserId,
        doctorId: selectedDoctorId,
        appointmentDate,
        timeSlot,
        status: "confirmed",
        reasonForVisit,
        notes,
        bookingChannel: "web",
      })

      const refreshedAppointments = await listPatientAppointments(patientUserId)
      setAppointments(refreshedAppointments)
      setReasonForVisit("")
      setNotes("")
      setSaveMessage("Appointment request submitted successfully.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to create the appointment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PatientShell pageTitle="Appointments" pageDescription="View and manage your scheduled visits.">
        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <Card className="bg-blue-50/70 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Next Appointment</CardDescription>
              <CardTitle>{upcomingAppointments.length} upcoming</CardTitle>
              <CardAction>
                <CalendarCheck className="size-7 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {upcomingAppointments.length > 0
                  ? "Your latest appointment requests and scheduled visits appear below."
                  : "No upcoming appointments have been scheduled."}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
            <CardHeader>
              <CardDescription>Completed Appointments</CardDescription>
              <CardTitle>{completedAppointments.length} visits</CardTitle>
              <CardAction>
                <CalendarCheck className="size-7 text-indigo-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No appointment history is available yet.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 px-4 pb-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <Card>
            <CardHeader>
              <CardDescription>Create appointment</CardDescription>
              <CardTitle>Book a new visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(errorMessage || saveMessage) && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    errorMessage
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                  }`}
                >
                  {errorMessage || saveMessage}
                </div>
              )}

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-foreground">Doctor</label>
                  {primaryDoctor ? (
                    <Button
                      type="button"
                      variant={selectedDoctorId === primaryDoctor.$id ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedDoctorId(primaryDoctor.$id)
                        setIsDoctorMenuOpen(false)
                      }}
                    >
                      My doctor
                    </Button>
                  ) : null}
                </div>
                <div className="relative" ref={doctorMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsDoctorMenuOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    disabled={isLoading || doctors.length === 0}
                  >
                    {selectedDoctor ? (
                      <span className="flex items-center gap-3">
                        <Avatar size="sm" className="size-8">
                          <AvatarImage src={selectedDoctor.avatarUrl || ""} alt={selectedDoctor.name || selectedDoctor.fullName} />
                          <AvatarFallback className="bg-blue-500 text-white">
                            {getDoctorInitials(selectedDoctor.name || selectedDoctor.fullName || "Doctor")}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          <span className="block font-medium text-foreground">
                            {selectedDoctor.name || selectedDoctor.fullName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {selectedDoctor.specialization || selectedDoctor.specialty || "Doctor"}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {isLoading ? "Loading doctors..." : "Select a doctor"}
                      </span>
                    )}
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>

                  {isDoctorMenuOpen && doctors.length > 0 && (
                    <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-white p-2 shadow-xl dark:bg-slate-950">
                      {doctors.map((doctor) => (
                        <button
                          key={doctor.$id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doctor.$id)
                            setIsDoctorMenuOpen(false)
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 ${
                            selectedDoctorId === doctor.$id ? "bg-slate-100 dark:bg-slate-900" : ""
                          }`}
                        >
                          <Avatar size="sm" className="size-9">
                            <AvatarImage src={doctor.avatarUrl || ""} alt={doctor.name || doctor.fullName} />
                            <AvatarFallback className="bg-blue-500 text-white">
                              {getDoctorInitials(doctor.name || doctor.fullName || "Doctor")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {doctor.name || doctor.fullName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {doctor.specialization || doctor.specialty || "General consultation"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {primaryDoctor ? (
                  <p className="text-xs text-muted-foreground">
                    Your registered primary physician, {primaryDoctor.name || primaryDoctor.fullName}, is preselected.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="appointmentDate" className="text-sm font-medium text-foreground">
                    Appointment date
                  </label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={appointmentDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(event) => setAppointmentDate(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="timeSlot" className="text-sm font-medium text-foreground">
                    Time slot
                  </label>
                  <select
                    id="timeSlot"
                    value={timeSlot}
                    onChange={(event) => setTimeSlot(event.target.value)}
                    disabled={availableTimeSlots.length === 0}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {availableTimeSlots.length === 0 ? (
                      <option value="">No slots available</option>
                    ) : null}
                    {availableTimeSlots.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {appointmentDate && selectedDoctor && availableTimeSlots.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  {selectedDoctorScheduleDay
                    ? "This doctor is marked off for the selected date."
                    : "This doctor only accepts weekday bookings based on the saved Mon-Fri schedule."}
                </div>
              )}

              {appointmentDate && selectedDoctorScheduleDay?.enabled && availableTimeSlots.length > 0 && (
                <div className="rounded-lg border bg-slate-50/80 px-4 py-3 text-sm text-muted-foreground dark:bg-slate-900/70">
                  Available on this date from {selectedDoctorScheduleDay.startTime} to {selectedDoctorScheduleDay.endTime}.
                </div>
              )}

              <div className="grid gap-2">
                <label htmlFor="reasonForVisit" className="text-sm font-medium text-foreground">
                  Reason for visit
                </label>
                <Input
                  id="reasonForVisit"
                  value={reasonForVisit}
                  maxLength={200}
                  onChange={(event) => setReasonForVisit(event.target.value)}
                  placeholder="Describe the reason for your appointment"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="notes" className="text-sm font-medium text-foreground">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add extra context for the doctor or clinic team"
                  className="min-h-24"
                />
              </div>

              <div className="rounded-lg border bg-slate-50/80 px-4 py-3 text-sm text-muted-foreground dark:bg-slate-900/70">
                New requests are submitted with a confirmed status and a web booking channel.
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => void handleCreateAppointment()} disabled={isSubmitting || isLoading || availableTimeSlots.length === 0}>
                  {isSubmitting ? <Spinner className="mr-2 size-4" /> : <Stethoscope className="mr-2 size-4" />}
                  {isSubmitting ? "Creating appointment..." : "Create appointment"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-100/90 dark:bg-slate-900/80">
            <CardHeader>
              <CardDescription>Recent bookings</CardDescription>
              <CardTitle>Your appointment requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-white/80 px-4 py-8 text-center text-sm text-muted-foreground dark:bg-slate-950/60">
                  No appointment requests have been created yet.
                </div>
              ) : (
                appointments.map((appointment) => {
                  const appointmentDateValue = appointment.appointment_date
                    ? new Date(appointment.appointment_date)
                    : null
                  const doctorName = appointment.doctorDetails?.fullName || "Doctor pending"
                  const doctorAvatarUrl = appointment.doctorDetails?.avatarUrl || ""
                  const doctorSpecialty = appointment.doctorDetails?.specialty || "Assigned doctor"

                  return (
                    <div key={appointment.$id} className="rounded-lg border bg-white/80 px-4 py-4 dark:bg-slate-950/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex items-center gap-3">
                            <Avatar size="sm" className="size-10 shrink-0">
                              <AvatarImage src={doctorAvatarUrl} alt={doctorName} />
                              <AvatarFallback className="bg-blue-500 text-white">
                                {getDoctorInitials(doctorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{doctorName}</p>
                              <p className="truncate text-xs text-muted-foreground">{doctorSpecialty}</p>
                            </div>
                          </div>
                          <p className="font-medium text-foreground">{appointment.reason_for_visit}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {appointmentDateValue && !Number.isNaN(appointmentDateValue.getTime())
                              ? appointmentDateValue.toLocaleDateString()
                              : "Date pending"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getAppointmentStatusClass(appointment.status)}`}>
                          {getAppointmentStatusLabel(appointment.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="size-4" />
                        <span>{appointment.time_slot || "Time pending"}</span>
                      </div>
                      {appointment.status === "cancelled" && appointment.cancellationReason ? (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                          <p className="font-medium">Cancellation reason</p>
                          <p className="mt-1">{appointment.cancellationReason}</p>
                        </div>
                      ) : null}
                      {appointment.notes ? (
                        <p className="mt-3 text-sm text-muted-foreground">{appointment.notes}</p>
                      ) : null}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>
    </PatientShell>
  )
}
