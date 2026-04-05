import { Clock3, Hospital, TimerReset } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DoctorShell } from "@/components/doctor-shell"

export default function DoctorSchedulePage() {
  return (
    <DoctorShell
      pageTitle="Schedule"
      pageDescription="Manage availability, clinic coverage, and shift timing."
    >
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <Card className="bg-blue-50/70 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Next Shift</CardDescription>
            <CardTitle>Not scheduled</CardTitle>
            <CardAction>
              <Clock3 className="size-7 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your upcoming shift details will appear here once schedules are assigned.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
          <CardHeader>
            <CardDescription>Coverage</CardDescription>
            <CardTitle>No clinic blocks</CardTitle>
            <CardAction>
              <Hospital className="size-7 text-emerald-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Department and clinic room allocations will be shown here.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Availability</CardDescription>
            <CardTitle>No updates pending</CardTitle>
            <CardAction>
              <TimerReset className="size-7 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Availability requests and schedule changes will appear here.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card className="bg-slate-100/90 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              This section is ready for clinic availability blocks and doctor shift assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
              ].map((day) => (
                <div
                  key={day}
                  className="rounded-lg border bg-white/80 px-4 py-5 text-center text-sm text-muted-foreground dark:bg-slate-950/70"
                >
                  <p className="font-medium text-foreground">{day}</p>
                  <p className="mt-2">No shift assigned</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}