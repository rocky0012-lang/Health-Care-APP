"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import {
  IdCard,
  Save,
  Upload,
} from "lucide-react"

import { PatientShell } from "@/components/patient-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { listDoctors } from "@/lib/actions/doctor.action"
import { getPatientByUserId, updatePatientProfile } from "@/lib/actions/patient.action"
import { isE164PhoneNumber } from "@/lib/phone"
import {
  getStoredPatientAvatar,
  setStoredPatientAvatar,
  setStoredPatientName,
} from "@/lib/patient-session"

type ProfileFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  gender: Gender
  address: string
  occupation: string
  emergencyContactName: string
  emergencyContactNumber: string
  primaryPhysician: string
  insuranceProvider: string
  insurancePolicyNumber: string
  allergies: string
  currentMedication: string
  familyMedicalHistory: string
  pastMedicalHistory: string
  identificationType: string
  identificationNumber: string
  privacyConsent: boolean
}

type ProfileDoctorOption = Awaited<ReturnType<typeof listDoctors>>[number]

const emptyForm: ProfileFormState = {
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
  privacyConsent: false,
}

function splitName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { firstName: "", lastName: "" }
  }

  const parts = trimmed.split(/\s+/)
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  }
}

function toDateInputValue(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().split("T")[0]
}

function toDisplayName(form: ProfileFormState) {
  return `${form.firstName} ${form.lastName}`.trim()
}

function normalizeDoctorMatchValue(value?: string) {
  return value?.trim().toLowerCase() || ""
}

function getDoctorDisplayName(doctor: ProfileDoctorOption) {
  return doctor.name || doctor.fullName || ""
}

function getDoctorSpecialtyLabel(doctor: ProfileDoctorOption) {
  return doctor.specialization || doctor.specialty || "General care"
}

function findDoctorForPrimaryPhysician(doctors: ProfileDoctorOption[], primaryPhysician?: string) {
  const normalizedPrimaryPhysician = normalizeDoctorMatchValue(primaryPhysician)

  if (!normalizedPrimaryPhysician) {
    return null
  }

  return (
    doctors.find((doctor) => {
      const candidates = [doctor.$id, doctor.name, doctor.fullName]
      return candidates.some((candidate) => normalizeDoctorMatchValue(candidate) === normalizedPrimaryPhysician)
    }) || null
  )
}

export default function ProfilePage() {
  const [userId, setUserId] = useState("")
  const [form, setForm] = useState<ProfileFormState>(emptyForm)
  const [availableDoctors, setAvailableDoctors] = useState<ProfileDoctorOption[]>([])
  const [doctorTypeFilter, setDoctorTypeFilter] = useState("all")
  const [avatarPreview, setAvatarPreview] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [identificationFile, setIdentificationFile] = useState<File | null>(null)
  const [identificationFileName, setIdentificationFileName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [phoneError, setPhoneError] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      const storedUserId =
        window.localStorage.getItem("patientUserId") ||
        window.localStorage.getItem("pendingPatientUserId") ||
        ""
      const storedAvatar = getStoredPatientAvatar(storedUserId)
      const hasLocalAvatar = storedAvatar.startsWith("data:")

      setAvatarPreview(hasLocalAvatar ? storedAvatar : "")
      setUserId(storedUserId)

      if (!storedUserId) {
        setErrorMessage("Patient profile could not be loaded. Please register again.")
        setIsLoading(false)
        return
      }

      try {
        const [patient, doctors] = await Promise.all([
          getPatientByUserId(storedUserId),
          listDoctors(500),
        ])

        if (!patient) {
          setErrorMessage("No patient profile was found for this account.")
          setIsLoading(false)
          return
        }

        const activeDoctors = doctors.filter((doctor) => (doctor.accountStatus || "active") === "active")
        const matchedPrimaryDoctor = findDoctorForPrimaryPhysician(activeDoctors, patient.primaryPhysician || "")

        setAvailableDoctors(activeDoctors)
        setDoctorTypeFilter(
          matchedPrimaryDoctor
            ? normalizeDoctorMatchValue(getDoctorSpecialtyLabel(matchedPrimaryDoctor)) || "all"
            : "all"
        )

        const name = splitName(patient.name || "")

        setForm({
          firstName: name.firstName,
          lastName: name.lastName,
          email: patient.email || "",
          phone: patient.phone || "",
          birthDate: toDateInputValue(patient.birthDate),
          gender:
            patient.gender === "female"
              ? "Female"
              : patient.gender === "other"
                ? "Other"
                : "Male",
          address: patient.address || "",
          occupation: patient.occupation || "",
          emergencyContactName: patient.emergencyContactName || "",
          emergencyContactNumber: patient.emergencyContactNumber || "",
          primaryPhysician: patient.primaryPhysician || "",
          insuranceProvider: patient.insuranceProvider || "",
          insurancePolicyNumber: patient.insurancePolicyNumber || "",
          allergies: patient.allergies || "",
          currentMedication: patient.currentMedication || "",
          familyMedicalHistory: patient.familyMedicalHistory || "",
          pastMedicalHistory: patient.pastMedicalHistory || "",
          identificationType: patient.identificationType || "",
          identificationNumber: patient.identificationNumber || "",
          privacyConsent: Boolean(patient.privacyConsent),
        })

        if (!hasLocalAvatar && patient.avatarUrl) {
          setAvatarPreview(patient.avatarUrl)
        }

        if (patient.identificationDocumentId) {
          setIdentificationFileName("Identification card on file")
        }
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load your profile details.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [])

  const fullName = useMemo(() => toDisplayName(form) || "Patient", [form])

  const doctorTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          availableDoctors
            .map((doctor) => getDoctorSpecialtyLabel(doctor).trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [availableDoctors]
  )

  const filteredDoctors = useMemo(() => {
    if (doctorTypeFilter === "all") {
      return availableDoctors
    }

    return availableDoctors.filter(
      (doctor) => normalizeDoctorMatchValue(getDoctorSpecialtyLabel(doctor)) === doctorTypeFilter
    )
  }, [availableDoctors, doctorTypeFilter])

  const savedPrimaryDoctorVisible = useMemo(
    () =>
      Boolean(
        form.primaryPhysician &&
          !filteredDoctors.some(
            (doctor) => normalizeDoctorMatchValue(getDoctorDisplayName(doctor)) === normalizeDoctorMatchValue(form.primaryPhysician)
          )
      ),
    [filteredDoctors, form.primaryPhysician]
  )

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handlePhoneChange = (value: string) => {
    setForm((current) => ({ ...current, phone: value }))

    if (!value || isE164PhoneNumber(value)) {
      setPhoneError("")
    }
  }

  const handlePhoneBlur = () => {
    if (form.phone && !isE164PhoneNumber(form.phone)) {
      setPhoneError("Phone must include a valid country code.")
      return
    }

    setPhoneError("")
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setAvatarFile(file)
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setAvatarPreview(previewUrl)
    }
  }

  const handleIdentificationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setIdentificationFile(file)
    setIdentificationFileName(file?.name || identificationFileName)
  }

  const handleSubmit = async () => {
    if (!userId) {
      setErrorMessage("Patient profile could not be updated because the account id is missing.")
      return
    }

    if (form.phone && !isE164PhoneNumber(form.phone)) {
      setPhoneError("Phone must include a valid country code.")
      setErrorMessage("Update the phone number before saving.")
      return
    }

    setIsSaving(true)
    setSaveMessage("")
    setErrorMessage("")
    setPhoneError("")

    try {
      const payload = new FormData()
      payload.append("userId", userId)
      payload.append("firstName", form.firstName)
      payload.append("lastName", form.lastName)
      payload.append("email", form.email)
      payload.append("phone", form.phone)
      payload.append("birthDate", form.birthDate)
      payload.append("gender", form.gender)
      payload.append("address", form.address)
      payload.append("occupation", form.occupation)
      payload.append("emergencyContactName", form.emergencyContactName)
      payload.append("emergencyContactNumber", form.emergencyContactNumber)
      payload.append("primaryPhysician", form.primaryPhysician)
      payload.append("insuranceProvider", form.insuranceProvider)
      payload.append("insurancePolicyNumber", form.insurancePolicyNumber)
      payload.append("allergies", form.allergies)
      payload.append("currentMedication", form.currentMedication)
      payload.append("familyMedicalHistory", form.familyMedicalHistory)
      payload.append("pastMedicalHistory", form.pastMedicalHistory)
      payload.append("identificationType", form.identificationType)
      payload.append("identificationNumber", form.identificationNumber)
      payload.append("privacyConsent", String(form.privacyConsent))

      if (avatarFile) {
        payload.append("avatar", avatarFile)
      }

      if (identificationFile) {
        payload.append("identificationDocument", identificationFile)
      }

      const updatedPatient = await updatePatientProfile(payload)

      const nextName = toDisplayName(form)
      if (nextName) {
        setStoredPatientName(userId, nextName)
      }

      if (updatedPatient?.avatarUrl) {
        setAvatarPreview(updatedPatient.avatarUrl)
      }

      if (avatarFile) {
        const localAvatarDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ""))
          reader.onerror = () => reject(new Error("Failed to read avatar file"))
          reader.readAsDataURL(avatarFile)
        })

        if (localAvatarDataUrl) {
          setAvatarPreview(localAvatarDataUrl)
          setStoredPatientAvatar(userId, localAvatarDataUrl)
        }
      }

      setSaveMessage("Profile updated successfully.")
    } catch (error) {
      console.error(error)
      setErrorMessage("Failed to save changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <PatientShell
        pageTitle="Profile"
        pageDescription="Review and update the information you entered during registration."
      >
      <main className="h-screen overflow-y-auto bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            Loading your profile details. Your saved information will appear in a moment.
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card className="bg-blue-50/80 dark:bg-blue-950/30">
              <CardHeader>
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-52" />
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <Skeleton className="size-24 rounded-full" />
                <div className="flex w-full flex-col items-center gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-11 w-full rounded-lg" />
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`profile-loading-field-${index}`} className="grid gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-6 w-52" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`contact-loading-field-${index}`} className="grid gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      </PatientShell>
    )
  }

  return (
    <PatientShell
      pageTitle="Profile"
      pageDescription="Review and update the information you entered during registration."
    >
    <main className="h-screen overflow-y-auto bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {(errorMessage || saveMessage) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              errorMessage
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
            }`}
          >
            {errorMessage || saveMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle>Patient Identity</CardTitle>
              <CardDescription>
                Manage your avatar and core account details.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <Avatar size="lg" className="size-24">
                <AvatarImage src={avatarPreview} alt="Patient avatar" />
                <AvatarFallback className="bg-blue-500 text-xl text-white">
                  {fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("") || "PT"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">{fullName}</p>
                <p className="text-sm text-muted-foreground">Editable patient profile</p>
              </div>
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white/70 px-4 py-3 text-sm transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-slate-900 dark:hover:bg-slate-800">
                <Upload className="size-4" />
                <span>Select avatar image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardDescription>Personal Details</CardDescription>
                <CardTitle>Edit your profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="firstName" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">First Name</label>
                  <Input id="firstName" name="firstName" value={form.firstName} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="lastName" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Last Name</label>
                  <Input id="lastName" name="lastName" value={form.lastName} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Email</label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="phone" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Phone</label>
                  <PhoneNumberInput
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    placeholder="Enter phone number"
                    invalid={Boolean(phoneError)}
                  />
                  {phoneError ? <p className="text-sm font-normal text-destructive">{phoneError}</p> : null}
                </div>
                <div className="grid gap-2">
                  <label htmlFor="birthDate" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Birth Date</label>
                  <Input id="birthDate" name="birthDate" type="date" value={form.birthDate} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <span className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Gender</span>
                  <RadioGroup
                    value={form.gender}
                    onValueChange={(value) => setForm((current) => ({ ...current, gender: value as Gender }))}
                    className="grid grid-cols-3 gap-3"
                  >
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                      <RadioGroupItem value="Male" />
                      <span>Male</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                      <RadioGroupItem value="Female" />
                      <span>Female</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                      <RadioGroupItem value="Other" />
                      <span>Other</span>
                    </label>
                  </RadioGroup>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="address" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Address</label>
                  <Textarea id="address" name="address" value={form.address} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="occupation" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Occupation</label>
                  <Input id="occupation" name="occupation" value={form.occupation} onChange={handleInputChange} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Emergency Contact and Care</CardDescription>
                <CardTitle>Important medical support info</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="emergencyContactName" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Emergency Contact Name</label>
                  <Input id="emergencyContactName" name="emergencyContactName" value={form.emergencyContactName} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="emergencyContactNumber" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Emergency Contact Number</label>
                  <Input id="emergencyContactNumber" name="emergencyContactNumber" value={form.emergencyContactNumber} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="doctorType" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Doctor Type</label>
                  <select
                    id="doctorType"
                    value={doctorTypeFilter}
                    onChange={(event) => setDoctorTypeFilter(event.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">Any type</option>
                    {doctorTypeOptions.map((doctorType) => (
                      <option key={doctorType} value={normalizeDoctorMatchValue(doctorType)}>
                        {doctorType}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="primaryPhysician" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Primary Physician</label>
                  <select
                    id="primaryPhysician"
                    name="primaryPhysician"
                    value={form.primaryPhysician}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, primaryPhysician: event.target.value }))
                    }
                    disabled={availableDoctors.length === 0}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {!form.primaryPhysician ? <option value="">Select a physician</option> : null}
                    {savedPrimaryDoctorVisible ? (
                      <option value={form.primaryPhysician}>{form.primaryPhysician} (saved)</option>
                    ) : null}
                    {filteredDoctors.map((doctor) => {
                      const doctorName = getDoctorDisplayName(doctor)
                      return (
                        <option key={doctor.$id} value={doctorName}>
                          {doctorName} - {getDoctorSpecialtyLabel(doctor)}
                        </option>
                      )
                    })}
                    {availableDoctors.length === 0 ? <option value="">No active doctors available</option> : null}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Filter doctors by specialty, then choose your registered primary physician.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Insurance and Medical History</CardDescription>
                <CardTitle>Keep your records up to date</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="insuranceProvider" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Insurance Provider</label>
                  <Input id="insuranceProvider" name="insuranceProvider" value={form.insuranceProvider} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="insurancePolicyNumber" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Insurance Policy Number</label>
                  <Input id="insurancePolicyNumber" name="insurancePolicyNumber" value={form.insurancePolicyNumber} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="allergies" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Allergies</label>
                  <Textarea id="allergies" name="allergies" value={form.allergies} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="currentMedication" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Current Medication</label>
                  <Textarea id="currentMedication" name="currentMedication" value={form.currentMedication} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="familyMedicalHistory" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Family Medical History</label>
                  <Textarea id="familyMedicalHistory" name="familyMedicalHistory" value={form.familyMedicalHistory} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="pastMedicalHistory" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Past Medical History</label>
                  <Textarea id="pastMedicalHistory" name="pastMedicalHistory" value={form.pastMedicalHistory} onChange={handleInputChange} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Identification</CardDescription>
                <CardTitle>Avatar and ID documents</CardTitle>
                <CardAction>
                  <IdCard className="size-6 text-blue-600" />
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="identificationType" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Identification Type</label>
                  <Input id="identificationType" name="identificationType" value={form.identificationType} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="identificationNumber" className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Identification Number</label>
                  <Input id="identificationNumber" name="identificationNumber" value={form.identificationNumber} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label className="text-[0.8rem] font-semibold tracking-[0.02em] text-slate-700 dark:text-slate-200">Identification Card</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                    <Upload className="size-4" />
                    <span>{identificationFileName || "Upload a new identification card"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleIdentificationChange} />
                  </label>
                </div>
                <label className="flex items-start gap-3 rounded-md border p-3 md:col-span-2">
                  <Checkbox
                    checked={form.privacyConsent}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, privacyConsent: checked === true }))
                    }
                  />
                  <span className="text-sm">
                    I agree to the processing of my personal and health data for care purposes.
                  </span>
                </label>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={isSaving} className="min-w-40">
                <Save className="mr-2 size-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
    </PatientShell>
  )
}
