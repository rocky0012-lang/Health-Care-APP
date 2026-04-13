"use server"

import {
    BUCKET_ID,
    DATABASE_ID,
    PATIENT_DIAGNOSIS_TABLE_ID,
    PATIENT_PRESCRIPTION_TABLE_ID,
    PATIENT_TABLE_ID,
    PATIENT_VITALS_TABLE_ID,
    storage,
    tablesDB,
    users,
} from "../appwrite.config"
import { ID, Permission, Query, Role } from "node-appwrite"
import { InputFile } from "node-appwrite/file"
import { parseStringify } from "../utils"
import type { PatientDiagnosis, PatientPrescription, PatientVital } from "../../types/appwrite.types"
import { getDoctorById } from "./doctor.action"

const PUBLIC_AVATAR_PERMISSIONS = [Permission.read(Role.any())]
const DEFAULT_PATIENT_ACCOUNT_STATUS: PatientAccountStatus = "active"
const MAX_PATIENT_ADMIN_NOTIFICATIONS = 20

type PatientStatusPrefs = {
    accountStatus?: PatientAccountStatus
    accountStatusMessage?: string
    accountStatusMessageUpdatedAt?: string
    adminNotifications?: PatientAdminNotification[]
    savedPaymentMethod?: PatientSavedPaymentMethod
    billingPreferences?: PatientBillingPreferences
}

const DEFAULT_PATIENT_BILLING_PREFERENCES: PatientBillingPreferences = {
    savePaymentMethod: true,
    emailReceipt: true,
    updatedAt: "",
}

function normalizePaymentMethodKind(value?: string): PaymentMethodKind {
    if (value === "mobile" || value === "bank") {
        return value
    }

    return "card"
}

function normalizePaymentCardBrand(value?: string): PaymentCardBrand {
    if (
        value === "visa" ||
        value === "mastercard" ||
        value === "amex" ||
        value === "discover" ||
        value === "verve"
    ) {
        return value
    }

    return "unknown"
}

function normalizePatientSavedPaymentMethod(value: unknown): PatientSavedPaymentMethod | undefined {
    if (!value || typeof value !== "object") {
        return undefined
    }

    const candidate = value as Partial<PatientSavedPaymentMethod>
    const nameOnAccount = typeof candidate.nameOnAccount === "string" ? candidate.nameOnAccount.trim() : ""
    const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : ""

    if (!nameOnAccount || !updatedAt) {
        return undefined
    }

    const last4 = typeof candidate.last4 === "string" ? candidate.last4.replace(/\D/g, "").slice(-4) : undefined
    const expiryMonth = typeof candidate.expiryMonth === "string" ? candidate.expiryMonth.replace(/\D/g, "").slice(0, 2) : undefined
    const expiryYear = typeof candidate.expiryYear === "string" ? candidate.expiryYear.replace(/\D/g, "").slice(0, 4) : undefined
    const referenceHint = typeof candidate.referenceHint === "string" ? candidate.referenceHint.trim() : undefined
    const notes = typeof candidate.notes === "string" ? candidate.notes.trim() : undefined

    return {
        method: normalizePaymentMethodKind(candidate.method),
        brand: normalizePaymentCardBrand(candidate.brand),
        nameOnAccount,
        last4: last4 || undefined,
        expiryMonth: expiryMonth || undefined,
        expiryYear: expiryYear || undefined,
        referenceHint: referenceHint || undefined,
        notes: notes || undefined,
        updatedAt,
    }
}

function normalizePatientBillingPreferences(value: unknown): PatientBillingPreferences {
    if (!value || typeof value !== "object") {
        return DEFAULT_PATIENT_BILLING_PREFERENCES
    }

    const candidate = value as Partial<PatientBillingPreferences>

    return {
        savePaymentMethod: candidate.savePaymentMethod !== false,
        emailReceipt: candidate.emailReceipt !== false,
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    }
}

function normalizePatientStatus(status?: string): PatientAccountStatus {
    if (status === "deactivated" || status === "suspended") {
        return status
    }

    return DEFAULT_PATIENT_ACCOUNT_STATUS
}

function normalizePatientStatusMessage(message?: string) {
    const trimmedMessage = message?.trim()
    return trimmedMessage ? trimmedMessage : undefined
}

function normalizePatientNotificationTone(tone?: string): DoctorNotificationTone {
    if (tone === "warning" || tone === "success") {
        return tone
    }

    return "default"
}

function normalizePatientNotifications(notifications: unknown): PatientAdminNotification[] {
    if (!Array.isArray(notifications)) {
        return []
    }

    const normalized: PatientAdminNotification[] = []

    for (const notification of notifications) {
        if (!notification || typeof notification !== "object") {
            continue
        }

        const candidate = notification as Partial<PatientAdminNotification>
        const title = typeof candidate.title === "string" ? candidate.title.trim() : ""
        const message = typeof candidate.message === "string" ? candidate.message.trim() : ""
        const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : ""
        const readAt = typeof candidate.readAt === "string" && candidate.readAt.trim() ? candidate.readAt : undefined

        if (!title || !message || !createdAt) {
            continue
        }

        normalized.push({
            id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : ID.unique(),
            title,
            message,
            tone: normalizePatientNotificationTone(candidate.tone),
            createdAt,
            readAt,
            kind:
                candidate.kind === "status" ||
                candidate.kind === "emergency-message" ||
                candidate.kind === "broadcast" ||
                candidate.kind === "doctor-message" ||
                candidate.kind === "appointment-update"
                    ? candidate.kind
                    : "admin-message",
            status:
                candidate.status === "active" ||
                candidate.status === "deactivated" ||
                candidate.status === "suspended"
                    ? candidate.status
                    : undefined,
        })
    }

    return normalized
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .slice(0, MAX_PATIENT_ADMIN_NOTIFICATIONS)
}

function buildPatientNotification({
    title,
    message,
    tone,
    kind,
    status,
}: {
    title: string
    message: string
    tone: DoctorNotificationTone
    kind: PatientNotificationKind
    status?: PatientAccountStatus
}): PatientAdminNotification {
    return {
        id: ID.unique(),
        title: title.trim(),
        message: message.trim(),
        tone,
        createdAt: new Date().toISOString(),
        readAt: undefined,
        kind,
        status,
    }
}

async function getPatientPrefsRecord(userId: string) {
    return users
        .getPrefs<Record<string, any>>({ userId })
        .catch(() => ({} as Record<string, any>))
}

async function updatePatientNotifications(
    userId: string,
    updater: (notifications: PatientAdminNotification[]) => PatientAdminNotification[]
) {
    if (!userId) {
        throw new Error("Missing patient userId for notification update.")
    }

    const existingPrefs = await getPatientPrefsRecord(userId)
    const normalizedNotifications = normalizePatientNotifications(existingPrefs.adminNotifications)
    const nextNotifications = updater(normalizedNotifications)

    await users.updatePrefs({
        userId,
        prefs: {
            ...existingPrefs,
            adminNotifications: nextNotifications,
        },
    })

    return parseStringify(nextNotifications)
}

function assertPatientStatusMessage(status: PatientAccountStatus, message?: string) {
    if (normalizePatientStatus(status) !== "active" && !normalizePatientStatusMessage(message)) {
        throw new Error("Please provide a reason for suspending or deactivating this patient.")
    }
}

function normalizeOptionalString(value?: string) {
    const trimmedValue = value?.trim()
    return trimmedValue ? trimmedValue : undefined
}

function normalizeOptionalNumber(value?: number | string) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined
    }

    if (typeof value === "string") {
        const trimmedValue = value.trim()
        if (!trimmedValue) {
            return undefined
        }

        const parsedValue = Number(trimmedValue)
        return Number.isFinite(parsedValue) ? parsedValue : undefined
    }

    return undefined
}

function normalizeIsoDateString(value?: string) {
    if (!value) {
        return new Date().toISOString()
    }

    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Invalid clinical record date.")
    }

    return parsedDate.toISOString()
}

function assertClinicalTableConfig(tableId?: string, label?: string) {
    if (!DATABASE_ID || !tableId) {
        throw new Error(`Missing DATABASE_ID or ${label || "clinical table"} in environment`)
    }
}

function normalizePatientDiagnosisStatus(value?: string): PatientDiagnosisStatus {
    if (value === "resolved" || value === "chronic") {
        return value
    }

    return "active"
}

function normalizePatientPrescriptionStatus(value?: string): PatientPrescriptionStatus {
    if (value === "completed" || value === "stopped") {
        return value
    }

    return "active"
}

function serializePatientVital<T extends Record<string, any>>(vital: T | null): PatientVital | null {
    if (!vital) {
        return null
    }

    return parseStringify({
        ...vital,
        bloodPressureSystolic:
            typeof vital.bloodPressureSystolic === "number" ? vital.bloodPressureSystolic : undefined,
        bloodPressureDiastolic:
            typeof vital.bloodPressureDiastolic === "number" ? vital.bloodPressureDiastolic : undefined,
        heartRate: typeof vital.heartRate === "number" ? vital.heartRate : undefined,
        respiratoryRate: typeof vital.respiratoryRate === "number" ? vital.respiratoryRate : undefined,
        oxygenSaturation: typeof vital.oxygenSaturation === "number" ? vital.oxygenSaturation : undefined,
        temperatureCelsius:
            typeof vital.temperatureCelsius === "number" ? vital.temperatureCelsius : undefined,
        weightKg: typeof vital.weightKg === "number" ? vital.weightKg : undefined,
        heightCm: typeof vital.heightCm === "number" ? vital.heightCm : undefined,
        notes: typeof vital.notes === "string" ? vital.notes : undefined,
    }) as unknown as PatientVital
}

function serializePatientDiagnosis<T extends Record<string, any>>(diagnosis: T | null): PatientDiagnosis | null {
    if (!diagnosis) {
        return null
    }

    return parseStringify({
        ...diagnosis,
        status: normalizePatientDiagnosisStatus(typeof diagnosis.status === "string" ? diagnosis.status : undefined),
        notes: typeof diagnosis.notes === "string" ? diagnosis.notes : undefined,
    }) as unknown as PatientDiagnosis
}

function serializePatientPrescription<T extends Record<string, any>>(prescription: T | null): PatientPrescription | null {
    if (!prescription) {
        return null
    }

    return parseStringify({
        ...prescription,
        status: normalizePatientPrescriptionStatus(typeof prescription.status === "string" ? prescription.status : undefined),
        instructions: typeof prescription.instructions === "string" ? prescription.instructions : undefined,
        duration: typeof prescription.duration === "string" ? prescription.duration : undefined,
    }) as unknown as PatientPrescription
}

async function withClinicalDoctorDetails<T extends Record<string, any>>(record: T | null) {
    if (!record) {
        return null
    }

    const doctorId = typeof record.doctorId === "string" ? record.doctorId.trim() : ""
    if (!doctorId) {
        return {
            ...record,
            doctorDetails: null,
        }
    }

    try {
        const doctor = await getDoctorById(doctorId)

        return {
            ...record,
            doctorDetails: doctor
                ? {
                    id: doctor.$id,
                    fullName: doctor.name || doctor.fullName,
                    avatarUrl: doctor.avatarUrl || "",
                    specialty: doctor.specialization || doctor.specialty || "",
                }
                : null,
        }
    } catch (error) {
        console.error("withClinicalDoctorDetails error:", error)
        return {
            ...record,
            doctorDetails: null,
        }
    }
}

function buildBucketFileUrl(fileId?: string) {
    if (!fileId || !BUCKET_ID || !process.env.NEXT_PUBLIC_ENDPOINT || !process.env.PROJECT_ID) {
        return ""
    }

    const endpoint = process.env.NEXT_PUBLIC_ENDPOINT.replace(/\/$/, "")
    const query = new URLSearchParams({
        project: process.env.PROJECT_ID,
    })

    return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?${query.toString()}`
}

async function uploadBucketFile(file: File, permissions?: string[]) {
    if (!BUCKET_ID) {
        throw new Error("Missing NEXT_PUBLIC_BUCKET_ID in environment")
    }

    const uploaded = await storage.createFile({
        bucketId: BUCKET_ID,
        fileId: ID.unique(),
        file: InputFile.fromBuffer(
            Buffer.from(await file.arrayBuffer()),
            file.name
        ),
        permissions,
    })

    return uploaded.$id
}

async function ensureStoredPatientFileIsReadable(fileId?: string, label = "patient file") {
    if (!BUCKET_ID || !fileId) {
        return false
    }

    try {
        await storage.updateFile({
            bucketId: BUCKET_ID,
            fileId,
            permissions: PUBLIC_AVATAR_PERMISSIONS,
        })

        return true
    } catch (error) {
        const appwriteError = error as {
            code?: number
            message?: string
            type?: string
        }

        const isMissingFile =
            appwriteError?.code === 404 ||
            appwriteError?.type === "storage_file_not_found" ||
            appwriteError?.message?.toLowerCase().includes("requested file could not be found")

        if (isMissingFile) {
            console.warn(`${label} is missing. Falling back to no file.`, { fileId })
            return false
        }

        throw error
    }
}

function serializePatient<T extends Record<string, any>>(patient: T | null): (T & {
    avatarUrl: string
    identificationDocumentUrl: string
    accountStatus: PatientAccountStatus
    accountStatusMessage?: string
    accountStatusMessageUpdatedAt?: string
    adminNotifications: PatientAdminNotification[]
    savedPaymentMethod?: PatientSavedPaymentMethod
    billingPreferences: PatientBillingPreferences
}) | null {
    if (!patient) {
        return null
    }

    const accountStatus = normalizePatientStatus(patient.accountStatus)

    return parseStringify({
        ...patient,
        avatarUrl: buildBucketFileUrl(patient.avatarId),
        identificationDocumentUrl: buildBucketFileUrl(patient.identificationDocumentId),
        accountStatus,
        accountStatusMessage: normalizePatientStatusMessage(patient.accountStatusMessage),
        accountStatusMessageUpdatedAt:
            typeof patient.accountStatusMessageUpdatedAt === "string"
                ? patient.accountStatusMessageUpdatedAt
                : undefined,
        adminNotifications: normalizePatientNotifications(patient.adminNotifications),
        savedPaymentMethod: normalizePatientSavedPaymentMethod(patient.savedPaymentMethod),
        billingPreferences: normalizePatientBillingPreferences(patient.billingPreferences),
    })
}

async function getPatientStatusPrefs(userId: string): Promise<PatientStatusPrefs> {
    if (!userId) {
        return {}
    }

    try {
        const prefs = await users.getPrefs<PatientStatusPrefs>({ userId })

        return {
            accountStatus: normalizePatientStatus(prefs?.accountStatus),
            accountStatusMessage: normalizePatientStatusMessage(prefs?.accountStatusMessage),
            accountStatusMessageUpdatedAt:
                typeof prefs?.accountStatusMessageUpdatedAt === "string"
                    ? prefs.accountStatusMessageUpdatedAt
                    : undefined,
            adminNotifications: normalizePatientNotifications(prefs?.adminNotifications),
            savedPaymentMethod: normalizePatientSavedPaymentMethod(prefs?.savedPaymentMethod),
            billingPreferences: normalizePatientBillingPreferences(prefs?.billingPreferences),
        }
    } catch (error) {
        console.error("getPatientStatusPrefs error:", error)
        return {}
    }
}

async function withPatientStatus<T extends Record<string, any>>(patient: T | null) {
    if (!patient) {
        return null
    }

    const statusPrefs = await getPatientStatusPrefs(patient.userId)
    const accountStatus = normalizePatientStatus(statusPrefs.accountStatus)

    return {
        ...patient,
        accountStatus,
        accountStatusMessage: statusPrefs.accountStatusMessage,
        accountStatusMessageUpdatedAt: statusPrefs.accountStatusMessageUpdatedAt,
        adminNotifications: statusPrefs.adminNotifications || [],
        savedPaymentMethod: statusPrefs.savedPaymentMethod,
        billingPreferences: statusPrefs.billingPreferences || DEFAULT_PATIENT_BILLING_PREFERENCES,
    }
}

async function updatePatientStatusPrefs(
    userId: string,
    status: PatientAccountStatus,
    message?: string
) {
    if (!userId) {
        return
    }

    assertPatientStatusMessage(status, message)

    const existingPrefs = await getPatientPrefsRecord(userId)
    const normalizedMessage = normalizePatientStatusMessage(message)
    const normalizedNotifications = normalizePatientNotifications(existingPrefs.adminNotifications)

    const nextNotifications = normalizedMessage
        ? [
            buildPatientNotification({
                title:
                    status === "suspended"
                        ? "Account suspended"
                        : status === "deactivated"
                            ? "Account deactivated"
                            : "Account active",
                message: normalizedMessage,
                tone: status === "active" ? "success" : "warning",
                kind: "status",
                status,
            }),
            ...normalizedNotifications,
        ].slice(0, MAX_PATIENT_ADMIN_NOTIFICATIONS)
        : normalizedNotifications

    await users.updatePrefs({
        userId,
        prefs: {
            ...existingPrefs,
            accountStatus: normalizePatientStatus(status),
            accountStatusMessage: normalizedMessage || "",
            accountStatusMessageUpdatedAt: normalizedMessage ? new Date().toISOString() : "",
            adminNotifications: nextNotifications,
        },
    })
}


export const createUser = async (user: CreateUserParams) => {
 try {
    const newUser = await users.create(
        {
          userId: ID.unique(),
          email: user.email,
          phone: user.phone,
          name: user.name,
        }
    )

    console.log("User created successfully:", newUser)
    return parseStringify(newUser)
 } catch (error: any) {
    if (error?.code === 409) {
        throw new Error("An account with this email already exists. Please log in instead.")
    }

    console.error("createUser error:", error)
    throw error
 }
}

export const getPatientLoginRecord = async ({
    email,
    phone,
}: {
    email: string
    phone?: string
}) => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone?.trim()

    if (!normalizedEmail) {
        return null
    }

    try {
        const existingUsers = await users.list({
            queries: [Query.equal("email", [normalizedEmail]), Query.limit(1)],
        })

        const user = existingUsers?.users?.[0]
        if (!user) {
            return null
        }

        if (normalizedPhone && user.phone && user.phone !== normalizedPhone) {
            return null
        }

        const patient = await getPatientByUserId(user.$id)

        return parseStringify({
            userId: user.$id,
            email: user.email,
            phone: user.phone || "",
            name: patient?.name || user.name || "Patient",
            hasProfile: Boolean(patient),
        })
    } catch (error) {
        console.error("getPatientLoginRecord error:", error)
        throw error
    }
}

export const registerPatient = async (formData: FormData) => {
    try {
        const userId = String(formData.get("userId") || "")
        const firstName = String(formData.get("firstName") || "")
        const lastName = String(formData.get("lastName") || "")
        const email = String(formData.get("email") || "")
        const phone = String(formData.get("phone") || "")
        const birthDate = String(formData.get("birthDate") || "")
        const gender = String(formData.get("gender") || "").toLowerCase() as Gender
        const address = String(formData.get("address") || "")
        const occupation = String(formData.get("occupation") || "")
        const emergencyContactName = String(formData.get("emergencyContactName") || "")
        const emergencyContactNumber = String(formData.get("emergencyContactNumber") || "")
        const primaryPhysician = String(formData.get("primaryPhysician") || "")
        const insuranceProvider = String(formData.get("insuranceProvider") || "")
        const insurancePolicyNumber = String(formData.get("insurancePolicyNumber") || "")
        const allergies = String(formData.get("allergies") || "") || undefined
        const currentMedication = String(formData.get("currentMedication") || "") || undefined
        const familyMedicalHistory = String(formData.get("familyMedicalHistory") || "") || undefined
        const pastMedicalHistory = String(formData.get("pastMedicalHistory") || "") || undefined
        const identificationType = String(formData.get("identificationType") || "") || undefined
        const identificationNumber = String(formData.get("identificationNumber") || "") || undefined
        const privacyConsent = String(formData.get("privacyConsent") || "false") === "true"
        const fullName = `${firstName} ${lastName}`.trim()
        const parsedBirthDate = new Date(birthDate)

        if (Number.isNaN(parsedBirthDate.getTime())) {
            throw new Error("Invalid birthDate value")
        }

        if (!DATABASE_ID || !PATIENT_TABLE_ID) {
            throw new Error("Missing DATABASE_ID or PATIENT_TABLE_ID in environment")
        }

        let identificationDocument: string | undefined
        let avatarId: string | undefined
        const avatarFile = formData.get("avatar") as File | null
        const identificationFile = formData.get("identificationDocument") as File | null

        if (avatarFile && avatarFile.size > 0) {
            avatarId = await uploadBucketFile(avatarFile, PUBLIC_AVATAR_PERMISSIONS)
        }

        if (identificationFile && identificationFile.size > 0) {
            identificationDocument = await uploadBucketFile(identificationFile)
        }

        const patient = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: PATIENT_TABLE_ID,
            rowId: ID.unique(),
            data: {
                userId,
                name: fullName,
                email,
                phone,
                birthDate: parsedBirthDate.toISOString(),
                gender,
                address,
                occupation,
                emergencyContactName,
                emergencyContactNumber,
                primaryPhysician,
                insuranceProvider,
                insurancePolicyNumber,
                allergies,
                currentMedication,
                familyMedicalHistory,
                pastMedicalHistory,
                avatarId,
                identificationType,
                identificationNumber,
                identificationDocumentId: identificationDocument,
                privacyConsent: privacyConsent,
            },
        })

        return serializePatient(patient)
    } catch (error: unknown) {
        if (error && typeof error === "object") {
            const appwriteError = error as {
                message?: string
                code?: number
                type?: string
                response?: unknown
            }

            console.error("registerPatient error:", {
                message: appwriteError.message,
                code: appwriteError.code,
                type: appwriteError.type,
                response: appwriteError.response,
            })
        } else {
            console.error("registerPatient error:", error)
        }

        throw error
    }
}

export const getPatientByUserId = async (userId: string) => {
    try {
        if (!DATABASE_ID || !PATIENT_TABLE_ID) {
            throw new Error("Missing DATABASE_ID or PATIENT_TABLE_ID in environment")
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_TABLE_ID,
            queries: [Query.equal("userId", [userId])],
        })

        const patient = response.rows?.[0]

        if (!patient) {
            return null
        }

        if (patient.avatarId) {
            const hasReadableAvatar = await ensureStoredPatientFileIsReadable(patient.avatarId, "Patient avatar file")
            if (!hasReadableAvatar) {
                patient.avatarId = undefined
            }
        }

        if (patient.identificationDocumentId) {
            const hasReadableIdentificationDocument = await ensureStoredPatientFileIsReadable(
                patient.identificationDocumentId,
                "Patient identification document"
            )

            if (!hasReadableIdentificationDocument) {
                patient.identificationDocumentId = undefined
            }
        }

        return serializePatient(await withPatientStatus(patient))
    } catch (error) {
        console.error("getPatientByUserId error:", error)
        throw error
    }
}

export const getPatientById = async (patientId: string) => {
    try {
        if (!DATABASE_ID || !PATIENT_TABLE_ID) {
            throw new Error("Missing DATABASE_ID or PATIENT_TABLE_ID in environment")
        }

        if (!patientId) {
            return null
        }

        const patient = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: PATIENT_TABLE_ID,
            rowId: patientId,
        })

        if (!patient) {
            return null
        }

        if (patient.avatarId) {
            const hasReadableAvatar = await ensureStoredPatientFileIsReadable(patient.avatarId, "Patient avatar file")
            if (!hasReadableAvatar) {
                patient.avatarId = undefined
            }
        }

        if (patient.identificationDocumentId) {
            const hasReadableIdentificationDocument = await ensureStoredPatientFileIsReadable(
                patient.identificationDocumentId,
                "Patient identification document"
            )

            if (!hasReadableIdentificationDocument) {
                patient.identificationDocumentId = undefined
            }
        }

        return serializePatient(await withPatientStatus(patient))
    } catch (error) {
        console.error("getPatientById error:", error)
        throw error
    }
}

export const updatePatientProfile = async (formData: FormData) => {
    try {
        const userId = String(formData.get("userId") || "")
        const firstName = String(formData.get("firstName") || "")
        const lastName = String(formData.get("lastName") || "")
        const email = String(formData.get("email") || "")
        const phone = String(formData.get("phone") || "")
        const birthDate = String(formData.get("birthDate") || "")
        const gender = String(formData.get("gender") || "").toLowerCase() as Gender
        const address = String(formData.get("address") || "")
        const occupation = String(formData.get("occupation") || "")
        const emergencyContactName = String(formData.get("emergencyContactName") || "")
        const emergencyContactNumber = String(formData.get("emergencyContactNumber") || "")
        const primaryPhysician = String(formData.get("primaryPhysician") || "")
        const insuranceProvider = String(formData.get("insuranceProvider") || "")
        const insurancePolicyNumber = String(formData.get("insurancePolicyNumber") || "")
        const allergies = String(formData.get("allergies") || "") || undefined
        const currentMedication = String(formData.get("currentMedication") || "") || undefined
        const familyMedicalHistory = String(formData.get("familyMedicalHistory") || "") || undefined
        const pastMedicalHistory = String(formData.get("pastMedicalHistory") || "") || undefined
        const identificationType = String(formData.get("identificationType") || "") || undefined
        const identificationNumber = String(formData.get("identificationNumber") || "") || undefined
        const privacyConsent = String(formData.get("privacyConsent") || "false") === "true"

        if (!userId) {
            throw new Error("Missing userId for patient update")
        }

        const existingPatient = await getPatientByUserId(userId)

        if (!existingPatient) {
            throw new Error("Patient record not found")
        }

        const fullName = `${firstName} ${lastName}`.trim()
        const parsedBirthDate = new Date(birthDate)

        if (Number.isNaN(parsedBirthDate.getTime())) {
            throw new Error("Invalid birthDate value")
        }

        let avatarId = existingPatient.avatarId
        let identificationDocumentId = existingPatient.identificationDocumentId
        const avatarFile = formData.get("avatar") as File | null
        const identificationFile = formData.get("identificationDocument") as File | null

        if (avatarFile && avatarFile.size > 0) {
            avatarId = await uploadBucketFile(avatarFile, PUBLIC_AVATAR_PERMISSIONS)
        }

        if (identificationFile && identificationFile.size > 0) {
            identificationDocumentId = await uploadBucketFile(identificationFile)
        }

        const updatedPatient = await tablesDB.updateRow({
            databaseId: DATABASE_ID!,
            tableId: PATIENT_TABLE_ID!,
            rowId: existingPatient.$id,
            data: {
                userId,
                name: fullName,
                email,
                phone,
                birthDate: parsedBirthDate.toISOString(),
                gender,
                address,
                occupation,
                emergencyContactName,
                emergencyContactNumber,
                primaryPhysician,
                insuranceProvider,
                insurancePolicyNumber,
                allergies,
                currentMedication,
                familyMedicalHistory,
                pastMedicalHistory,
                avatarId,
                identificationType,
                identificationNumber,
                identificationDocumentId,
                privacyConsent,
            },
        })

        return serializePatient(await withPatientStatus(updatedPatient))
    } catch (error) {
        console.error("updatePatientProfile error:", error)
        throw error
    }
}

export const listPatients = async (limit = 200) => {
    try {
        if (!DATABASE_ID || !PATIENT_TABLE_ID) {
            throw new Error("Missing DATABASE_ID or PATIENT_TABLE_ID in environment")
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_TABLE_ID,
            queries: [Query.orderDesc("$createdAt"), Query.limit(limit)],
        })

        const patientsWithStatus = await Promise.all(response.rows.map((patient) => withPatientStatus(patient)))

        return patientsWithStatus
            .map((patient) => serializePatient(patient))
            .filter((patient): patient is NonNullable<typeof patient> => Boolean(patient))
    } catch (error) {
        console.error("listPatients error:", error)
        throw error
    }
}

export const listPatientVitals = async (patientUserId: string, limit = 20) => {
    try {
        if (!DATABASE_ID || !PATIENT_VITALS_TABLE_ID || !patientUserId) {
            return []
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_VITALS_TABLE_ID,
            queries: [Query.equal("patientUserId", [patientUserId]), Query.orderDesc("recordedAt"), Query.limit(limit)],
        })

        const vitalsWithDoctorDetails = await Promise.all(response.rows.map((vital) => withClinicalDoctorDetails(vital)))

        return vitalsWithDoctorDetails
            .map((vital) => serializePatientVital(vital))
            .filter((vital): vital is NonNullable<typeof vital> => Boolean(vital))
    } catch (error) {
        console.error("listPatientVitals error:", error)
        return []
    }
}

export const listAppointmentVitals = async (appointmentId: string, limit = 20) => {
    try {
        if (!DATABASE_ID || !PATIENT_VITALS_TABLE_ID || !appointmentId) {
            return []
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_VITALS_TABLE_ID,
            queries: [Query.equal("appointmentId", [appointmentId]), Query.orderDesc("recordedAt"), Query.limit(limit)],
        })

        const vitalsWithDoctorDetails = await Promise.all(response.rows.map((vital) => withClinicalDoctorDetails(vital)))

        return vitalsWithDoctorDetails
            .map((vital) => serializePatientVital(vital))
            .filter((vital): vital is NonNullable<typeof vital> => Boolean(vital))
    } catch (error) {
        console.error("listAppointmentVitals error:", error)
        return []
    }
}

export const listPatientDiagnoses = async (patientUserId: string, limit = 20) => {
    try {
        if (!DATABASE_ID || !PATIENT_DIAGNOSIS_TABLE_ID || !patientUserId) {
            return []
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_DIAGNOSIS_TABLE_ID,
            queries: [Query.equal("patientUserId", [patientUserId]), Query.orderDesc("diagnosedAt"), Query.limit(limit)],
        })

        const diagnosesWithDoctorDetails = await Promise.all(response.rows.map((diagnosis) => withClinicalDoctorDetails(diagnosis)))

        return diagnosesWithDoctorDetails
            .map((diagnosis) => serializePatientDiagnosis(diagnosis))
            .filter((diagnosis): diagnosis is NonNullable<typeof diagnosis> => Boolean(diagnosis))
    } catch (error) {
        console.error("listPatientDiagnoses error:", error)
        return []
    }
}

export const listAppointmentDiagnoses = async (appointmentId: string, limit = 20) => {
    try {
        if (!DATABASE_ID || !PATIENT_DIAGNOSIS_TABLE_ID || !appointmentId) {
            return []
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_DIAGNOSIS_TABLE_ID,
            queries: [Query.equal("appointmentId", [appointmentId]), Query.orderDesc("diagnosedAt"), Query.limit(limit)],
        })

        const diagnosesWithDoctorDetails = await Promise.all(response.rows.map((diagnosis) => withClinicalDoctorDetails(diagnosis)))

        return diagnosesWithDoctorDetails
            .map((diagnosis) => serializePatientDiagnosis(diagnosis))
            .filter((diagnosis): diagnosis is NonNullable<typeof diagnosis> => Boolean(diagnosis))
    } catch (error) {
        console.error("listAppointmentDiagnoses error:", error)
        return []
    }
}

export const listPatientPrescriptions = async (patientUserId: string, limit = 20) => {
    try {
        if (!DATABASE_ID || !PATIENT_PRESCRIPTION_TABLE_ID || !patientUserId) {
            return []
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_PRESCRIPTION_TABLE_ID,
            queries: [Query.equal("patientUserId", [patientUserId]), Query.orderDesc("prescribedAt"), Query.limit(limit)],
        })

        const prescriptionsWithDoctorDetails = await Promise.all(response.rows.map((prescription) => withClinicalDoctorDetails(prescription)))

        return prescriptionsWithDoctorDetails
            .map((prescription) => serializePatientPrescription(prescription))
            .filter((prescription): prescription is NonNullable<typeof prescription> => Boolean(prescription))
    } catch (error) {
        console.error("listPatientPrescriptions error:", error)
        return []
    }
}

export const listAppointmentPrescriptions = async (appointmentId: string, limit = 20) => {
    try {
        if (!DATABASE_ID || !PATIENT_PRESCRIPTION_TABLE_ID || !appointmentId) {
            return []
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PATIENT_PRESCRIPTION_TABLE_ID,
            queries: [Query.equal("appointmentId", [appointmentId]), Query.orderDesc("prescribedAt"), Query.limit(limit)],
        })

        const prescriptionsWithDoctorDetails = await Promise.all(response.rows.map((prescription) => withClinicalDoctorDetails(prescription)))

        return prescriptionsWithDoctorDetails
            .map((prescription) => serializePatientPrescription(prescription))
            .filter((prescription): prescription is NonNullable<typeof prescription> => Boolean(prescription))
    } catch (error) {
        console.error("listAppointmentPrescriptions error:", error)
        return []
    }
}

export const createPatientVital = async ({
    patientId,
    patientUserId,
    appointmentId,
    doctorId,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    heartRate,
    respiratoryRate,
    oxygenSaturation,
    notes,
    recordedAt,
    temperatureCelsius,
    weightKg,
    heightCm,
}: {
    patientId: string
    patientUserId: string
    appointmentId?: string
    doctorId?: string
    bloodPressureSystolic?: number | string
    bloodPressureDiastolic?: number | string
    heartRate?: number | string
    respiratoryRate?: number | string
    oxygenSaturation?: number | string
    notes?: string
    recordedAt?: string
    temperatureCelsius?: number | string
    weightKg?: number | string
    heightCm?: number | string
}) => {
    assertClinicalTableConfig(PATIENT_VITALS_TABLE_ID, "PATIENT_VITALS_TABLE_ID")

    const normalizedPatientId = patientId.trim()
    const normalizedPatientUserId = patientUserId.trim()

    if (!normalizedPatientId || !normalizedPatientUserId) {
        throw new Error("Missing patient context for vitals entry.")
    }

    const record = await tablesDB.createRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_VITALS_TABLE_ID!,
        rowId: ID.unique(),
        data: {
            patientId: normalizedPatientId,
            patientUserId: normalizedPatientUserId,
            appointmentId: normalizeOptionalString(appointmentId),
            doctorId: normalizeOptionalString(doctorId),
            bloodPressureSystolic: normalizeOptionalNumber(bloodPressureSystolic),
            bloodPressureDiastolic: normalizeOptionalNumber(bloodPressureDiastolic),
            heartRate: normalizeOptionalNumber(heartRate),
            respiratoryRate: normalizeOptionalNumber(respiratoryRate),
            oxygenSaturation: normalizeOptionalNumber(oxygenSaturation),
            notes: normalizeOptionalString(notes),
            recordedAt: normalizeIsoDateString(recordedAt),
            temperatureCelsius: normalizeOptionalNumber(temperatureCelsius),
            weightKg: normalizeOptionalNumber(weightKg),
            heightCm: normalizeOptionalNumber(heightCm),
        },
    })

    return serializePatientVital(await withClinicalDoctorDetails(record))
}

export const updatePatientVital = async ({
    vitalId,
    doctorId,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    heartRate,
    respiratoryRate,
    oxygenSaturation,
    notes,
    recordedAt,
    temperatureCelsius,
    weightKg,
    heightCm,
}: {
    vitalId: string
    doctorId?: string
    bloodPressureSystolic?: number | string
    bloodPressureDiastolic?: number | string
    heartRate?: number | string
    respiratoryRate?: number | string
    oxygenSaturation?: number | string
    notes?: string
    recordedAt?: string
    temperatureCelsius?: number | string
    weightKg?: number | string
    heightCm?: number | string
}) => {
    assertClinicalTableConfig(PATIENT_VITALS_TABLE_ID, "PATIENT_VITALS_TABLE_ID")

    if (!vitalId.trim()) {
        throw new Error("Missing vitals record id.")
    }

    const existingRecord = await tablesDB.getRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_VITALS_TABLE_ID!,
        rowId: vitalId,
    })

    if (doctorId && existingRecord.doctorId && existingRecord.doctorId !== doctorId.trim()) {
        throw new Error("You cannot edit vitals recorded by another doctor.")
    }

    const updatedRecord = await tablesDB.updateRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_VITALS_TABLE_ID!,
        rowId: vitalId,
        data: {
            bloodPressureSystolic: normalizeOptionalNumber(bloodPressureSystolic),
            bloodPressureDiastolic: normalizeOptionalNumber(bloodPressureDiastolic),
            heartRate: normalizeOptionalNumber(heartRate),
            respiratoryRate: normalizeOptionalNumber(respiratoryRate),
            oxygenSaturation: normalizeOptionalNumber(oxygenSaturation),
            notes: normalizeOptionalString(notes),
            recordedAt: normalizeIsoDateString(recordedAt || existingRecord.recordedAt),
            temperatureCelsius: normalizeOptionalNumber(temperatureCelsius),
            weightKg: normalizeOptionalNumber(weightKg),
            heightCm: normalizeOptionalNumber(heightCm),
        },
    })

    return serializePatientVital(await withClinicalDoctorDetails(updatedRecord))
}

export const deletePatientVital = async ({ vitalId, doctorId }: { vitalId: string; doctorId?: string }) => {
    assertClinicalTableConfig(PATIENT_VITALS_TABLE_ID, "PATIENT_VITALS_TABLE_ID")

    if (!vitalId.trim()) {
        throw new Error("Missing vitals record id.")
    }

    const existingRecord = await tablesDB.getRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_VITALS_TABLE_ID!,
        rowId: vitalId,
    })

    if (doctorId && existingRecord.doctorId && existingRecord.doctorId !== doctorId.trim()) {
        throw new Error("You cannot delete vitals recorded by another doctor.")
    }

    await tablesDB.deleteRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_VITALS_TABLE_ID!,
        rowId: vitalId,
    })

    return { success: true }
}

export const createPatientDiagnosis = async ({
    patientId,
    patientUserId,
    doctorId,
    diagnosisName,
    status,
    diagnosedAt,
    appointmentId,
    notes,
}: {
    patientId: string
    patientUserId: string
    doctorId: string
    diagnosisName: string
    status: PatientDiagnosisStatus
    diagnosedAt?: string
    appointmentId?: string
    notes?: string
}) => {
    assertClinicalTableConfig(PATIENT_DIAGNOSIS_TABLE_ID, "PATIENT_DIAGNOSIS_TABLE_ID")

    const normalizedPatientId = patientId.trim()
    const normalizedPatientUserId = patientUserId.trim()
    const normalizedDoctorId = doctorId.trim()
    const normalizedDiagnosisName = diagnosisName.trim()

    if (!normalizedPatientId || !normalizedPatientUserId || !normalizedDoctorId || !normalizedDiagnosisName) {
        throw new Error("Missing required diagnosis details.")
    }

    const record = await tablesDB.createRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_DIAGNOSIS_TABLE_ID!,
        rowId: ID.unique(),
        data: {
            patientId: normalizedPatientId,
            patientUserId: normalizedPatientUserId,
            doctorId: normalizedDoctorId,
            diagnosisName: normalizedDiagnosisName,
            status: normalizePatientDiagnosisStatus(status),
            diagnosedAt: normalizeIsoDateString(diagnosedAt),
            appointmentId: normalizeOptionalString(appointmentId),
            notes: normalizeOptionalString(notes),
        },
    })

    return serializePatientDiagnosis(await withClinicalDoctorDetails(record))
}

export const updatePatientDiagnosis = async ({
    diagnosisId,
    doctorId,
    diagnosisName,
    status,
    diagnosedAt,
    notes,
}: {
    diagnosisId: string
    doctorId?: string
    diagnosisName: string
    status: PatientDiagnosisStatus
    diagnosedAt?: string
    notes?: string
}) => {
    assertClinicalTableConfig(PATIENT_DIAGNOSIS_TABLE_ID, "PATIENT_DIAGNOSIS_TABLE_ID")

    const normalizedDiagnosisId = diagnosisId.trim()
    const normalizedDiagnosisName = diagnosisName.trim()

    if (!normalizedDiagnosisId || !normalizedDiagnosisName) {
        throw new Error("Missing diagnosis details.")
    }

    const existingRecord = await tablesDB.getRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_DIAGNOSIS_TABLE_ID!,
        rowId: normalizedDiagnosisId,
    })

    if (doctorId && existingRecord.doctorId && existingRecord.doctorId !== doctorId.trim()) {
        throw new Error("You cannot edit diagnoses recorded by another doctor.")
    }

    const updatedRecord = await tablesDB.updateRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_DIAGNOSIS_TABLE_ID!,
        rowId: normalizedDiagnosisId,
        data: {
            diagnosisName: normalizedDiagnosisName,
            status: normalizePatientDiagnosisStatus(status),
            diagnosedAt: normalizeIsoDateString(diagnosedAt || existingRecord.diagnosedAt),
            notes: normalizeOptionalString(notes),
        },
    })

    return serializePatientDiagnosis(await withClinicalDoctorDetails(updatedRecord))
}

export const deletePatientDiagnosis = async ({ diagnosisId, doctorId }: { diagnosisId: string; doctorId?: string }) => {
    assertClinicalTableConfig(PATIENT_DIAGNOSIS_TABLE_ID, "PATIENT_DIAGNOSIS_TABLE_ID")

    if (!diagnosisId.trim()) {
        throw new Error("Missing diagnosis record id.")
    }

    const existingRecord = await tablesDB.getRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_DIAGNOSIS_TABLE_ID!,
        rowId: diagnosisId,
    })

    if (doctorId && existingRecord.doctorId && existingRecord.doctorId !== doctorId.trim()) {
        throw new Error("You cannot delete diagnoses recorded by another doctor.")
    }

    await tablesDB.deleteRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_DIAGNOSIS_TABLE_ID!,
        rowId: diagnosisId,
    })

    return { success: true }
}

export const createPatientPrescription = async ({
    patientId,
    patientUserId,
    doctorId,
    medicationName,
    dosage,
    frequency,
    status,
    prescribedAt,
    instructions,
    appointmentId,
    duration,
}: {
    patientId: string
    patientUserId: string
    doctorId: string
    medicationName: string
    dosage: string
    frequency: string
    status: PatientPrescriptionStatus
    prescribedAt?: string
    instructions?: string
    appointmentId?: string
    duration?: string
}) => {
    assertClinicalTableConfig(PATIENT_PRESCRIPTION_TABLE_ID, "PATIENT_PRESCRIPTION_TABLE_ID")

    const normalizedPatientId = patientId.trim()
    const normalizedPatientUserId = patientUserId.trim()
    const normalizedDoctorId = doctorId.trim()
    const normalizedMedicationName = medicationName.trim()
    const normalizedDosage = dosage.trim()
    const normalizedFrequency = frequency.trim()

    if (!normalizedPatientId || !normalizedPatientUserId || !normalizedDoctorId || !normalizedMedicationName || !normalizedDosage || !normalizedFrequency) {
        throw new Error("Missing required prescription details.")
    }

    const record = await tablesDB.createRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_PRESCRIPTION_TABLE_ID!,
        rowId: ID.unique(),
        data: {
            patientId: normalizedPatientId,
            patientUserId: normalizedPatientUserId,
            doctorId: normalizedDoctorId,
            medicationName: normalizedMedicationName,
            dosage: normalizedDosage,
            frequency: normalizedFrequency,
            status: normalizePatientPrescriptionStatus(status),
            prescribedAt: normalizeIsoDateString(prescribedAt),
            instructions: normalizeOptionalString(instructions),
            appointmentId: normalizeOptionalString(appointmentId),
            duration: normalizeOptionalString(duration),
        },
    })

    return serializePatientPrescription(await withClinicalDoctorDetails(record))
}

export const updatePatientPrescription = async ({
    prescriptionId,
    doctorId,
    medicationName,
    dosage,
    frequency,
    status,
    prescribedAt,
    instructions,
    duration,
}: {
    prescriptionId: string
    doctorId?: string
    medicationName: string
    dosage: string
    frequency: string
    status: PatientPrescriptionStatus
    prescribedAt?: string
    instructions?: string
    duration?: string
}) => {
    assertClinicalTableConfig(PATIENT_PRESCRIPTION_TABLE_ID, "PATIENT_PRESCRIPTION_TABLE_ID")

    const normalizedPrescriptionId = prescriptionId.trim()
    const normalizedMedicationName = medicationName.trim()
    const normalizedDosage = dosage.trim()
    const normalizedFrequency = frequency.trim()

    if (!normalizedPrescriptionId || !normalizedMedicationName || !normalizedDosage || !normalizedFrequency) {
        throw new Error("Missing prescription details.")
    }

    const existingRecord = await tablesDB.getRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_PRESCRIPTION_TABLE_ID!,
        rowId: normalizedPrescriptionId,
    })

    if (doctorId && existingRecord.doctorId && existingRecord.doctorId !== doctorId.trim()) {
        throw new Error("You cannot edit prescriptions recorded by another doctor.")
    }

    const updatedRecord = await tablesDB.updateRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_PRESCRIPTION_TABLE_ID!,
        rowId: normalizedPrescriptionId,
        data: {
            medicationName: normalizedMedicationName,
            dosage: normalizedDosage,
            frequency: normalizedFrequency,
            status: normalizePatientPrescriptionStatus(status),
            prescribedAt: normalizeIsoDateString(prescribedAt || existingRecord.prescribedAt),
            instructions: normalizeOptionalString(instructions),
            duration: normalizeOptionalString(duration),
        },
    })

    return serializePatientPrescription(await withClinicalDoctorDetails(updatedRecord))
}

export const deletePatientPrescription = async ({ prescriptionId, doctorId }: { prescriptionId: string; doctorId?: string }) => {
    assertClinicalTableConfig(PATIENT_PRESCRIPTION_TABLE_ID, "PATIENT_PRESCRIPTION_TABLE_ID")

    if (!prescriptionId.trim()) {
        throw new Error("Missing prescription record id.")
    }

    const existingRecord = await tablesDB.getRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_PRESCRIPTION_TABLE_ID!,
        rowId: prescriptionId,
    })

    if (doctorId && existingRecord.doctorId && existingRecord.doctorId !== doctorId.trim()) {
        throw new Error("You cannot delete prescriptions recorded by another doctor.")
    }

    await tablesDB.deleteRow({
        databaseId: DATABASE_ID!,
        tableId: PATIENT_PRESCRIPTION_TABLE_ID!,
        rowId: prescriptionId,
    })

    return { success: true }
}

export const updatePatientAccountStatus = async ({
    userId,
    accountStatus,
    accountStatusMessage,
}: {
    userId: string
    accountStatus: PatientAccountStatus
    accountStatusMessage?: string
}) => {
    const normalizedStatus = normalizePatientStatus(accountStatus)
    const normalizedMessage = normalizePatientStatusMessage(accountStatusMessage)

    await updatePatientStatusPrefs(userId, normalizedStatus, normalizedMessage)

    return getPatientByUserId(userId)
}

export const sendPatientNotification = async ({
    userId,
    title,
    message,
    emergency = false,
    tone,
    kind,
}: {
    userId: string
    title?: string
    message: string
    emergency?: boolean
    tone?: DoctorNotificationTone
    kind?: PatientNotificationKind
}) => {
    const normalizedMessage = normalizePatientStatusMessage(message)
    const normalizedTitle = title?.trim() || (emergency ? "Emergency message" : "Admin message")

    if (!userId) {
        throw new Error("Missing patient userId for notification delivery.")
    }

    if (!normalizedMessage) {
        throw new Error("Enter a notification message before sending it to the patient.")
    }

    const existingPrefs = await getPatientPrefsRecord(userId)
    const normalizedNotifications = normalizePatientNotifications(existingPrefs.adminNotifications)

    const nextNotification = buildPatientNotification({
        title: normalizedTitle,
        message: normalizedMessage,
        tone: emergency ? "warning" : normalizePatientNotificationTone(tone),
        kind: kind || (emergency ? "emergency-message" : "admin-message"),
    })

    await users.updatePrefs({
        userId,
        prefs: {
            ...existingPrefs,
            adminNotifications: [nextNotification, ...normalizedNotifications].slice(0, MAX_PATIENT_ADMIN_NOTIFICATIONS),
        },
    })

    return parseStringify(nextNotification)
}

export const markPatientNotificationReadState = async ({
    userId,
    notificationId,
    read,
}: {
    userId: string
    notificationId: string
    read: boolean
}) => {
    if (!notificationId) {
        throw new Error("Missing notification id.")
    }

    const nextReadAt = read ? new Date().toISOString() : undefined

    return updatePatientNotifications(userId, (notifications) =>
        notifications.map((notification) =>
            notification.id === notificationId
                ? {
                    ...notification,
                    readAt: nextReadAt,
                }
                : notification
        )
    )
}

export const markAllPatientNotificationsAsRead = async (userId: string) => {
    const markedAt = new Date().toISOString()

    return updatePatientNotifications(userId, (notifications) =>
        notifications.map((notification) => ({
            ...notification,
            readAt: notification.readAt || markedAt,
        }))
    )
}

export const getPatientSavedPaymentMethod = async (userId: string) => {
    if (!userId) {
        return null
    }

    const prefs = await getPatientStatusPrefs(userId)
    return parseStringify(prefs.savedPaymentMethod || null)
}

export const getPatientBillingPreferences = async (userId: string) => {
    if (!userId) {
        return parseStringify(DEFAULT_PATIENT_BILLING_PREFERENCES)
    }

    const prefs = await getPatientStatusPrefs(userId)
    return parseStringify(prefs.billingPreferences || DEFAULT_PATIENT_BILLING_PREFERENCES)
}

export const removePatientSavedPaymentMethod = async (userId: string) => {
    if (!userId) {
        throw new Error("Missing patient userId for payment method removal.")
    }

    const existingPrefs = await getPatientPrefsRecord(userId)
    const { savedPaymentMethod: _savedPaymentMethod, ...remainingPrefs } = existingPrefs

    await users.updatePrefs({
        userId,
        prefs: remainingPrefs,
    })

    return parseStringify({ success: true })
}

export const savePatientBillingPreferences = async ({
    userId,
    savePaymentMethod,
    emailReceipt,
}: {
    userId: string
    savePaymentMethod: boolean
    emailReceipt: boolean
}) => {
    if (!userId) {
        throw new Error("Missing patient account for billing preference save.")
    }

    const existingPrefs = await getPatientPrefsRecord(userId)
    const nextBillingPreferences: PatientBillingPreferences = {
        savePaymentMethod,
        emailReceipt,
        updatedAt: new Date().toISOString(),
    }

    await users.updatePrefs({
        userId,
        prefs: {
            ...existingPrefs,
            billingPreferences: nextBillingPreferences,
        },
    })

    return parseStringify(nextBillingPreferences)
}

export const savePatientPaymentMethod = async ({
    userId,
    method,
    brand,
    nameOnAccount,
    referenceNumber,
    expiryMonth,
    expiryYear,
    notes,
}: {
    userId: string
    method: PaymentMethodKind
    brand?: PaymentCardBrand
    nameOnAccount: string
    referenceNumber: string
    expiryMonth?: string
    expiryYear?: string
    notes?: string
}) => {
    if (!userId) {
        throw new Error("Missing patient account for payment method save.")
    }

    const normalizedMethod = normalizePaymentMethodKind(method)
    const normalizedBrand = normalizePaymentCardBrand(brand)
    const normalizedName = nameOnAccount.trim()
    const digitsOnlyReference = referenceNumber.replace(/\D/g, "")
    const normalizedNotes = notes?.trim() || undefined

    if (normalizedName.length < 2) {
        throw new Error("Enter the name attached to this payment method.")
    }

    if (normalizedMethod === "bank") {
        if (digitsOnlyReference.length < 10) {
            throw new Error("Enter a valid bank or account reference.")
        }
    } else {
        if (digitsOnlyReference.length < 16 || digitsOnlyReference.length > 19) {
            throw new Error("Enter a valid card number before saving the payment method.")
        }

        if (!expiryMonth || !/^\d{2}$/.test(expiryMonth)) {
            throw new Error("Select a valid expiry month.")
        }

        if (!expiryYear || !/^\d{4}$/.test(expiryYear)) {
            throw new Error("Select a valid expiry year.")
        }
    }

    const existingPrefs = await getPatientPrefsRecord(userId)
    const nextPaymentMethod: PatientSavedPaymentMethod = {
        method: normalizedMethod,
        brand: normalizedMethod === "bank" ? undefined : normalizedBrand,
        nameOnAccount: normalizedName,
        last4: digitsOnlyReference.slice(-4),
        expiryMonth: normalizedMethod === "bank" ? undefined : expiryMonth,
        expiryYear: normalizedMethod === "bank" ? undefined : expiryYear,
        referenceHint:
            normalizedMethod === "bank"
                ? `Account ending ${digitsOnlyReference.slice(-4)}`
                : `${normalizedBrand === "unknown" ? "Card" : normalizedBrand} ending ${digitsOnlyReference.slice(-4)}`,
        notes: normalizedNotes,
        updatedAt: new Date().toISOString(),
    }

    await users.updatePrefs({
        userId,
        prefs: {
            ...existingPrefs,
            savedPaymentMethod: nextPaymentMethod,
        },
    })

    return parseStringify(nextPaymentMethod)
}

export const sendBroadcastPatientNotification = async ({
    title,
    message,
    emergency = false,
}: {
    title?: string
    message: string
    emergency?: boolean
}) => {
    const patients = await listPatients(500)

    const uniqueUserIds = Array.from(new Set(patients.map((patient) => patient.userId).filter(Boolean)))

    await Promise.all(
        uniqueUserIds.map((userId) =>
            sendPatientNotification({
                userId,
                title: title?.trim() || (emergency ? "Emergency broadcast" : "Admin broadcast"),
                message,
                emergency,
            })
        )
    )

    return { delivered: uniqueUserIds.length }
}

{/*export const getUser = async (userId: string) => {
    try {
        const user = await users.get(userId);

        return parseStringify(user);
    } catch (error) {
        throw error;
    }
}*/}
