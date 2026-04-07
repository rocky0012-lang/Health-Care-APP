"use client"

import { Bell, Globe, Lock, Palette } from "lucide-react"

import { PatientShell } from "@/components/patient-shell"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <PatientShell
      pageTitle="Settings"
      pageDescription="Manage notification preferences, language, privacy, and appearance."
    >
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Notifications</CardDescription>
              <CardTitle>Alerts & Reminders</CardTitle>
              <CardAction>
                <Bell className="size-6 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Control appointment reminders and account notifications.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/80 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>Language</CardDescription>
              <CardTitle>English (US)</CardTitle>
              <CardAction>
                <Globe className="size-6 text-emerald-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose the preferred language for the dashboard.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Privacy</CardDescription>
              <CardTitle>Protected Access</CardTitle>
              <CardAction>
                <Lock className="size-6 text-amber-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review your privacy, login, and access preferences.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-violet-50/80 dark:bg-violet-950/30">
            <CardHeader>
              <CardDescription>Appearance</CardDescription>
              <CardTitle>Theme & Display</CardTitle>
              <CardAction>
                <Palette className="size-6 text-violet-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Adjust how the dashboard looks and feels.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
    </PatientShell>
  )
}
