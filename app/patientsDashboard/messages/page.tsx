"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CalendarClock, MessageSquareText, TriangleAlert } from "lucide-react"

import { PatientShell } from "@/components/patient-shell"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  getPatientByUserId,
  markAllPatientNotificationsAsRead,
  markPatientNotificationReadState,
} from "@/lib/actions/patient.action"
import { getCurrentPatientUserId } from "@/lib/patient-session"

function getNotificationKindLabel(kind: PatientNotificationKind) {
  if (kind === "doctor-message") {
    return "Doctor message"
  }

  if (kind === "appointment-update") {
    return "Appointment update"
  }

  if (kind === "broadcast") {
    return "Broadcast"
  }

  if (kind === "emergency-message") {
    return "Emergency"
  }

  if (kind === "status") {
    return "Account status"
  }

  return "Admin message"
}

function getNotificationToneClass(tone: DoctorNotificationTone) {
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
  }

  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
  }

  return "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100"
}

export default function PatientMessagesPage() {
  const [patientUserId, setPatientUserId] = useState("")
  const [notifications, setNotifications] = useState<PatientAdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [updatingNotificationId, setUpdatingNotificationId] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const resolvedPatientUserId = getCurrentPatientUserId()
    setPatientUserId(resolvedPatientUserId)

    if (!resolvedPatientUserId) {
      setErrorMessage("Patient session is missing. Please sign in again.")
      setIsLoading(false)
      return
    }

    const loadNotifications = async () => {
      try {
        const patient = await getPatientByUserId(resolvedPatientUserId)
        setNotifications(patient?.adminNotifications || [])
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load your inbox.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadNotifications()
  }, [])

  const doctorMessageCount = useMemo(
    () => notifications.filter((notification) => notification.kind === "doctor-message").length,
    [notifications]
  )
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  )
  const appointmentUpdateCount = useMemo(
    () => notifications.filter((notification) => notification.kind === "appointment-update").length,
    [notifications]
  )
  const urgentCount = useMemo(
    () => notifications.filter((notification) => notification.tone === "warning").length,
    [notifications]
  )

  const handleToggleReadState = async (notificationId: string, read: boolean) => {
    if (!patientUserId) {
      setErrorMessage("Patient session is missing. Please sign in again.")
      return
    }

    setUpdatingNotificationId(notificationId)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const updatedNotifications = await markPatientNotificationReadState({
        userId: patientUserId,
        notificationId,
        read,
      })
      setNotifications(updatedNotifications)
      setSaveMessage(read ? "Message marked as read." : "Message marked as unread.")
    } catch (error) {
      console.error(error)
      setErrorMessage("Failed to update the message state.")
    } finally {
      setUpdatingNotificationId("")
    }
  }

  const handleMarkAllRead = async () => {
    if (!patientUserId || unreadCount === 0) {
      return
    }

    setIsMarkingAllRead(true)
    setErrorMessage("")
    setSaveMessage("")

    try {
      const updatedNotifications = await markAllPatientNotificationsAsRead(patientUserId)
      setNotifications(updatedNotifications)
      setSaveMessage("All messages marked as read.")
    } catch (error) {
      console.error(error)
      setErrorMessage("Failed to mark all messages as read.")
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  return (
    <PatientShell pageTitle="Messages" pageDescription="Review doctor notes, appointment updates, and account notices.">
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <Card className="bg-blue-50/70 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Unread messages</CardDescription>
            <CardTitle>{unreadCount}</CardTitle>
            <CardAction>
              <Bell className="size-7 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All notices delivered to your account inbox.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
          <CardHeader>
            <CardDescription>From doctors</CardDescription>
            <CardTitle>{doctorMessageCount}</CardTitle>
            <CardAction>
              <MessageSquareText className="size-7 text-indigo-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Direct messages and care-team communication.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Needs attention</CardDescription>
            <CardTitle>{urgentCount}</CardTitle>
            <CardAction>
              <TriangleAlert className="size-7 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Important warnings and urgent appointment changes.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card>
          <CardHeader>
            <CardDescription>Inbox</CardDescription>
            <CardTitle>Recent notifications</CardTitle>
            <CardAction>
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={isMarkingAllRead || unreadCount === 0}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isMarkingAllRead ? "Marking..." : "Mark all read"}
              </button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}
            {saveMessage ? (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                {saveMessage}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed px-4 py-12 text-sm text-muted-foreground">
                <Spinner className="mr-2 size-4" />
                Loading inbox...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                No notifications have been delivered yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border px-4 py-4 ${getNotificationToneClass(notification.tone)} ${
                    notification.readAt ? "opacity-80" : "ring-1 ring-blue-200 dark:ring-blue-900/40"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                            notification.readAt
                              ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}
                        >
                          {notification.readAt ? "Read" : "Unread"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm opacity-90">{notification.message}</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
                        {getNotificationKindLabel(notification.kind)}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Just now"}
                      </p>
                      {notification.readAt ? (
                        <p className="mt-1 text-xs opacity-70">
                          Read {new Date(notification.readAt).toLocaleString()}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleToggleReadState(notification.id, !notification.readAt)}
                        disabled={updatingNotificationId === notification.id}
                        className="mt-3 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        {updatingNotificationId === notification.id
                          ? "Updating..."
                          : notification.readAt
                            ? "Mark unread"
                            : "Mark read"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="mt-4 rounded-lg border bg-slate-50/80 px-4 py-3 text-sm text-muted-foreground dark:bg-slate-900/70">
          Unread: {unreadCount}. Appointment updates: {appointmentUpdateCount}. Doctor messages: {doctorMessageCount}.
        </div>
      </section>
    </PatientShell>
  )
}
