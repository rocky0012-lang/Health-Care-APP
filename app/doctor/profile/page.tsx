"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, BriefcaseMedical, Mail, Phone, ShieldCheck } from "lucide-react"

import { DoctorShell } from "@/components/doctor-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getDoctorByUserId } from "@/lib/actions/doctor.action"
import {
  getCurrentDoctorUserId,
  getStoredDoctorAvatar,
  getStoredDoctorName,
} from "@/lib/doctor-session"

type DoctorProfileRecord = Awaited<ReturnType<typeof getDoctorByUserId>>

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "DR"
  )
}

function getDoctorStatusLabel(status?: DoctorAccountStatus) {
  if (status === "suspended") {
    return "Suspended"
  }

  if (status === "deactivated") {
    return "Deactivated"
  }

  return "Active"
}

export default function DoctorProfilePage() {
  const [doctor, setDoctor] = useState<DoctorProfileRecord>(null)
  const [avatarImage, setAvatarImage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const loadDoctor = async () => {
      const userId = getCurrentDoctorUserId()
      const storedAvatar = getStoredDoctorAvatar(userId)

      if (storedAvatar) {
        setAvatarImage(storedAvatar)
      }

      if (!userId) {
        setErrorMessage("Doctor profile could not be loaded. Please sign in again.")
        setIsLoading(false)
        return
      }

      try {
        const response = await getDoctorByUserId(userId)

        if (!response) {
          setErrorMessage("No doctor profile was found for this account.")
          setIsLoading(false)
          return
        }

        setDoctor(response)

        if (!storedAvatar && response.avatarUrl) {
          setAvatarImage(response.avatarUrl)
        }
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load doctor profile details.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadDoctor()
  }, [])

  const displayName = doctor?.name || getStoredDoctorName(getCurrentDoctorUserId()) || "Doctor"

  return (
    <DoctorShell
      pageTitle="Profile"
      pageDescription="Review the doctor account details currently assigned to this login."
    >
      <section className="grid gap-4 p-4 md:grid-cols-[320px_minmax(0,1fr)] md:p-6">
        <Card className="bg-blue-50/80 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Doctor account</CardDescription>
            <CardTitle>Profile summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <Avatar className="size-24 border border-blue-200 bg-white dark:border-blue-900/60 dark:bg-slate-950">
              <AvatarImage src={avatarImage} alt={displayName} />
              <AvatarFallback className="bg-blue-500 text-lg font-semibold text-white">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xl font-semibold text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground">
                {doctor?.specialization || "Specialization not set"}
              </p>
            </div>
            <div className="grid w-full gap-2 text-left text-sm text-muted-foreground">
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                Department: {doctor?.department || "Not assigned"}
              </div>
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                License: {doctor?.licenseNumber || "Not provided"}
              </div>
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                Status: {getDoctorStatusLabel(doctor?.accountStatus)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Account details</CardDescription>
              <CardTitle>Assigned information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-white/80 px-4 py-4 dark:bg-slate-950/70">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="size-4 text-blue-600" />
                  Email
                </div>
                <p className="text-sm text-muted-foreground">
                  {doctor?.email || "No email is assigned to this account."}
                </p>
              </div>

              <div className="rounded-lg border bg-white/80 px-4 py-4 dark:bg-slate-950/70">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Phone className="size-4 text-emerald-600" />
                  Phone
                </div>
                <p className="text-sm text-muted-foreground">
                  {doctor?.phone || "No phone number is assigned yet."}
                </p>
              </div>

              <div className="rounded-lg border bg-white/80 px-4 py-4 dark:bg-slate-950/70">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <BriefcaseMedical className="size-4 text-amber-600" />
                  Specialization
                </div>
                <p className="text-sm text-muted-foreground">
                  {doctor?.specialization || "No specialization is recorded yet."}
                </p>
              </div>

              <div className="rounded-lg border bg-white/80 px-4 py-4 dark:bg-slate-950/70">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <BadgeCheck className="size-4 text-violet-600" />
                  Department
                </div>
                <p className="text-sm text-muted-foreground">
                  {doctor?.department || "No department is assigned yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-100/90 dark:bg-slate-900/80">
            <CardHeader>
              <CardDescription>Access status</CardDescription>
              <CardTitle>Doctor portal readiness</CardTitle>
              <CardAction>
                <ShieldCheck className="size-5 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {isLoading ? (
                <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                  Loading doctor profile...
                </div>
              ) : errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {errorMessage}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                    This page reflects the doctor record currently mapped to your Appwrite user.
                  </div>
                  <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                    Admin-managed onboarding remains the source of truth for doctor identity and activation.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </DoctorShell>
  )
}