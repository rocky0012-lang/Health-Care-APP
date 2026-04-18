"use client"

import Logo from "@/components/logo"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Home } from "lucide-react"

export default function DoctorForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim()) {
      setStatus("error")
      setMessage("Email is required.")
      return
    }

    setStatus("sending")
    setMessage("")

    try {
      const response = await fetch("/api/doctor-forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const result = await response.json()

      if (result.ok) {
        setStatus("success")
        setMessage("If an account with that email exists, a password reset link has been sent.")
      } else {
        setStatus("error")
        setMessage(result.message || "Failed to send reset email.")
      }
    } catch (error) {
      setStatus("error")
      setMessage("An error occurred. Please try again.")
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Logo width={220} height={38} className="w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={status === "sending"}>
                  {status === "sending" ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              {message && (
                <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
                  {message}
                </p>
              )}
              <div className="text-center">
                <Button variant="link" asChild>
                  <Link href="/doctor/login">
                    Back to login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/assets/images/onboarding-img.png"
          alt="Doctor portal"
          className="absolute inset-0 h-full w-full object-cover opacity-90 dark:brightness-[0.35]"
        />
      </div>
    </div>
  )
}