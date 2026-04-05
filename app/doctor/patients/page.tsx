import { HeartPulse, UserRoundPlus, Users } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DoctorShell } from "@/components/doctor-shell"

export default function DoctorPatientsPage() {
  return (
    <DoctorShell
      pageTitle="My Patients"
      pageDescription="Review your assigned roster and keep track of follow-up care."
    >
      <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <Card className="bg-blue-50/70 dark:bg-blue-950/30">
          <CardHeader>
            <CardDescription>Assigned Patients</CardDescription>
            <CardTitle>0 active</CardTitle>
            <CardAction>
              <Users className="size-7 text-blue-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your assigned patient roster will appear here.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
          <CardHeader>
            <CardDescription>New Intake</CardDescription>
            <CardTitle>0 awaiting review</CardTitle>
            <CardAction>
              <UserRoundPlus className="size-7 text-emerald-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Newly assigned patients will be highlighted for first review.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader>
            <CardDescription>Care Plans</CardDescription>
            <CardTitle>0 requiring updates</CardTitle>
            <CardAction>
              <HeartPulse className="size-7 text-amber-600" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Follow-up plans and notes will surface here as your roster grows.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-6 md:px-6">
        <Card className="bg-slate-100/90 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Patient Roster</CardTitle>
            <CardDescription>
              Assigned patients will be listed here once doctor-to-patient assignment is added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/60">
              No patients are assigned to this doctor account yet.
            </div>
          </CardContent>
        </Card>
      </section>
    </DoctorShell>
  )
}