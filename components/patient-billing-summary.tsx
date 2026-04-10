"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, ChevronUp, CreditCard, Landmark, Mail, Smartphone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePatientBilling } from "@/components/patient-billing-context"

const methodLabels: Record<PaymentMethodKind, string> = {
  card: "Debit or credit card",
  mobile: "Mobile wallet",
  bank: "Bank transfer",
}

const brandLabels: Record<PaymentCardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  verve: "Verve",
  unknown: "Card",
}

function formatPreferenceDate(value?: string) {
  if (!value) {
    return "Not updated yet"
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Not updated yet" : parsed.toLocaleString()
}

function getMethodIcon(method?: PaymentMethodKind) {
  if (method === "mobile") {
    return Smartphone
  }

  if (method === "bank") {
    return Landmark
  }

  return CreditCard
}

export function PatientBillingSummary() {
  const { patientName, savedPaymentMethod: paymentMethod, billingPreferences, isLoading, pendingAction, loadMessage } = usePatientBilling()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const MethodIcon = getMethodIcon(paymentMethod?.method)
  const summaryTitle = paymentMethod ? methodLabels[paymentMethod.method] : "No saved payment method"
  const summaryStatus = pendingAction
    ? pendingAction === "removing"
      ? "Removing..."
      : "Updating..."
    : billingPreferences.emailReceipt
      ? "Receipts on"
      : "Receipts off"

  return (
    <aside className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.9))] p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.65))]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Current billing info</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Billing summary</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Review your saved payment and receipt preferences without opening edit mode.
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <CheckCircle2 className="size-5" />
        </div>
      </div>

      {pendingAction ? (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
          {pendingAction === "removing"
            ? "Updating summary: removing saved payment method..."
            : "Updating summary with your latest billing changes..."}
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="mt-5 flex w-full items-center justify-between rounded-2xl border-slate-200/80 bg-white/80 px-4 py-3 text-left xl:hidden dark:border-slate-800 dark:bg-slate-950/45"
        onClick={() => setIsMobileOpen((current) => !current)}
      >
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{summaryTitle}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{summaryStatus}</p>
        </div>
        {isMobileOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </Button>

      <div className={`${isMobileOpen ? "mt-5 block" : "hidden"} xl:mt-5 xl:block`}>
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            Loading billing summary...
          </div>
        ) : null}

        {loadMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {loadMessage}
          </div>
        ) : null}

        {!isLoading && !loadMessage ? (
          <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/45">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Account holder</p>
            <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              {paymentMethod?.nameOnAccount || patientName || "No billing name saved"}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {paymentMethod ? "Using the currently stored billing identity." : "A payment method has not been saved yet."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/45">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <MethodIcon className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Saved payment method</p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {paymentMethod ? methodLabels[paymentMethod.method] : "No saved payment method"}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Reference</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {paymentMethod?.referenceHint || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Brand</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {paymentMethod?.brand ? brandLabels[paymentMethod.brand] : "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Expiry</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {paymentMethod?.expiryMonth && paymentMethod?.expiryYear
                    ? `${paymentMethod.expiryMonth}/${paymentMethod.expiryYear}`
                    : "Not stored"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Last updated</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {formatPreferenceDate(paymentMethod?.updatedAt || billingPreferences.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/45">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Billing preferences</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-900/70">
                <span>Save payment method for future appointments</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${billingPreferences.savePaymentMethod ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {pendingAction === "saving" ? "Updating..." : billingPreferences.savePaymentMethod ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-900/70">
                <span className="flex items-center gap-2">
                  <Mail className="size-4" />
                  Email receipt after successful payment
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${billingPreferences.emailReceipt ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {pendingAction === "saving" ? "Updating..." : billingPreferences.emailReceipt ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}