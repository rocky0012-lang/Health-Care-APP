"use client"

import Link from "next/link"
import { ArrowLeft, Bell, Database, Lock, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Admin Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure platform preferences, access, and operational controls.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/overview">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Notifications</CardDescription>
              <CardTitle>Operational Alerts</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <Bell className="size-5 text-blue-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage report updates, appointment alerts, and system notices.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/80 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>System Controls</CardDescription>
              <CardTitle>Clinic Configuration</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <SlidersHorizontal className="size-5 text-emerald-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Adjust operational preferences and administrative workflows.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Security</CardDescription>
              <CardTitle>Access Policies</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <Lock className="size-5 text-amber-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Control passkeys, session rules, and account permissions.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-violet-50/80 dark:bg-violet-950/30">
            <CardHeader>
              <CardDescription>Data</CardDescription>
              <CardTitle>Records & Backups</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <Database className="size-5 text-violet-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review data retention, exports, and archive preferences.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-slate-100/90 dark:bg-slate-900/80">
            <CardHeader>
              <CardDescription>Operational guidance</CardDescription>
              <CardTitle>Recommended admin checks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Review daily appointment notifications before opening hours.</div>
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Confirm clinic configuration after any staffing or schedule change.</div>
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Audit access rules regularly to keep records protected.</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Platform status</CardDescription>
              <CardTitle>Admin workspace ready</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">Notifications, system controls, and backup preferences are available from this screen.</div>
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">The layout now stacks cleanly on small devices and keeps card actions easy to tap.</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
