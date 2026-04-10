"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Search,
  Send,
  Stethoscope,
  Users,
} from "lucide-react"

import { AdminHeader } from "@/components/admin-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  listPatients,
  sendBroadcastPatientNotification,
  sendPatientNotification,
  updatePatientAccountStatus,
} from "@/lib/actions/patient.action"
import { adminHeaderNavItems } from "@/lib/admin-navigation"

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
]

export default function PatientsPage() {
  const [patients, setPatients] = useState<Awaited<ReturnType<typeof listPatients>>>([])
  const [expandedPatientId, setExpandedPatientId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<PatientAccountStatus | "all">("all")
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [rowStatusDrafts, setRowStatusDrafts] = useState<Record<string, { status: PatientAccountStatus; message: string }>>({})
  const [rowNotificationDrafts, setRowNotificationDrafts] = useState<Record<string, { message: string; emergency: boolean }>>({})
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [broadcastEmergency, setBroadcastEmergency] = useState(false)
  const [isBroadcastSending, setIsBroadcastSending] = useState(false)

  useEffect(() => {
    const loadPatients = async () => {
      try {
        await refreshPatients()
      } catch (error) {
        console.error(error)
      }
    }

    void loadPatients()
  }, [])

  const refreshPatients = async () => {
    const nextPatients = await listPatients(500)
    setPatients(nextPatients)
    setRowStatusDrafts(
      nextPatients.reduce<Record<string, { status: PatientAccountStatus; message: string }>>((accumulator, patient) => {
        accumulator[patient.$id] = {
          status: patient.accountStatus || "active",
          message: patient.accountStatusMessage || "",
        }

        return accumulator
      }, {})
    )
  }

  const filteredPatients = patients.filter((patient) => {
    const searchableText = [
      patient.name,
      patient.email,
      patient.phone,
      patient.primaryPhysician,
      patient.emergencyContactName,
      patient.insuranceProvider,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    const matchesQuery = searchableText.includes(searchQuery.trim().toLowerCase())
    const matchesStatus = statusFilter === "all" || (patient.accountStatus || "active") === statusFilter

    return matchesQuery && matchesStatus
  })

  const activeCount = patients.filter((patient) => (patient.accountStatus || "active") === "active").length
  const attentionCount = patients.filter((patient) => (patient.accountStatus || "active") !== "active").length

  const updateRowStatusDraft = (
    patientId: string,
    updates: Partial<{ status: PatientAccountStatus; message: string }>
  ) => {
    setRowStatusDrafts((current) => ({
      ...current,
      [patientId]: {
        status: current[patientId]?.status || "active",
        message: current[patientId]?.message || "",
        ...updates,
      },
    }))
  }

  const updateRowNotificationDraft = (
    patientId: string,
    updates: Partial<{ message: string; emergency: boolean }>
  ) => {
    setRowNotificationDrafts((current) => ({
      ...current,
      [patientId]: {
        message: current[patientId]?.message || "",
        emergency: current[patientId]?.emergency || false,
        ...updates,
      },
    }))
  }

  const handleSavePatientStatus = async (patient: Awaited<ReturnType<typeof listPatients>>[number]) => {
    const draft = rowStatusDrafts[patient.$id] || {
      status: patient.accountStatus || "active",
      message: patient.accountStatusMessage || "",
    }

    setSaveMessage("")
    setErrorMessage("")

    try {
      const updatedPatient = await updatePatientAccountStatus({
        userId: patient.userId,
        accountStatus: draft.status,
        accountStatusMessage: draft.message,
      })

      setSaveMessage(
        `${updatedPatient?.name || patient.name} is now ${(updatedPatient?.accountStatus || draft.status).toLowerCase()}.`
      )
      await refreshPatients()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update patient status.")
    }
  }

  const handleSendPatientNotification = async (patient: Awaited<ReturnType<typeof listPatients>>[number]) => {
    const draft = rowNotificationDrafts[patient.$id] || { message: "", emergency: false }
    const message = draft.message.trim()

    setSaveMessage("")
    setErrorMessage("")

    if (!message) {
      setErrorMessage("Enter a notification message before sending it to the patient.")
      return
    }

    try {
      await sendPatientNotification({
        userId: patient.userId,
        title: draft.emergency ? `Emergency update for ${patient.name}` : `Admin update for ${patient.name}`,
        message,
        emergency: draft.emergency,
      })

      setSaveMessage(`${draft.emergency ? "Emergency message" : "Notification"} sent to ${patient.name}.`)
      setRowNotificationDrafts((current) => ({
        ...current,
        [patient.$id]: { message: "", emergency: false },
      }))
      await refreshPatients()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to send the patient notification.")
    }
  }

  const handleBroadcast = async () => {
    setSaveMessage("")
    setErrorMessage("")

    const message = broadcastMessage.trim()
    if (!message) {
      setErrorMessage("Enter a message before sending a broadcast to patients.")
      return
    }

    setIsBroadcastSending(true)

    try {
      const result = await sendBroadcastPatientNotification({
        title: broadcastTitle.trim() || undefined,
        message,
        emergency: broadcastEmergency,
      })

      setSaveMessage(
        `${broadcastEmergency ? "Emergency broadcast" : "Broadcast message"} sent to ${result.delivered} patients.`
      )
      setBroadcastTitle("")
      setBroadcastMessage("")
      setBroadcastEmergency(false)
      await refreshPatients()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to send the patient broadcast.")
    } finally {
      setIsBroadcastSending(false)
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
                  const isActive = item.href === "/admin/patients";
                  return (
                    <SidebarMenuItem key={item.label}>
                      <div className={`rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-500'
                          : 'hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:justify-center"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className={`group-data-[collapsible=icon]:hidden ${
                              isActive ? 'text-white' : ''
                            }`}>
                              {item.label}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
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

      <SidebarInset className="min-h-screen flex-1 bg-slate-50/50 dark:bg-slate-950">
        <AdminHeader
          pageTitle="Patients"
          pageDescription="Search every patient, review details, manage status, and send patient notifications."
          subNavItems={adminHeaderNavItems.map((item) => ({
            ...item,
            active: item.href === "/admin/patients",
          }))}
        />

        <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Card>
            <CardHeader>
              <CardDescription>Total Registered</CardDescription>
              <CardTitle>{patients.length} patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All created patients available to review and manage.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active Accounts</CardDescription>
              <CardTitle>{activeCount} patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Patients currently marked as active.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Need Attention</CardDescription>
              <CardTitle>{attentionCount} patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Patients currently deactivated or suspended.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 px-4 pb-6 md:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardDescription>Search and filter</CardDescription>
              <CardTitle>Find any patient record</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by patient name, email, phone, physician, or contact"
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PatientAccountStatus | "all")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="suspended">Suspended</option>
              </select>
            </CardContent>
          </Card>

          <Card className="bg-rose-50/80 dark:bg-rose-950/20">
            <CardHeader>
              <CardDescription>Patient broadcast</CardDescription>
              <CardTitle>Send all-patient notice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={broadcastTitle}
                onChange={(event) => setBroadcastTitle(event.target.value)}
                placeholder="Broadcast title (optional)"
              />
              <Textarea
                value={broadcastMessage}
                onChange={(event) => setBroadcastMessage(event.target.value)}
                placeholder="Message to all patients. This appears in their bell and at the top of their page."
                className="min-h-24"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={broadcastEmergency}
                  onChange={(event) => setBroadcastEmergency(event.target.checked)}
                />
                Mark as emergency message
              </label>
              <Button type="button" onClick={() => void handleBroadcast()} disabled={isBroadcastSending}>
                <Send className="mr-2 size-4" />
                {isBroadcastSending ? "Sending..." : "Send to all patients"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="px-4 pb-6 md:px-6">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {saveMessage && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {saveMessage}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardDescription>Filtered patient records</CardDescription>
              <CardTitle>{filteredPatients.length} patient matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredPatients.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No patients matched the current filters.
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const patientStatus = patient.accountStatus || "active"
                  const patientStatusClass =
                    patientStatus === "suspended"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : patientStatus === "deactivated"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"

                  return (
                    <div key={patient.$id} className="rounded-xl border px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                          <Avatar size="lg" className="mt-0.5 size-14 shrink-0">
                            <AvatarImage src={patient.avatarUrl || ""} alt={`${patient.name} profile picture`} />
                            <AvatarFallback className="bg-blue-500 text-white">
                              {patient.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part: string) => part[0])
                                .join("") || "PT"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-base font-semibold text-foreground">{patient.name}</p>
                              {patient.avatarUrl ? (
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                  Photo on file
                                </span>
                              ) : null}
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${patientStatusClass}`}>
                              {patientStatus.charAt(0).toUpperCase() + patientStatus.slice(1)}
                            </span>
                            <p className="text-sm text-muted-foreground">{patient.email} • {patient.phone}</p>
                            <p className="text-sm text-muted-foreground">
                              Physician: {patient.primaryPhysician || "Not assigned"}
                            </p>
                          </div>
                        </div>
                          <button
                            type="button"
                            onClick={() => setExpandedPatientId((current) => (current === patient.$id ? "" : patient.$id))}
                            className="inline-flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 lg:w-56"
                          >
                            <span>{expandedPatientId === patient.$id ? "Hide details" : "View details"}</span>
                            {expandedPatientId === patient.$id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </div>
                      </div>

                      {expandedPatientId === patient.$id ? (
                      <div className="mt-4 grid gap-3 rounded-lg border bg-slate-50/80 p-3 dark:bg-slate-950/60">
                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                          <div><span className="font-medium text-foreground">Physician:</span> {patient.primaryPhysician || "Not assigned"}</div>
                          <div><span className="font-medium text-foreground">Emergency Contact:</span> {patient.emergencyContactName || "Not set"}</div>
                          <div><span className="font-medium text-foreground">Occupation:</span> {patient.occupation || "Not provided"}</div>
                          <div><span className="font-medium text-foreground">Address:</span> {patient.address || "Not provided"}</div>
                          <div><span className="font-medium text-foreground">Insurance:</span> {patient.insuranceProvider || "Not provided"}</div>
                          <div><span className="font-medium text-foreground">Patient ID:</span> {patient.identificationNumber || "Not set"}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-start">
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={rowStatusDrafts[patient.$id]?.status || patientStatus}
                            onChange={(event) =>
                              updateRowStatusDraft(patient.$id, {
                                status: event.target.value as PatientAccountStatus,
                              })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="deactivated">Deactivated</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <Textarea
                            value={rowStatusDrafts[patient.$id]?.message ?? patient.accountStatusMessage ?? ""}
                            onChange={(event) =>
                              updateRowStatusDraft(patient.$id, {
                                message: event.target.value,
                              })
                            }
                            placeholder="Explain why the patient account is active, deactivated, or suspended"
                            className="min-h-24"
                          />
                          <Button type="button" onClick={() => void handleSavePatientStatus(patient)}>
                            Save status
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Patient top-page status note: {patient.accountStatusMessage || "No status note set."}
                        </p>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-start">
                          <Textarea
                            value={rowNotificationDrafts[patient.$id]?.message || ""}
                            onChange={(event) =>
                              updateRowNotificationDraft(patient.$id, {
                                message: event.target.value,
                              })
                            }
                            placeholder="Send a patient notification or emergency message"
                            className="min-h-24"
                          />
                          <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={rowNotificationDrafts[patient.$id]?.emergency || false}
                              onChange={(event) =>
                                updateRowNotificationDraft(patient.$id, {
                                  emergency: event.target.checked,
                                })
                              }
                            />
                            Emergency
                          </label>
                          <Button type="button" variant="secondary" onClick={() => void handleSendPatientNotification(patient)}>
                            <AlertTriangle className="mr-2 size-4" />
                            Send message
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Saved patient notifications: {patient.adminNotifications?.length || 0}
                        </p>
                      </div>
                      ) : null}
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
