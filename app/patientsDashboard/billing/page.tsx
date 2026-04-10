import {
  CreditCard,
  ShieldCheck,
} from "lucide-react"
import { PatientBillingProvider } from "@/components/patient-billing-context"
import { PatientShell } from "@/components/patient-shell"
import { PaymentForm } from "@/components/forms/paymentForm"
import { PatientBillingSummary } from "@/components/patient-billing-summary"
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
          <Card className="md:col-span-2 overflow-hidden border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(239,246,255,0.82))] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.5)] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,37,65,0.62))]">
            <CardHeader>
              <CardDescription>Payment Mode</CardDescription>
              <CardTitle>Manage your payment method</CardTitle>
              <CardAction>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-4" />
                  <span className="text-xs font-medium">Encrypted</span>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-300">
                Choose a preferred payment mode for future care charges, receipts, and invoice follow-up.
              </div>
              <PatientBillingProvider>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] xl:items-start">
                  <div className="order-2 xl:order-1">
                    <PaymentForm />
                  </div>
                  <div className="order-1 xl:order-2">
                    <PatientBillingSummary />
                  </div>
                </div>
              </PatientBillingProvider>
            </CardContent>
          </Card>
        </section>
    </PatientShell>
  )
}
