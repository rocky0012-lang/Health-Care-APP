import {
  CalendarCheck,
} from "lucide-react"
import { PatientShell } from "@/components/patient-shell"
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function PatientAppointmentsPage() {
  return (
    <PatientShell pageTitle="Appointments" pageDescription="View and manage your scheduled visits.">
        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <Card className="bg-blue-50/70 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Next Appointment</CardDescription>
              <CardTitle>0 upcoming</CardTitle>
              <CardAction>
                <CalendarCheck className="size-7 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No upcoming appointments have been scheduled.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
            <CardHeader>
              <CardDescription>Completed Appointments</CardDescription>
              <CardTitle>0 visits</CardTitle>
              <CardAction>
                <CalendarCheck className="size-7 text-indigo-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No appointment history is available yet.
              </p>
            </CardContent>
          </Card>
        </section>
    </PatientShell>
  )
}
