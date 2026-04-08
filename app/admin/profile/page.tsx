"use client"

import Link from "next/link"
import {
  ArrowLeft,
  BriefcaseMedical,
  CircleUserRound,
  FileText,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react"
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

export default function AdminProfilePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Admin Profile</h1>
            <p className="text-sm text-muted-foreground">
              Review your administrator account and contact information.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/overview">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle>Administrator</CardTitle>
              <CardDescription>Account overview and role summary.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <Avatar size="lg" className="size-24">
                <AvatarImage src="" alt="Admin avatar" />
                <AvatarFallback className="bg-blue-500 text-xl text-white">AD</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">Clinic Administrator</p>
                <p className="text-sm text-muted-foreground">Operations manager account</p>
              </div>
              <div className="grid w-full gap-3">
                <div className="rounded-lg border border-white/70 bg-white/80 px-4 py-3 text-left dark:border-slate-900 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <BriefcaseMedical className="size-4 text-blue-600" />
                    Administrative Unit
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">NetCare central operations desk</p>
                </div>
                <div className="rounded-lg border border-white/70 bg-white/80 px-4 py-3 text-left dark:border-slate-900 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Access Scope
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Patient records, scheduling, and reporting tools</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-blue-50/80 dark:bg-blue-950/30">
              <CardHeader>
                <CardDescription>Full Name</CardDescription>
                <CardTitle>Clinic Administrator</CardTitle>
                <CardAction>
                  <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                    <CircleUserRound className="size-5 text-blue-600" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Primary admin account responsible for clinic operations.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50/80 dark:bg-emerald-950/30">
              <CardHeader>
                <CardDescription>Email</CardDescription>
                <CardTitle>admin@netcare.com</CardTitle>
                <CardAction>
                  <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                    <Mail className="size-5 text-emerald-600" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Used for platform notices and operational summaries.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-violet-50/80 dark:bg-violet-950/30">
              <CardHeader>
                <CardDescription>Phone</CardDescription>
                <CardTitle>+1 415 555 1024</CardTitle>
                <CardAction>
                  <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                    <Phone className="size-5 text-violet-600" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Contact channel for urgent internal coordination.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/80 dark:bg-amber-950/30">
              <CardHeader>
                <CardDescription>Access Level</CardDescription>
                <CardTitle>Full Access</CardTitle>
                <CardAction>
                  <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                    <ShieldCheck className="size-5 text-amber-600" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Authorized to manage patient records, appointments, and reports.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-100/90 sm:col-span-2 dark:bg-slate-900/80">
              <CardHeader>
                <CardDescription>Responsibilities</CardDescription>
                <CardTitle>Daily operations coverage</CardTitle>
                <CardAction>
                  <div className="rounded-full bg-white/90 p-2 dark:bg-slate-800">
                    <FileText className="size-5 text-slate-700 dark:text-slate-200" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Monitor patient intake and profile accuracy.</div>
                <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Coordinate appointment flow and internal escalations.</div>
                <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Review reports and maintain clinic settings.</div>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/80 sm:col-span-2 dark:bg-rose-950/20">
              <CardHeader>
                <CardDescription>Security</CardDescription>
                <CardTitle>Reset admin passkey</CardTitle>
                <CardAction>
                  <div className="rounded-full bg-white/90 p-2 dark:bg-slate-800">
                    <KeyRound className="size-5 text-rose-600" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Use a dedicated security action to change the six-digit admin sign-in passkey instead of relying on a shared profile edit flow.
                </p>
                <Button asChild>
                  <Link href="/admin/reset-password">
                    <KeyRound className="mr-2 size-4" />
                    Reset Passkey
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
