import {
  CreditCard,
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

export default function PatientBillingPage() {
  return (
    <PatientShell pageTitle="Billing" pageDescription="Track invoices, insurance claims, and payments.">
        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <Card className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Outstanding Balance</CardDescription>
              <CardTitle>$0.00</CardTitle>
              <CardAction>
                <CreditCard className="size-7 text-amber-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No outstanding payments are due.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50/80 dark:bg-orange-950/30">
            <CardHeader>
              <CardDescription>Insurance Claim</CardDescription>
              <CardTitle>0 active claims</CardTitle>
              <CardAction>
                <CreditCard className="size-7 text-orange-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No insurance claims are currently in progress.
              </p>
            </CardContent>
          </Card>
        </section>
    </PatientShell>
  )
}
