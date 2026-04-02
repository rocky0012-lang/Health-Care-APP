"use client"

import Link from "next/link"
import { ArrowLeft, Bell, Globe, Lock, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage notifications, language, privacy, and appearance.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/patientsDashboard">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>

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
  )
}
