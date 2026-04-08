"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react"

import { resetAdminPassword } from "@/lib/actions/auth-session.action"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function AdminResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [nextPassword, setNextPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async () => {
    setSaveMessage("")
    setErrorMessage("")

    if (!currentPassword.trim() || !nextPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage("Fill in the current passkey, new passkey, and confirmation.")
      return
    }

    setIsSaving(true)

    try {
      await resetAdminPassword({
        currentPassword,
        nextPassword,
        confirmPassword,
      })

      setCurrentPassword("")
      setNextPassword("")
      setConfirmPassword("")
      setSaveMessage("Admin passkey updated successfully.")
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || "Failed to reset the admin passkey.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Reset Admin Passkey</h1>
            <p className="text-sm text-muted-foreground">
              Change the admin sign-in passkey using the same six-digit format as the access modal.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/profile">
              <ArrowLeft className="mr-2 size-4" />
              Back to profile
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Security action</CardDescription>
              <CardTitle>Admin credentials</CardTitle>
              <CardAction>
                <KeyRound className="size-5 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                This updates the six-digit passkey used by the admin access modal.
              </div>
              <div className="rounded-lg border bg-white/80 px-4 py-3 dark:bg-slate-950/70">
                Choose a six-digit passkey that only the clinic administrator should know.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Reset passkey</CardDescription>
              <CardTitle>Set a new six-digit admin passkey</CardTitle>
              <CardAction>
                <ShieldCheck className="size-5 text-emerald-600" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">
                  Current passkey
                </label>
                <InputOTP
                  maxLength={6}
                  value={currentPassword}
                  onChange={(value) => setCurrentPassword(value)}
                  containerClassName="justify-start gap-3"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">Enter the current 6-digit admin passkey.</p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">
                  New passkey
                </label>
                <InputOTP
                  maxLength={6}
                  value={nextPassword}
                  onChange={(value) => setNextPassword(value)}
                  containerClassName="justify-start gap-3"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">Use exactly 6 digits.</p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">
                  Confirm new passkey
                </label>
                <InputOTP
                  maxLength={6}
                  value={confirmPassword}
                  onChange={(value) => setConfirmPassword(value)}
                  containerClassName="justify-start gap-3"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">Re-enter the same 6 digits to confirm.</p>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              {saveMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {saveMessage}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving}>
                  <KeyRound className="mr-2 size-4" />
                  {isSaving ? "Updating..." : "Reset passkey"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}