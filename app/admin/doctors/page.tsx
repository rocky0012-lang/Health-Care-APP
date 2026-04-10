"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
  SquarePen,
  Users,
} from "lucide-react"
import { Search } from "lucide-react"

import { AdminHeader } from "@/components/admin-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  listDoctors,
  provisionDoctor,
  sendDoctorNotification,
  updateDoctorAccountStatus,
  updateDoctorRecord,
} from "@/lib/actions/doctor.action"
import { adminHeaderNavItems } from "@/lib/admin-navigation"

const doctorStatusOptions: DoctorAccountStatus[] = ["active", "deactivated", "suspended"]

function getDoctorStatusLabel(status: DoctorAccountStatus) {
  if (status === "deactivated") {
    return "Deactivated"
  }

  if (status === "suspended") {
    return "Suspended"
  }

  return "Active"
}

function getDoctorStatusBadgeClass(status: DoctorAccountStatus) {
  if (status === "suspended") {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
  }

  if (status === "deactivated") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  }

  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
}

const weekdayScheduleItems: Array<{ key: DoctorScheduleDayKey; label: string }> = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
]

function formatDoctorDaySchedule(
  weeklySchedule: DoctorWeeklySchedule | undefined,
  dayKey: DoctorScheduleDayKey
) {
  const day = weeklySchedule?.[dayKey]

  if (!day?.enabled) {
    return "Off"
  }

  return `${day.startTime}-${day.endTime}`
}

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
]

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100, "Full name must be 100 characters or less"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format, e.g. +14155552671"),
  password: z.string(),
  gender: z.enum(["Male", "Female", "Other"], { error: "Gender is required" }),
  specialty: z.string().max(100, "Specialty must be 100 characters or less").optional(),
  licenseNumber: z.string().max(50, "License number must be 50 characters or less").optional(),
  experienceYears: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined
      }

      return Number(value)
    },
    z.number().int().min(0, "Experience cannot be negative").max(80, "Experience looks too high").optional()
  ),
  hospitalName: z.string().max(200, "Hospital name must be 200 characters or less").optional(),
  availability: z.string().max(500, "Availability must be 500 characters or less").optional(),
  profilePhoto: z.union([z.literal(""), z.url("Profile photo must be a valid URL")]),
  accountStatus: z.enum(["active", "deactivated", "suspended"]),
  accountStatusMessage: z.string().max(500, "Status message must be 500 characters or less").optional(),
}).superRefine((values, context) => {
  const trimmedPassword = values.password.trim()
  const trimmedStatusMessage = values.accountStatusMessage?.trim() || ""

  if (trimmedPassword && trimmedPassword.length < 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be at least 8 characters",
      path: ["password"],
    })
  }

  if (values.accountStatus !== "active" && !trimmedStatusMessage) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Explain to the doctor why the account is suspended or deactivated",
      path: ["accountStatusMessage"],
    })
  }
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>
type DoctorListItem = Awaited<ReturnType<typeof listDoctors>>[number]

export default function AdminDoctorsPage() {
  const [recentDoctors, setRecentDoctors] = useState<DoctorListItem[]>([])
  const [expandedDoctorId, setExpandedDoctorId] = useState("")
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("")
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<DoctorAccountStatus | "all">("all")
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [editingDoctor, setEditingDoctor] = useState<DoctorListItem | null>(null)
  const [rowStatusDrafts, setRowStatusDrafts] = useState<Record<string, { status: DoctorAccountStatus; message: string }>>({})
  const [rowNotificationDrafts, setRowNotificationDrafts] = useState<Record<string, string>>({})

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      gender: "Male",
      specialty: "",
      licenseNumber: "",
      experienceYears: "",
      hospitalName: "",
      availability: "",
      profilePhoto: "",
      accountStatus: "active",
      accountStatusMessage: "",
    },
  })

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        await refreshDoctors()
      } catch (error) {
        console.error(error)
      }
    }

    void loadDoctors()
  }, [])

  const refreshDoctors = async () => {
    const doctors = await listDoctors(500)
    setRecentDoctors(doctors)
    setRowStatusDrafts(
      doctors.reduce<Record<string, { status: DoctorAccountStatus; message: string }>>((accumulator, doctor) => {
        accumulator[doctor.$id] = {
          status: doctor.accountStatus || "active",
          message: doctor.accountStatusMessage || "",
        }

        return accumulator
      }, {})
    )
  }

  const filteredDoctors = recentDoctors.filter((doctor) => {
    const query = doctorSearchQuery.trim().toLowerCase()
    const matchesQuery = !query || [doctor.name, doctor.fullName, doctor.email, doctor.phone, doctor.specialty, doctor.hospitalName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query)

    const matchesStatus = doctorStatusFilter === "all" || (doctor.accountStatus || "active") === doctorStatusFilter

    return matchesQuery && matchesStatus
  })

  const updateRowNotificationDraft = (doctorId: string, message: string) => {
    setRowNotificationDrafts((current) => ({
      ...current,
      [doctorId]: message,
    }))
  }

  const resetFormToCreateMode = () => {
    setEditingDoctor(null)
    form.reset({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      gender: "Male",
      specialty: "",
      licenseNumber: "",
      experienceYears: "",
      hospitalName: "",
      availability: "",
      profilePhoto: "",
      accountStatus: "active",
      accountStatusMessage: "",
    })
  }

  const loadDoctorIntoForm = (doctor: DoctorListItem) => {
    setEditingDoctor(doctor)
    setSaveMessage("")
    setErrorMessage("")
    form.reset({
      fullName: doctor.fullName || doctor.name || "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      password: "",
      gender: doctor.gender || "Male",
      specialty: doctor.specialty || doctor.specialization || "",
      licenseNumber: doctor.licenseNumber || "",
      experienceYears:
        typeof doctor.experienceYears === "number" ? String(doctor.experienceYears) : "",
      hospitalName: doctor.hospitalName || doctor.department || "",
      availability: doctor.availability || "",
      profilePhoto: doctor.profilePhoto || doctor.avatarUrl || "",
      accountStatus: doctor.accountStatus || "active",
      accountStatusMessage: doctor.accountStatusMessage || "",
    })
  }

  const updateRowStatusDraft = (
    doctorId: string,
    updates: Partial<{ status: DoctorAccountStatus; message: string }>
  ) => {
    setRowStatusDrafts((current) => ({
      ...current,
      [doctorId]: {
        status: current[doctorId]?.status || "active",
        message: current[doctorId]?.message || "",
        ...updates,
      },
    }))
  }

  const handleRowStatusSave = async (doctor: DoctorListItem) => {
    const draft = rowStatusDrafts[doctor.$id] || {
      status: doctor.accountStatus || "active",
      message: doctor.accountStatusMessage || "",
    }

    setSaveMessage("")
    setErrorMessage("")

    try {
      const updatedDoctor = await updateDoctorAccountStatus({
        doctorId: doctor.$id,
        userId: doctor.userId,
        accountStatus: draft.status,
        accountStatusMessage: draft.message,
      })

      setSaveMessage(
        `${updatedDoctor?.name || doctor.name || doctor.fullName} is now ${getDoctorStatusLabel(updatedDoctor?.accountStatus || draft.status).toLowerCase()}.`
      )
      await refreshDoctors()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to update the doctor status.")
    }
  }

  const handleSendDoctorNotification = async (doctor: DoctorListItem) => {
    const draftMessage = rowNotificationDrafts[doctor.$id]?.trim() || ""

    setSaveMessage("")
    setErrorMessage("")

    if (!draftMessage) {
      setErrorMessage("Enter a notification message before sending it to the doctor.")
      return
    }

    try {
      await sendDoctorNotification({
        userId: doctor.userId,
        title: `Admin update for ${doctor.name || doctor.fullName}`,
        message: draftMessage,
      })

      setSaveMessage(`Notification sent to ${doctor.name || doctor.fullName}.`)
      setRowNotificationDrafts((current) => ({
        ...current,
        [doctor.$id]: "",
      }))
      await refreshDoctors()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to send the doctor notification.")
    }
  }

  const onSubmit: SubmitHandler<FormOutput> = async (values) => {
    setSaveMessage("")
    setErrorMessage("")

    if (!editingDoctor && values.password.trim().length < 8) {
      form.setError("password", {
        type: "manual",
        message: "Password must be at least 8 characters",
      })
      return
    }

    try {
      const sharedData = {
        gender: values.gender,
        specialty: values.specialty?.trim() || undefined,
        licenseNumber: values.licenseNumber?.trim() || undefined,
        experienceYears:
          typeof values.experienceYears === "number" && !Number.isNaN(values.experienceYears)
            ? values.experienceYears
            : undefined,
        hospitalName: values.hospitalName?.trim() || undefined,
        availability: values.availability?.trim() || undefined,
        profilePhoto: values.profilePhoto || undefined,
        accountStatus: values.accountStatus,
        accountStatusMessage: values.accountStatusMessage?.trim() || undefined,
      }

      if (editingDoctor) {
        const updatedDoctor = await updateDoctorRecord({
          doctorId: editingDoctor.$id,
          userId: editingDoctor.userId,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          password: values.password?.trim() || undefined,
          ...sharedData,
        })

        setSaveMessage(`Doctor record updated for ${updatedDoctor?.name || values.fullName}.`)
        resetFormToCreateMode()
      } else {
        const result = await provisionDoctor(
          {
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            password: values.password,
          },
          sharedData
        )

        setSaveMessage(`Doctor account created for ${result.record?.name || values.fullName}.`)
        resetFormToCreateMode()
      }

      await refreshDoctors()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to create the doctor account.")
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
              Dashboard
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = item.href === "/admin/doctors"

                  return (
                    <SidebarMenuItem key={item.label}>
                      <div
                        className={`rounded-md transition-colors ${
                          item.href === "/admin/doctors"
                            ? "bg-blue-500"
                            : "hover:bg-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:justify-center"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span
                              className={`group-data-[collapsible=icon]:hidden ${
                                isActive ? "text-white" : ""
                              }`}
                            >
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
          pageTitle="Doctors"
          pageDescription="Create doctor Appwrite users and matching doctor records."
          subNavItems={adminHeaderNavItems.map((item) => ({
            ...item,
            active: item.href === "/admin/doctors",
          }))}
        />

        <section className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:p-6">
          <Card>
            <CardHeader>
              <CardDescription>{editingDoctor ? "Manage doctor record" : "Doctor onboarding"}</CardDescription>
              <CardTitle>
                {editingDoctor ? "Update doctor login and doctor table record" : "Create doctor login and doctor table record"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FieldSet className="space-y-4">
                  <FieldLegend>Account Details</FieldLegend>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field className="grid gap-2 md:col-span-2">
                      <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                      <Input id="fullName" placeholder="Dr. Jane Doe" {...form.register("fullName")} />
                      <FieldError>{form.formState.errors.fullName?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input id="email" type="email" placeholder="doctor@netcare.com" {...form.register("email")} />
                      <FieldError>{form.formState.errors.email?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="password">Temporary Password</FieldLabel>
                      <Input
                        id="password"
                        type="password"
                        placeholder={editingDoctor ? "Leave blank to keep current password" : "Minimum 8 characters"}
                        {...form.register("password")}
                      />
                      {editingDoctor && (
                        <FieldDescription>
                          Leave this blank to keep the doctor&apos;s current Appwrite password unchanged.
                        </FieldDescription>
                      )}
                      <FieldError>{form.formState.errors.password?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="accountStatus">Account Status</FieldLabel>
                      <select
                        id="accountStatus"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...form.register("accountStatus")}
                      >
                        {doctorStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {getDoctorStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <FieldDescription>
                        Select whether this doctor should be active, deactivated, or suspended.
                      </FieldDescription>
                      <FieldError>{form.formState.errors.accountStatus?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                      <Controller
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <PhoneNumberInput
                            id="phone"
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="+14155552671"
                            invalid={Boolean(form.formState.errors.phone)}
                          />
                        )}
                      />
                      <FieldError>{form.formState.errors.phone?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="gender">Gender</FieldLabel>
                      <select
                        id="gender"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...form.register("gender")}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      <FieldError>{form.formState.errors.gender?.message}</FieldError>
                    </Field>
                  </div>
                </FieldSet>

                <FieldSet className="space-y-4">
                  <FieldLegend>Professional Details</FieldLegend>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="specialty">Specialty</FieldLabel>
                      <Input id="specialty" placeholder="Cardiology" {...form.register("specialty")} />
                      <FieldError>{form.formState.errors.specialty?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="licenseNumber">License Number</FieldLabel>
                      <Input id="licenseNumber" placeholder="LIC-00452" {...form.register("licenseNumber")} />
                      <FieldError>{form.formState.errors.licenseNumber?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="experienceYears">Experience Years</FieldLabel>
                      <Input id="experienceYears" type="number" min="0" placeholder="8" {...form.register("experienceYears")} />
                      <FieldError>{form.formState.errors.experienceYears?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="hospitalName">Hospital Name</FieldLabel>
                      <Input id="hospitalName" placeholder="NetCare General Hospital" {...form.register("hospitalName")} />
                      <FieldError>{form.formState.errors.hospitalName?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2 md:col-span-2">
                      <FieldLabel htmlFor="availability">Availability</FieldLabel>
                      <Textarea id="availability" placeholder="Mon-Fri, 8:00 AM - 4:00 PM" {...form.register("availability")} />
                      <FieldError>{form.formState.errors.availability?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2 md:col-span-2">
                      <FieldLabel htmlFor="profilePhoto">Profile Photo URL</FieldLabel>
                      <Input id="profilePhoto" type="url" placeholder="https://example.com/photo.jpg" {...form.register("profilePhoto")} />
                      <FieldDescription>Use this because your Doctor table stores profilePhoto as a URL column.</FieldDescription>
                      <FieldError>{form.formState.errors.profilePhoto?.message}</FieldError>
                    </Field>

                    <Field className="grid gap-2 md:col-span-2">
                      <FieldLabel htmlFor="accountStatusMessage">Admin Status Message</FieldLabel>
                      <Textarea
                        id="accountStatusMessage"
                        placeholder="Explain why the account is suspended or deactivated."
                        {...form.register("accountStatusMessage")}
                      />
                      <FieldDescription>
                        This message is shown at the top of the doctor portal. Active notices stay there for one day, while suspended and deactivated notices remain until changed.
                      </FieldDescription>
                      <FieldError>{form.formState.errors.accountStatusMessage?.message}</FieldError>
                    </Field>
                  </div>
                </FieldSet>

                {errorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    {errorMessage}
                  </div>
                )}

                {saveMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {saveMessage}
                  </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row">
                  <Button type="submit" disabled={form.formState.isSubmitting} className="w-full md:w-auto">
                    {form.formState.isSubmitting
                      ? editingDoctor
                        ? "Updating doctor..."
                        : "Creating doctor..."
                      : editingDoctor
                        ? "Update doctor account"
                        : "Create doctor account"}
                  </Button>
                  {editingDoctor && (
                    <Button type="button" variant="outline" onClick={resetFormToCreateMode} className="w-full md:w-auto">
                      Cancel edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="bg-blue-50/80 dark:bg-blue-950/30">
              <CardHeader>
                <CardDescription>Doctor schema</CardDescription>
                <CardTitle>What changed</CardTitle>
                <CardAction>
                  <ShieldCheck className="size-5 text-blue-600" />
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                  The doctor server actions now write your exact Appwrite doctor columns and keep admin-only account status metadata on the linked Appwrite user for active, deactivated, and suspended access control.
                </div>
                <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                  Existing doctor-facing pages still work because those records are normalized back into compatibility fields like name, specialization, department, and avatarUrl when they are read.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Doctor directory</CardDescription>
                <CardTitle>Search and filter all created doctors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={doctorSearchQuery}
                      onChange={(event) => setDoctorSearchQuery(event.target.value)}
                      placeholder="Search doctor by name, email, phone, specialty, or hospital"
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={doctorStatusFilter}
                    onChange={(event) => setDoctorStatusFilter(event.target.value as DoctorAccountStatus | "all")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                {filteredDoctors.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    No doctors matched the current filters.
                  </div>
                ) : (
                  filteredDoctors.map((doctor) => (
                    <div key={doctor.$id} className="rounded-lg border px-4 py-3">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" className="size-10">
                              <AvatarImage src={doctor.avatarUrl || doctor.profilePhoto || ""} alt={doctor.name || doctor.fullName} />
                              <AvatarFallback className="bg-blue-500 text-white">
                                {(doctor.name || doctor.fullName || "DR")
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part: string) => part[0])
                                  .join("") || "DR"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{doctor.name || doctor.fullName}</p>
                              <p className="text-sm text-muted-foreground">{doctor.email}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {doctor.specialization || doctor.specialty || "No specialty"}
                                {doctor.department || doctor.hospitalName
                                  ? ` • ${doctor.department || doctor.hospitalName}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 lg:items-end">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${getDoctorStatusBadgeClass(
                                doctor.accountStatus || "active"
                              )}`}
                            >
                              {getDoctorStatusLabel(doctor.accountStatus || "active")}
                            </span>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => loadDoctorIntoForm(doctor)}>
                                <SquarePen className="mr-2 size-4" />
                                Edit
                              </Button>
                              <button
                                type="button"
                                onClick={() => setExpandedDoctorId((current) => (current === doctor.$id ? "" : doctor.$id))}
                                className="inline-flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                              >
                                <span>{expandedDoctorId === doctor.$id ? "Hide details" : "View details"}</span>
                                {expandedDoctorId === doctor.$id ? <ChevronUp className="ml-2 size-4" /> : <ChevronDown className="ml-2 size-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedDoctorId === doctor.$id ? (
                        <>
                          <div className="mt-4 rounded-lg border bg-white/80 p-3 dark:bg-slate-950/70">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">Weekly schedule</p>
                              <p className="text-xs text-muted-foreground">Mon-Fri availability</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                              {weekdayScheduleItems.map((day) => (
                                <div
                                  key={day.key}
                                  className="rounded-md border bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/70"
                                >
                                  <p className="font-medium text-foreground">{day.label}</p>
                                  <p className="mt-1 text-muted-foreground">
                                    {formatDoctorDaySchedule(doctor.weeklySchedule, day.key)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 rounded-lg border bg-slate-50/80 p-3 dark:bg-slate-950/60">
                            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-start">
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={rowStatusDrafts[doctor.$id]?.status || doctor.accountStatus || "active"}
                                onChange={(event) =>
                                  updateRowStatusDraft(doctor.$id, {
                                    status: event.target.value as DoctorAccountStatus,
                                  })
                                }
                              >
                                {doctorStatusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {getDoctorStatusLabel(status)}
                                  </option>
                                ))}
                              </select>
                              <Textarea
                                value={rowStatusDrafts[doctor.$id]?.message ?? doctor.accountStatusMessage ?? ""}
                                onChange={(event) =>
                                  updateRowStatusDraft(doctor.$id, {
                                    message: event.target.value,
                                  })
                                }
                                placeholder="Reason shown to doctor when status is suspended or deactivated"
                                className="min-h-24"
                              />
                              <Button type="button" onClick={() => void handleRowStatusSave(doctor)}>
                                Save status
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Admin note shown to doctor: {doctor.accountStatusMessage || "No message set."}
                            </p>
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                              <Textarea
                                value={rowNotificationDrafts[doctor.$id] || ""}
                                onChange={(event) => updateRowNotificationDraft(doctor.$id, event.target.value)}
                                placeholder="Send a notification to this doctor that will appear in the bell dropdown"
                                className="min-h-24"
                              />
                              <Button type="button" variant="secondary" onClick={() => void handleSendDoctorNotification(doctor)}>
                                Send notification
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Saved messages in notification bell: {doctor.adminNotifications?.length || 0}
                            </p>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}