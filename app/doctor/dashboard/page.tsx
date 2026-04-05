import {
  CalendarDays,
  ClipboardList,
  Users,
} from "lucide-react"
import { DoctorShell } from "@/components/doctor-shell"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DoctorDashboardPage() {
  return (
    <DoctorShell
      pageTitle="My Dashboard"
      pageDescription="View your schedule, patient list, and daily activity."
    >
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Card className="bg-blue-50/70 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Today&apos;s Appointments</CardDescription>
              <CardTitle>0 scheduled</CardTitle>
              <CardAction>
                <CalendarDays className="size-7 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No appointments are scheduled for today.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>Active Patients</CardDescription>
              <CardTitle>0 assigned</CardTitle>
              <CardAction>
                <Users className="size-7 text-emerald-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No patients have been assigned yet.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Pending Reports</CardDescription>
              <CardTitle>0 pending</CardTitle>
              <CardAction>
                <ClipboardList className="size-7 text-amber-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No reports are awaiting your review.
              </p>
            </CardContent>
          </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
          <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>
                Review your upcoming patient visits and prepare notes in advance.
              </CardDescription>
              <CardAction>
                <CalendarDays className="size-7 text-indigo-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming appointments found.
              </p>
            </CardContent>
          </Card>
      </section>
    </DoctorShell>
  )
}
