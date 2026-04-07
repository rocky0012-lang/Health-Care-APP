import {
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

export default function PatientRecordsPage() {
  return (
    <PatientShell pageTitle="Records" pageDescription="Review your medical records and recent updates.">
        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <Card className="bg-emerald-50/70 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>Latest Lab Results</CardDescription>
              <CardTitle>0 results</CardTitle>
              <CardAction>
                <FileText className="size-7 text-emerald-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No lab results have been uploaded yet.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50/70 dark:bg-teal-950/30">
            <CardHeader>
              <CardDescription>Recent Visit Notes</CardDescription>
              <CardTitle>0 notes</CardTitle>
              <CardAction>
                <FileText className="size-7 text-teal-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No clinical notes are available for this patient.
              </p>
            </CardContent>
          </Card>
        </section>
    </PatientShell>
  )
}
