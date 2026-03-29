"use client"

import { z } from "zod"
import { Controller, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { registerPatient } from "@/lib/actions/patient.action"

const formSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format, e.g. +14155552671"),
  birthDate: z.string().min(1, "Birth date is required"),
  gender: z.enum(["Male", "Female", "Other"], {
    error: "Gender is required",
  }),
  address: z.string().min(5, "Address must be at least 5 characters"),
  occupation: z.string().min(2, "Occupation is required"),
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Emergency contact must be in E.164 format"),
  primaryPhysician: z.string().min(2, "Primary physician is required"),
  insuranceProvider: z.string().min(2, "Insurance provider is required"),
  insurancePolicyNumber: z.string().min(2, "Insurance policy number is required"),
  allergies: z.string().optional(),
  currentMedication: z.string().optional(),
  familyMedicalHistory: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  identificationType: z.string().min(2, "Identification type is required"),
  identificationNumber: z.string().min(2, "Identification number is required"),
  identificationDocument: z.any().optional(),
  privacyConsent: z.boolean().refine((value) => value, {
    message: "You must consent to continue",
  }),
})

const RegisterForm = ({ userId }: { userId: string }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
      gender: "Male",
      address: "",
      occupation: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      primaryPhysician: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
      allergies: "",
      currentMedication: "",
      familyMedicalHistory: "",
      pastMedicalHistory: "",
      identificationType: "",
      identificationNumber: "",
      identificationDocument: undefined,
      privacyConsent: false,
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = new FormData()

    payload.append("userId", userId)
    payload.append("firstName", values.firstName)
    payload.append("lastName", values.lastName)
    payload.append("email", values.email)
    payload.append("phone", values.phone)
    payload.append("birthDate", values.birthDate)
    payload.append("gender", values.gender)
    payload.append("address", values.address)
    payload.append("occupation", values.occupation)
    payload.append("emergencyContactName", values.emergencyContactName)
    payload.append("emergencyContactNumber", values.emergencyContactNumber)
    payload.append("primaryPhysician", values.primaryPhysician)
    payload.append("insuranceProvider", values.insuranceProvider)
    payload.append("insurancePolicyNumber", values.insurancePolicyNumber)
    payload.append("allergies", values.allergies || "")
    payload.append("currentMedication", values.currentMedication || "")
    payload.append("familyMedicalHistory", values.familyMedicalHistory || "")
    payload.append("pastMedicalHistory", values.pastMedicalHistory || "")
    payload.append("identificationType", values.identificationType)
    payload.append("identificationNumber", values.identificationNumber)
    payload.append("privacyConsent", String(values.privacyConsent))

    const file = values.identificationDocument as File | undefined
    if (file) {
      payload.append("identificationDocument", file)
    }

    const patient = await registerPatient(payload)
    console.log("Patient registered:", patient)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
      <input type="hidden" value={userId} readOnly />
      <FieldSet className="space-y-4">
        <FieldLegend className="text-lg">Personal Details</FieldLegend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="grid gap-2">
            <FieldLabel htmlFor="firstName">First Name</FieldLabel>
            <Input id="firstName" placeholder="Enter first name" {...form.register("firstName")} />
            <FieldError>{form.formState.errors.firstName?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
            <Input id="lastName" placeholder="Enter last name" {...form.register("lastName")} />
            <FieldError>{form.formState.errors.lastName?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" placeholder="m@example.com" {...form.register("email")} />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
            <Input id="phone" type="tel" placeholder="+14155552671" {...form.register("phone")} />
            <FieldError>{form.formState.errors.phone?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="birthDate">Birth Date</FieldLabel>
            <Input id="birthDate" type="date" {...form.register("birthDate")} />
            <FieldError>{form.formState.errors.birthDate?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel>Gender</FieldLabel>
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <RadioGroup
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as "Male" | "Female" | "Other")}
                  onBlur={field.onBlur}
                  className="grid grid-cols-3 gap-3"
                >
                  <label htmlFor="gender-male" className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                    <RadioGroupItem value="Male" id="gender-male" />
                    <span>Male</span>
                  </label>
                  <label htmlFor="gender-female" className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                    <RadioGroupItem value="Female" id="gender-female" />
                    <span>Female</span>
                  </label>
                  <label htmlFor="gender-other" className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                    <RadioGroupItem value="Other" id="gender-other" />
                    <span>Other</span>
                  </label>
                </RadioGroup>
              )}
            />
            <FieldError>{form.formState.errors.gender?.message}</FieldError>
          </Field>
          <Field className="grid gap-2 md:col-span-2">
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea id="address" placeholder="Enter full address" {...form.register("address")} />
            <FieldError>{form.formState.errors.address?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
            <Input id="occupation" placeholder="Enter occupation" {...form.register("occupation")} />
            <FieldError>{form.formState.errors.occupation?.message}</FieldError>
          </Field>
        </div>
      </FieldSet>

      <FieldSet className="space-y-4">
        <FieldLegend className="text-lg">Emergency Contact</FieldLegend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="grid gap-2">
            <FieldLabel htmlFor="emergencyContactName">Contact Name</FieldLabel>
            <Input
              id="emergencyContactName"
              placeholder="Enter emergency contact name"
              {...form.register("emergencyContactName")}
            />
            <FieldError>{form.formState.errors.emergencyContactName?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="emergencyContactNumber">Contact Number</FieldLabel>
            <Input
              id="emergencyContactNumber"
              type="tel"
              placeholder="+14155552671"
              {...form.register("emergencyContactNumber")}
            />
            <FieldError>{form.formState.errors.emergencyContactNumber?.message}</FieldError>
          </Field>
        </div>
      </FieldSet>

      <FieldSet className="space-y-4">
        <FieldLegend className="text-lg">Insurance & Physician</FieldLegend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="grid gap-2">
            <FieldLabel htmlFor="primaryPhysician">Primary Physician</FieldLabel>
            <Input id="primaryPhysician" placeholder="Doctor name" {...form.register("primaryPhysician")} />
            <FieldError>{form.formState.errors.primaryPhysician?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="insuranceProvider">Insurance Provider</FieldLabel>
            <Input id="insuranceProvider" placeholder="Insurance company" {...form.register("insuranceProvider")} />
            <FieldError>{form.formState.errors.insuranceProvider?.message}</FieldError>
          </Field>
          <Field className="grid gap-2 md:col-span-2">
            <FieldLabel htmlFor="insurancePolicyNumber">Insurance Policy Number</FieldLabel>
            <Input
              id="insurancePolicyNumber"
              placeholder="Policy number"
              {...form.register("insurancePolicyNumber")}
            />
            <FieldError>{form.formState.errors.insurancePolicyNumber?.message}</FieldError>
          </Field>
        </div>
      </FieldSet>

      <FieldSet className="space-y-4">
        <FieldLegend className="text-lg">Medical History</FieldLegend>
        <div className="grid gap-4">
          <Field className="grid gap-2">
            <FieldLabel htmlFor="allergies">Allergies</FieldLabel>
            <Textarea id="allergies" placeholder="List any allergies" {...form.register("allergies")} />
            <FieldError>{form.formState.errors.allergies?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="currentMedication">Current Medication</FieldLabel>
            <Textarea
              id="currentMedication"
              placeholder="List current medications"
              {...form.register("currentMedication")}
            />
            <FieldError>{form.formState.errors.currentMedication?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="familyMedicalHistory">Family Medical History</FieldLabel>
            <Textarea
              id="familyMedicalHistory"
              placeholder="Relevant family history"
              {...form.register("familyMedicalHistory")}
            />
            <FieldError>{form.formState.errors.familyMedicalHistory?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="pastMedicalHistory">Past Medical History</FieldLabel>
            <Textarea
              id="pastMedicalHistory"
              placeholder="Past illnesses, surgeries, treatments"
              {...form.register("pastMedicalHistory")}
            />
            <FieldError>{form.formState.errors.pastMedicalHistory?.message}</FieldError>
          </Field>
        </div>
      </FieldSet>

      <FieldSet className="space-y-4">
        <FieldLegend className="text-lg">Identification</FieldLegend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="grid gap-2">
            <FieldLabel htmlFor="identificationType">Identification Type</FieldLabel>
            <Input
              id="identificationType"
              placeholder="Passport, National ID, Driver's License"
              {...form.register("identificationType")}
            />
            <FieldError>{form.formState.errors.identificationType?.message}</FieldError>
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="identificationNumber">Identification Number</FieldLabel>
            <Input
              id="identificationNumber"
              placeholder="Enter ID number"
              {...form.register("identificationNumber")}
            />
            <FieldError>{form.formState.errors.identificationNumber?.message}</FieldError>
          </Field>
          <Field className="grid gap-2 md:col-span-2">
            <FieldLabel htmlFor="identificationDocument">Identification Card Image</FieldLabel>
            <Input
              id="identificationDocument"
              type="file"
              accept="image/*"
              onChange={(event) => form.setValue("identificationDocument", event.target.files?.[0])}
            />
            <FieldDescription>Upload a clear image of your ID card or passport.</FieldDescription>
            <FieldError>{form.formState.errors.identificationDocument?.message as string | undefined}</FieldError>
          </Field>
        </div>
      </FieldSet>

      <Field className="grid gap-2">
        <Controller
          control={form.control}
          name="privacyConsent"
          render={({ field }) => (
            <label className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              <span className="text-sm">
                I agree to the processing of my personal and health data for registration and care purposes.
              </span>
            </label>
          )}
        />
        <FieldError>{form.formState.errors.privacyConsent?.message}</FieldError>
      </Field>

      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full md:w-auto">
        {form.formState.isSubmitting ? "Submitting..." : "Complete Registration"}
      </Button>
    </form>
  )
}

export default RegisterForm