import {
  CalendarCheck,
  CreditCard,
  FileText,
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

export default function PatientDashboardPage() {
  return (
    <PatientShell pageTitle="My Dashboard" pageDescription="Track your care plan, appointments, and billing in one place.">
        <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Card className="bg-blue-50/70 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Next Appointment</CardDescription>
              <CardTitle>0 scheduled</CardTitle>
              <CardAction>
                <CalendarCheck className="size-7 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No appointments have been booked yet.
              </p>
            </CardContent>
          </Card>

          <Card id="records" className="bg-emerald-50/70 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>Medical Records</CardDescription>
              <CardTitle>0 updates</CardTitle>
              <CardAction>
                <FileText className="size-7 text-emerald-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No medical records have been added yet.
              </p>
            </CardContent>
          </Card>

          <Card id="billing" className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Outstanding Balance</CardDescription>
              <CardTitle>$0.00</CardTitle>
              <CardAction>
                <CreditCard className="size-7 text-amber-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No billing activity is available for this account.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="appointments" className="px-4 pb-6 md:px-6">
          <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>
                Review upcoming visits and prepare questions for your provider.
              </CardDescription>
              <CardAction>
                <CalendarCheck className="size-7 text-indigo-600" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                You do not have any upcoming appointments yet.
              </div>
            </CardContent>
          </Card>
        </section>
    </PatientShell>
  )
}
