"use client"

import { z } from "zod"
import Link from "next/link"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import CustomFormField from "../CustomFormField"
import { getPatientLoginRecord } from "@/lib/actions/patient.action"
import {
  activatePatientSession,
  beginPendingPatientSession,
} from "@/lib/actions/auth-session.action"
import {
  clearPendingPatientUserId,
  setCurrentPatientUserId,
  setPendingPatientUserId,
  setStoredPatientName,
  clearPatientSession,
} from "@/lib/patient-session"

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format, e.g. +14155552671"),
})

export const UnifiedLoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      phone: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const patientRecord = await getPatientLoginRecord(values)

      // Patient login (default)
      if (!patientRecord?.userId) {
        setErrorMessage("No patient account was found for these details. Please sign up.")
        return
      }

      setCurrentPatientUserId(patientRecord.userId)
      setStoredPatientName(patientRecord.userId, patientRecord.name || "Patient")

      if (patientRecord.hasProfile) {
        await activatePatientSession(patientRecord.userId)
        clearPendingPatientUserId()
        router.push("/patientsDashboard")
        router.refresh()
        return
      }

      setPendingPatientUserId(patientRecord.userId)
      await beginPendingPatientSession(patientRecord.userId)
      router.push(`/patients/${patientRecord.userId}/register`)
      router.refresh()
    } catch (error: any) {
      console.error("Unified login failed:", error)
      setErrorMessage(error?.message || "Unable to log in right now. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-none bg-transparent p-0 shadow-none">
        <CardContent className="grid p-0">
          <form className="p-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Welcome back 👋</h1>
                <p className="max-w-md text-balance text-base text-muted-foreground md:text-lg">
                  Log in to your NetCare account
                </p>
              </div>
              <CustomFormField
                id="email"
                type="email"
                label="Email"
                className="text-base"
                placeholder="m@example.com"
                required
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />
              <Field className="grid gap-2">
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneNumberInput
                      id="phone"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter phone number"
                      required
                      invalid={Boolean(form.formState.errors.phone)}
                    />
                  )}
                />
                <FieldError>{form.formState.errors.phone?.message}</FieldError>
              </Field>
              {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
              <Field>
                <Button type="submit" className="text-2xl size-35" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Log in"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                New to NetCare?{" "}
                <Link href="/auth/signup" className="text-blue-600 hover:underline">
                  Create an account
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
