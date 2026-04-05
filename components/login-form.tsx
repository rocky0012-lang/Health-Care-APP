"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  clearPatientSessions,
  createDoctorSession,
} from "@/lib/actions/auth-session.action"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getDoctorLoginRecord } from "@/lib/actions/doctor.action"
import { clearDoctorSession, setStoredDoctorName } from "@/lib/doctor-session"
import { clearPatientSession } from "@/lib/patient-session"

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_ENDPOINT || ""
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || ""

async function createEmailPasswordSession(email: string, password: string) {
  const response = await fetch(`${APPWRITE_ENDPOINT.replace(/\/$/, "")}/account/sessions/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    let message = "Invalid email or password."

    try {
      const payload = await response.json()
      if (typeof payload?.message === "string" && payload.message.trim()) {
        message = payload.message
      }
    } catch {
      // Fall back to the default message when the error body is not JSON.
    }

    return { ok: false as const, message }
  }

  return { ok: true as const }
}

async function deleteCurrentSession() {
  await fetch(`${APPWRITE_ENDPOINT.replace(/\/$/, "")}/account/sessions/current`, {
    method: "DELETE",
    headers: {
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
    },
    credentials: "include",
    cache: "no-store",
  })
}

export function LoginForm({
  className,
  redirectTo = "/doctor",
  ...props
}: React.ComponentProps<"form"> & { redirectTo?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage("")

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setErrorMessage("Email and password are required.")
      return
    }

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
      setErrorMessage("Doctor login is unavailable. Missing Appwrite public configuration.")
      return
    }

    setIsLoading(true)

    try {
      const session = await createEmailPasswordSession(normalizedEmail, password)
      if (!session.ok) {
        clearDoctorSession()
        setErrorMessage(session.message)
        return
      }

      const loginRecord = await getDoctorLoginRecord({
        email: normalizedEmail,
      })

      if (!loginRecord) {
        await deleteCurrentSession()
        clearDoctorSession()
        setErrorMessage("This account is not registered as a doctor.")
        return
      }

      await clearPatientSessions()
      await createDoctorSession(loginRecord.userId)
      clearPatientSession()
      setStoredDoctorName(loginRecord.userId, loginRecord.name)
      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      console.error("Doctor login failed:", error)
      clearDoctorSession()
      setErrorMessage("Unable to sign in right now. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Doctor login</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Sign in with your doctor credentials managed by your administrator.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="doctor@netcare.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
        <Field>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          Doctor access is provisioned by administrators only.
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
