"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock3, Hospital, Save, TimerReset } from "lucide-react"

import { DoctorShell } from "@/components/doctor-shell"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getDoctorByUserId, updateDoctorWeeklySchedule } from "@/lib/actions/doctor.action"
import { getCurrentDoctorUserId } from "@/lib/doctor-session"

const scheduleDays: Array<{ key: DoctorScheduleDayKey; label: string; shortLabel: string }> = [
  { key: "monday", label: "Monday", shortLabel: "Mon" },
  { key: "tuesday", label: "Tuesday", shortLabel: "Tue" },
  { key: "wednesday", label: "Wednesday", shortLabel: "Wed" },
  { key: "thursday", label: "Thursday", shortLabel: "Thu" },
  { key: "friday", label: "Friday", shortLabel: "Fri" },
]

const defaultWeeklySchedule: DoctorWeeklySchedule = {
  monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
}

export default function DoctorSchedulePage() {
  const [userId, setUserId] = useState("")
  const [weeklySchedule, setWeeklySchedule] = useState<DoctorWeeklySchedule>(defaultWeeklySchedule)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const loadSchedule = async () => {
      const currentUserId = getCurrentDoctorUserId()
      setUserId(currentUserId)

      if (!currentUserId) {
        setErrorMessage("Doctor schedule could not be loaded. Please sign in again.")
        setIsLoading(false)
        return
      }

      try {
        const doctor = await getDoctorByUserId(currentUserId)

        if (!doctor) {
          setErrorMessage("No doctor schedule record was found for this account.")
          setIsLoading(false)
          return
        }

        setWeeklySchedule(doctor.weeklySchedule || defaultWeeklySchedule)
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load your weekly schedule.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadSchedule()
  }, [])

  const enabledDays = useMemo(
    () => scheduleDays.filter(({ key }) => weeklySchedule[key].enabled),
    [weeklySchedule]
  )

  const nextShiftSummary = enabledDays.length
    ? `${enabledDays[0].label} ${weeklySchedule[enabledDays[0].key].startTime} - ${weeklySchedule[enabledDays[0].key].endTime}`
    : "Not scheduled"

  const coverageSummary = enabledDays.length
    ? `${enabledDays.length} weekday${enabledDays.length > 1 ? "s" : ""} enabled`
    : "No clinic blocks"

  const availabilitySummary = enabledDays.length > 0 ? "Schedule ready" : "No weekdays enabled"

  const handleDayUpdate = (
    dayKey: DoctorScheduleDayKey,
    updates: Partial<DoctorWeeklyScheduleDay>
  ) => {
    setWeeklySchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        ...updates,
      },
    }))
  }

  const handleSave = async () => {
    if (!userId) {
      setErrorMessage("Doctor schedule could not be updated because the account id is missing.")
      return
    }

    setIsSaving(true)
    setSaveMessage("")
    setErrorMessage("")

    try {
      const updatedDoctor = await updateDoctorWeeklySchedule({
        userId,
        weeklySchedule,
      })

      setWeeklySchedule(updatedDoctor?.weeklySchedule || weeklySchedule)
      setSaveMessage("Weekly schedule updated successfully.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update your weekly schedule.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DoctorShell
      pageTitle="Schedule"
      pageDescription="Manage availability, clinic coverage, and shift timing."
    >
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <Card className="bg-blue-50/70 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Next Shift</CardDescription>
            <CardTitle>{isLoading ? "Loading..." : nextShiftSummary}</CardTitle>
            <CardAction>
              <Clock3 className="size-7 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your first enabled weekday block is shown here after you save your schedule.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
          <CardHeader>
            <CardDescription>Coverage</CardDescription>
            <CardTitle>{isLoading ? "Loading..." : coverageSummary}</CardTitle>
            <CardAction>
              <Hospital className="size-7 text-emerald-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the weekday blocks below to define when patients can expect you to be available.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Availability</CardDescription>
            <CardTitle>{isLoading ? "Loading..." : availabilitySummary}</CardTitle>
            <CardAction>
              <TimerReset className="size-7 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enable the weekdays you work and set a start and end time for each one.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card className="bg-slate-100/90 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              Set your editable Monday to Friday schedule. Enabled days become your saved weekly availability.
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

            <div className="grid gap-3 xl:grid-cols-5">
              {scheduleDays.map((day) => {
                const daySchedule = weeklySchedule[day.key]

                return (
                  <div
                    key={day.key}
                    className="rounded-lg border bg-white/80 p-4 text-sm dark:bg-slate-950/70"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{day.label}</p>
                        <p className="text-xs text-muted-foreground">{day.shortLabel}</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={daySchedule.enabled}
                          onChange={(event) =>
                            handleDayUpdate(day.key, { enabled: event.target.checked })
                          }
                          disabled={isLoading || isSaving}
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="grid gap-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-medium text-foreground">Start</span>
                        <input
                          type="time"
                          value={daySchedule.startTime}
                          onChange={(event) =>
                            handleDayUpdate(day.key, { startTime: event.target.value })
                          }
                          disabled={isLoading || isSaving || !daySchedule.enabled}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-medium text-foreground">End</span>
                        <input
                          type="time"
                          value={daySchedule.endTime}
                          onChange={(event) =>
                            handleDayUpdate(day.key, { endTime: event.target.value })
                          }
                          disabled={isLoading || isSaving || !daySchedule.enabled}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </label>

                      <p className="text-xs text-muted-foreground">
                        {daySchedule.enabled
                          ? `${daySchedule.startTime} - ${daySchedule.endTime}`
                          : "This weekday is currently off."}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => void handleSave()} disabled={isLoading || isSaving}>
                <Save className="mr-2 size-4" />
                {isSaving ? "Saving..." : "Save weekly schedule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}