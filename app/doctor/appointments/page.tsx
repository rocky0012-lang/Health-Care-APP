import { CalendarClock, CircleAlert, FileClock } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DoctorShell } from "@/components/doctor-shell"

export default function DoctorAppointmentsPage() {
  return (
    <DoctorShell
      pageTitle="Appointments"
      pageDescription="Track today’s clinic flow and upcoming patient visits."
    >
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <Card className="bg-blue-50/70 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Today</CardDescription>
            <CardTitle>0 booked</CardTitle>
            <CardAction>
              <CalendarClock className="size-7 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Appointment slots booked for today will appear here.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
          <CardHeader>
            <CardDescription>This Week</CardDescription>
            <CardTitle>0 scheduled</CardTitle>
            <CardAction>
              <FileClock className="size-7 text-emerald-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Weekly appointment volume and follow-up demand will be summarized here.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Attention Needed</CardDescription>
            <CardTitle>0 issues</CardTitle>
            <CardAction>
              <CircleAlert className="size-7 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Late arrivals, reschedules, and conflicts will be highlighted here.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
          <CardHeader>
            <CardTitle>Upcoming Visits</CardTitle>
            <CardDescription>
              This view is ready for real appointment data from your scheduling flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-indigo-200 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-indigo-900/60 dark:bg-slate-950/60">
              No appointments are scheduled for this doctor yet.
            </div>
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}