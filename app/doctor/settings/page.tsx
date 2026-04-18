import Link from "next/link"
import { BellRing, KeyRound, LockKeyhole, ShieldCheck, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DoctorShell } from "@/components/doctor-shell"

export default function DoctorSettingsPage() {
  return (
    <DoctorShell
      pageTitle="Settings"
      pageDescription="Review doctor portal preferences, access controls, and workflow guidance."
    >
      <section className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
        <Card className="bg-blue-50/80 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Notifications</CardDescription>
            <CardTitle>Clinic alerts</CardTitle>
            <CardAction>
              <BellRing className="size-5 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Appointment reminders and care updates will be managed here.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/80 dark:bg-emerald-950/30">
          <CardHeader>
            <CardDescription>Workflow</CardDescription>
            <CardTitle>Portal preferences</CardTitle>
            <CardAction>
              <SlidersHorizontal className="size-5 text-emerald-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Clinical workspace preferences can be added here as the portal expands.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Security</CardDescription>
            <CardTitle>Session controls</CardTitle>
            <CardAction>
              <LockKeyhole className="size-5 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Account session handling currently follows the doctor login rules already in place.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-violet-50/80 dark:bg-violet-950/30">
          <CardHeader>
            <CardDescription>Access</CardDescription>
            <CardTitle>Doctor role status</CardTitle>
            <CardAction>
              <ShieldCheck className="size-5 text-violet-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Role activation and account approval remain controlled by admin-managed doctor records.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/80 sm:col-span-2 dark:bg-rose-950/20">
          <CardHeader>
            <CardDescription>Security</CardDescription>
            <CardTitle>Reset/change password</CardTitle>
            <CardAction>
              <div className="rounded-full bg-white/90 p-2 dark:bg-slate-800">
                <KeyRound className="size-5 text-rose-600" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Use the password reset flow to update your doctor account password securely.
            </p>
            <Button asChild>
              <Link href="/doctor/forgot-password">
                <KeyRound className="mr-2 size-4" />
                Reset Password
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card className="bg-slate-100/90 dark:bg-slate-900/80">
          <CardHeader>
            <CardDescription>Doctor portal configuration</CardDescription>
            <CardTitle>Settings roadmap</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
              Notification preferences can be connected once appointment events are surfaced to doctors.
            </div>
            <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
              Availability defaults can plug into the schedule page when admin assignment flows are added.
            </div>
            <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
              Security options can be expanded later without changing the doctor shell structure.
            </div>
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}