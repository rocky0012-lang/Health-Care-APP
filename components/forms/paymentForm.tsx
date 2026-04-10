"use client"

import { useEffect, useState } from "react"
import { CreditCard, Landmark, ShieldCheck, Smartphone } from "lucide-react"

import {
  removePatientSavedPaymentMethod,
  savePatientBillingPreferences,
  savePatientPaymentMethod,
} from "@/lib/actions/patient.action"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getCurrentPatientUserId } from "@/lib/patient-session"
import {
  DEFAULT_PATIENT_BILLING_PREFERENCES,
  usePatientBilling,
} from "@/components/patient-billing-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const paymentMethods = [
  {
    id: "card",
    label: "Debit or credit card",
    description: "Visa, Mastercard, Verve and prepaid cards",
    icon: CreditCard,
  },
  {
    id: "mobile",
    label: "Mobile wallet",
    description: "Fast checkout using a linked mobile number",
    icon: Smartphone,
  },
  {
    id: "bank",
    label: "Bank transfer",
    description: "Pay from your bank and upload the reference later",
    icon: Landmark,
  },
] as const

const expiryMonths = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
] as const

const expiryYears = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035"] as const

type PaymentFormValues = {
  nameOnAccount: string
  referenceNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  notes: string
}

type PaymentFormErrors = Partial<Record<keyof PaymentFormValues, string>>

const initialValues: PaymentFormValues = {
  nameOnAccount: "",
  referenceNumber: "",
  expiryMonth: "",
  expiryYear: "",
  cvv: "",
  notes: "",
}

const brandAppearance: Record<PaymentCardBrand, { label: string; accentClassName: string; glyph: string }> = {
  visa: {
    label: "Visa",
    accentClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    glyph: "V",
  },
  mastercard: {
    label: "Mastercard",
    accentClassName: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    glyph: "M",
  },
  amex: {
    label: "Amex",
    accentClassName: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    glyph: "A",
  },
  discover: {
    label: "Discover",
    accentClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    glyph: "D",
  },
  verve: {
    label: "Verve",
    accentClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    glyph: "V",
  },
  unknown: {
    label: "Card",
    accentClassName: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    glyph: "C",
  },
}

function formatCardNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 19)
  return digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}

function formatReferenceNumber(value: string, method: (typeof paymentMethods)[number]["id"]) {
  const digitsOnly = value.replace(/\D/g, "")

  if (method === "bank") {
    return digitsOnly.slice(0, 18)
  }

  return formatCardNumber(digitsOnly)
}

function formatCvv(value: string) {
  return value.replace(/\D/g, "").slice(0, 4)
}

function detectCardBrand(value: string): PaymentCardBrand {
  const digits = value.replace(/\D/g, "")

  if (/^4/.test(digits)) {
    return "visa"
  }

  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) {
    return "mastercard"
  }

  if (/^3[47]/.test(digits)) {
    return "amex"
  }

  if (/^(6011|65|64[4-9])/.test(digits)) {
    return "discover"
  }

  if (/^(5060|5061|5078|5079|6500)/.test(digits)) {
    return "verve"
  }

  return "unknown"
}

function passesLuhnCheck(cardNumber: string) {
  const digits = cardNumber.replace(/\s/g, "")

  if (digits.length < 16) {
    return false
  }

  let sum = 0
  let shouldDouble = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])

    if (Number.isNaN(digit)) {
      return false
    }

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

function validatePaymentValues(values: PaymentFormValues, method: (typeof paymentMethods)[number]["id"]): PaymentFormErrors {
  const nextErrors: PaymentFormErrors = {}
  const trimmedName = values.nameOnAccount.trim()
  const normalizedReference = values.referenceNumber.replace(/\s/g, "")

  if (trimmedName.length < 2) {
    nextErrors.nameOnAccount = "Enter the name attached to this payment method."
  }

  if (method === "bank") {
    if (normalizedReference.length < 10) {
      nextErrors.referenceNumber = "Enter a valid bank or account reference of at least 10 digits."
    }
  } else {
    if (normalizedReference.length < 16 || normalizedReference.length > 19) {
      nextErrors.referenceNumber = "Card number must contain 16 to 19 digits."
    } else if (!passesLuhnCheck(values.referenceNumber)) {
      nextErrors.referenceNumber = "Enter a valid card number."
    }

    if (!values.expiryMonth) {
      nextErrors.expiryMonth = "Select an expiry month."
    }

    if (!values.expiryYear) {
      nextErrors.expiryYear = "Select an expiry year."
    }

    if (values.expiryMonth && values.expiryYear) {
      const expiryMonthIndex = Number(values.expiryMonth) - 1
      const expiryYearNumber = Number(values.expiryYear)
      const expiryDate = new Date(expiryYearNumber, expiryMonthIndex + 1, 0, 23, 59, 59, 999)
      const now = new Date()

      if (Number.isNaN(expiryDate.getTime()) || expiryDate < now) {
        nextErrors.expiryYear = "This card appears to be expired."
      }
    }

    if (!/^\d{3,4}$/.test(values.cvv)) {
      nextErrors.cvv = "CVV must be 3 or 4 digits."
    }
  }

  return nextErrors
}

function CardBrandBadge({ brand }: { brand: PaymentCardBrand }) {
  const appearance = brandAppearance[brand]

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${appearance.accentClassName}`}>
      <span className="flex size-5 items-center justify-center rounded-full bg-white/70 text-[11px] font-semibold dark:bg-slate-950/60">
        {appearance.glyph}
      </span>
      <span>{appearance.label}</span>
    </div>
  )
}

export function PaymentForm() {
  const {
    patientUserId,
    savedPaymentMethod,
    billingPreferences: persistedBillingPreferences,
    isLoading,
    loadMessage: sharedLoadMessage,
    setBillingState,
  } = usePatientBilling()
  const [selectedMethod, setSelectedMethod] = useState<(typeof paymentMethods)[number]["id"]>("card")
  const [values, setValues] = useState<PaymentFormValues>(initialValues)
  const [errors, setErrors] = useState<PaymentFormErrors>({})
  const [saveMessage, setSaveMessage] = useState("")
  const [loadMessage, setLoadMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [billingPreferences, setBillingPreferences] = useState<PatientBillingPreferences>(DEFAULT_PATIENT_BILLING_PREFERENCES)

  const requiresCardValidation = selectedMethod !== "bank"
  const detectedBrand = selectedMethod === "bank" ? "unknown" : detectCardBrand(values.referenceNumber)

  useEffect(() => {
    setBillingPreferences(persistedBillingPreferences)
  }, [persistedBillingPreferences])

  useEffect(() => {
    if (savedPaymentMethod) {
      setSelectedMethod(savedPaymentMethod.method)
      setValues((current) => ({
        ...current,
        nameOnAccount: savedPaymentMethod.nameOnAccount || "",
        expiryMonth: savedPaymentMethod.expiryMonth || "",
        expiryYear: savedPaymentMethod.expiryYear || "",
        notes: savedPaymentMethod.notes || "",
        referenceNumber: "",
        cvv: "",
      }))
      return
    }

    setSelectedMethod("card")
    setValues(initialValues)
  }, [savedPaymentMethod])

  const updateValue = <K extends keyof PaymentFormValues>(key: K, value: PaymentFormValues[K]) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }))
    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }))
    setSaveMessage("")
    setLoadMessage("")
  }

  const updateBillingPreference = (key: keyof Omit<PatientBillingPreferences, "updatedAt">, checked: boolean) => {
    setBillingPreferences((current) => ({
      ...current,
      [key]: checked,
    }))
    setSaveMessage("")
    setLoadMessage("")
  }

  const handleMethodChange = (method: (typeof paymentMethods)[number]["id"]) => {
    setSelectedMethod(method)
    setErrors({})
    setSaveMessage("")
    setLoadMessage("")
    setValues((current) => ({
      ...current,
      referenceNumber: formatReferenceNumber(current.referenceNumber, method),
      expiryMonth: method === "bank" ? "" : current.expiryMonth,
      expiryYear: method === "bank" ? "" : current.expiryYear,
      cvv: method === "bank" ? "" : current.cvv,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validatePaymentValues(values, selectedMethod)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSaveMessage("")
      return
    }

    const userId = patientUserId || getCurrentPatientUserId()

    if (!userId) {
      setLoadMessage("Sign in to save a preferred payment method.")
      return
    }

    setIsSaving(true)
    setBillingState({ pendingAction: "saving", loadMessage: "" })

    try {
      const persistedPreferences = await savePatientBillingPreferences({
        userId,
        savePaymentMethod: billingPreferences.savePaymentMethod,
        emailReceipt: billingPreferences.emailReceipt,
      })

      setBillingPreferences(persistedPreferences)

      let persistedMethod: PatientSavedPaymentMethod | null = null

      if (billingPreferences.savePaymentMethod) {
        persistedMethod = await savePatientPaymentMethod({
          userId,
          method: selectedMethod,
          brand: selectedMethod === "bank" ? undefined : detectedBrand,
          nameOnAccount: values.nameOnAccount,
          referenceNumber: values.referenceNumber,
          expiryMonth: selectedMethod === "bank" ? undefined : values.expiryMonth,
          expiryYear: selectedMethod === "bank" ? undefined : values.expiryYear,
          notes: values.notes,
        })
      } else if (savedPaymentMethod) {
        await removePatientSavedPaymentMethod(userId)
      }

      setBillingState({
        savedPaymentMethod: persistedMethod,
        billingPreferences: persistedPreferences,
        pendingAction: null,
        loadMessage: "",
      })
      setValues((current) => ({
        ...current,
        referenceNumber: "",
        cvv: "",
      }))
      const paymentMessage = billingPreferences.savePaymentMethod
        ? selectedMethod === "bank"
          ? "Bank transfer details saved for billing follow-up."
          : "Payment method validated and saved for future appointments."
        : selectedMethod === "bank"
          ? "Bank transfer details validated for one-time billing use."
          : "Payment method validated for one-time checkout only."
      const receiptMessage = billingPreferences.emailReceipt
        ? "Email receipts are enabled for successful payments."
        : "Email receipts are turned off for this billing profile."

      setSaveMessage(`${paymentMessage} ${receiptMessage}`)
    } catch (error: any) {
      console.error("Failed to save payment method", error)
      setBillingState({ pendingAction: null })
      setLoadMessage(error?.message || "Unable to save the payment method right now.")
      setSaveMessage("")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setValues(initialValues)
    setErrors({})
    setSaveMessage("")
    setLoadMessage("")
    setBillingPreferences(persistedBillingPreferences)

    if (savedPaymentMethod) {
      setSelectedMethod(savedPaymentMethod.method)
      setValues({
        nameOnAccount: savedPaymentMethod.nameOnAccount || "",
        referenceNumber: "",
        expiryMonth: savedPaymentMethod.expiryMonth || "",
        expiryYear: savedPaymentMethod.expiryYear || "",
        cvv: "",
        notes: savedPaymentMethod.notes || "",
      })
      return
    }

    setSelectedMethod("card")
    setValues(initialValues)
  }

  const handleRemoveSavedMethod = async () => {
    const userId = patientUserId || getCurrentPatientUserId()

    if (!userId) {
      setLoadMessage("Sign in to remove your saved payment method.")
      return
    }

    setIsRemoving(true)
    setSaveMessage("")
    setLoadMessage("")
    setBillingState({ pendingAction: "removing", loadMessage: "" })

    try {
      await removePatientSavedPaymentMethod(userId)
      setBillingState({
        savedPaymentMethod: null,
        pendingAction: null,
        loadMessage: "",
      })
      setValues(initialValues)
      setErrors({})
      setSelectedMethod("card")
      setIsRemoveDialogOpen(false)
      setSaveMessage("Saved payment method removed from your billing profile.")
    } catch (error: any) {
      console.error("Failed to remove payment method", error)
      setBillingState({ pendingAction: null })
      setLoadMessage(error?.message || "Unable to remove the payment method right now.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(236,253,245,0.9))] p-5 shadow-[0_22px_60px_-34px_rgba(16,185,129,0.5)] dark:border-emerald-900/40 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(6,78,59,0.22))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Secure checkout
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Choose how you want to pay
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Select a payment mode for consultation fees, follow-up visits, and future invoices.
            </p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-6" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            const isSelected = method.id === selectedMethod

            return (
              <button
                key={method.id}
                type="button"
                onClick={() => handleMethodChange(method.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 shadow-[0_16px_32px_-24px_rgba(16,185,129,0.75)] dark:border-emerald-400 dark:bg-emerald-950/30"
                    : "border-slate-200 bg-white/70 hover:border-emerald-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-emerald-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-2xl ${isSelected ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className={`size-3 rounded-full ${isSelected ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                </div>
                <p className="mt-4 font-semibold text-slate-900 dark:text-white">{method.label}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{method.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/55">
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            {savedPaymentMethod ? (
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/45">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Saved payment method</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {savedPaymentMethod.referenceHint || `${savedPaymentMethod.method} ending ${savedPaymentMethod.last4 || "----"}`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Updated {new Date(savedPaymentMethod.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {savedPaymentMethod.method}
                    </span>
                    <CardBrandBadge brand={savedPaymentMethod.brand || "unknown"} />
                  </div>
                </div>
                <div className="mt-4 flex justify-end border-t border-slate-200/70 pt-4 dark:border-slate-800/80">
                  <Button
                    variant="outline"
                    type="button"
                    size="sm"
                    className="w-full md:w-auto"
                    disabled={isRemoving}
                    onClick={() => setIsRemoveDialogOpen(true)}
                  >
                    {isRemoving ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-300">
                Loading saved payment method...
              </div>
            ) : null}

            <FieldSet>
              <FieldLegend>Payment details</FieldLegend>
              <FieldDescription>
                {selectedMethod === "card"
                  ? "Use your card details to make a direct payment."
                  : selectedMethod === "mobile"
                    ? "Provide the card backup details for wallet-linked payment approval."
                    : "Save your payer details and use bank transfer as the final settlement step."}
              </FieldDescription>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="payment-card-name">Name on account</FieldLabel>
                  <Input
                    id="payment-card-name"
                    placeholder="NetCare Patient"
                    value={values.nameOnAccount}
                    onChange={(event) => updateValue("nameOnAccount", event.target.value)}
                    required
                  />
                  <FieldError>{errors.nameOnAccount}</FieldError>
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="payment-card-number">Reference card or account number</FieldLabel>
                    {selectedMethod !== "bank" ? <CardBrandBadge brand={detectedBrand} /> : null}
                  </div>
                  <Input
                    id="payment-card-number"
                    placeholder={selectedMethod === "bank" ? "0123456789" : "1234 5678 9012 3456"}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={values.referenceNumber}
                    onChange={(event) => updateValue("referenceNumber", formatReferenceNumber(event.target.value, selectedMethod))}
                    required
                  />
                  <FieldDescription>
                    {selectedMethod === "bank"
                      ? "Use your bank-linked card or account reference."
                      : "Enter your active payment card number."}
                  </FieldDescription>
                  <FieldError>{errors.referenceNumber}</FieldError>
                </Field>
                {requiresCardValidation ? (
                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel htmlFor="payment-exp-month">Month</FieldLabel>
                      <Select value={values.expiryMonth} onValueChange={(value) => updateValue("expiryMonth", value)}>
                        <SelectTrigger id="payment-exp-month" className="w-full">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {expiryMonths.map((month) => (
                              <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.expiryMonth}</FieldError>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="payment-exp-year">Year</FieldLabel>
                      <Select value={values.expiryYear} onValueChange={(value) => updateValue("expiryYear", value)}>
                        <SelectTrigger id="payment-exp-year" className="w-full">
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {expiryYears.map((year) => (
                              <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.expiryYear}</FieldError>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="payment-cvv">CVV</FieldLabel>
                      <Input
                        id="payment-cvv"
                        placeholder="123"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        value={values.cvv}
                        onChange={(event) => updateValue("cvv", formatCvv(event.target.value))}
                        required
                      />
                      <FieldError>{errors.cvv}</FieldError>
                    </Field>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-300">
                    Bank transfer does not require CVV or card expiry details. Save the account reference and complete the transfer from your bank.
                  </div>
                )}
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Billing preferences</FieldLegend>
              <FieldDescription>
                Choose how the payment should be recorded against your treatment history.
              </FieldDescription>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox
                    id="payment-save-method"
                    checked={billingPreferences.savePaymentMethod}
                    onCheckedChange={(checked) => updateBillingPreference("savePaymentMethod", checked === true)}
                  />
                  <FieldLabel htmlFor="payment-save-method" className="font-normal">
                    Save this payment method for future appointments
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="payment-email-receipt"
                    checked={billingPreferences.emailReceipt}
                    onCheckedChange={(checked) => updateBillingPreference("emailReceipt", checked === true)}
                  />
                  <FieldLabel htmlFor="payment-email-receipt" className="font-normal">
                    Email a receipt after successful payment
                  </FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="payment-notes">Notes for billing desk</FieldLabel>
                  <Textarea
                    id="payment-notes"
                    placeholder="Add transfer references, insurance notes, or payment instructions"
                    className="resize-none"
                    value={values.notes}
                    onChange={(event) => updateValue("notes", event.target.value)}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            {saveMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                {saveMessage}
              </div>
            ) : null}

            {loadMessage || sharedLoadMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {loadMessage || sharedLoadMessage}
              </div>
            ) : null}

            <Field orientation="horizontal">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving payment method..." : "Save payment method"}
              </Button>
              <Button variant="outline" type="button" onClick={handleCancel}>Cancel</Button>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the saved billing metadata from your profile. You can still add a new payment method later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:flex-none">
            <AlertDialogCancel className="w-full" disabled={isRemoving}>Keep it</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="h-auto w-full whitespace-normal text-center"
              disabled={isRemoving}
              onClick={handleRemoveSavedMethod}
            >
              {isRemoving ? "Removing..." : "Remove payment method"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
