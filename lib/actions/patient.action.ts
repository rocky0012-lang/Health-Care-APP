"use server"

import { BUCKET_ID, DATABASE_ID, PATIENT_TABLE_ID, storage, tablesDB, users } from "../appwrite.config"
import { ID, Permission, Query, Role } from "node-appwrite"
import { InputFile } from "node-appwrite/file"
import { parseStringify } from "../utils"

const PUBLIC_AVATAR_PERMISSIONS = [Permission.read(Role.any())]
const DEFAULT_PATIENT_ACCOUNT_STATUS: PatientAccountStatus = "active"
const MAX_PATIENT_ADMIN_NOTIFICATIONS = 20

type PatientStatusPrefs = {
    accountStatus?: PatientAccountStatus
    accountStatusMessage?: string
    accountStatusMessageUpdatedAt?: string
    adminNotifications?: PatientAdminNotification[]
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

        if (!title || !message || !createdAt) {
            continue
        }

        normalized.push({
            id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : ID.unique(),
            title,
            message,
            tone: normalizePatientNotificationTone(candidate.tone),
            createdAt,
            kind:
                candidate.kind === "status" ||
                candidate.kind === "emergency-message" ||
                candidate.kind === "broadcast"
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
    kind: "status" | "admin-message" | "emergency-message" | "broadcast"
    status?: PatientAccountStatus
}): PatientAdminNotification {
    return {
        id: ID.unique(),
        title: title.trim(),
        message: message.trim(),
        tone,
        createdAt: new Date().toISOString(),
        kind,
        status,
    }
}

function assertPatientStatusMessage(status: PatientAccountStatus, message?: string) {
    if (normalizePatientStatus(status) !== "active" && !normalizePatientStatusMessage(message)) {
        throw new Error("Please provide a reason for suspending or deactivating this patient.")
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

async function ensureAvatarFileIsReadable(fileId?: string) {
    if (!BUCKET_ID || !fileId) {
        return
    }

    await storage.updateFile({
        bucketId: BUCKET_ID,
        fileId,
        permissions: PUBLIC_AVATAR_PERMISSIONS,
    })
}

function serializePatient<T extends Record<string, any>>(patient: T | null): (T & {
    avatarUrl: string
    identificationDocumentUrl: string
    accountStatus: PatientAccountStatus
    accountStatusMessage?: string
    accountStatusMessageUpdatedAt?: string
    adminNotifications: PatientAdminNotification[]
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

    const existingPrefs = await users
        .getPrefs<Record<string, any>>({ userId })
        .catch(() => ({} as Record<string, any>))
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
        const existingUser = await users.list({
          queries: [Query.equal("email", [user.email])],
        })

        const found = existingUser?.users?.[0]
        if (!found) throw new Error("User already exists but could not be retrieved.")
        return parseStringify(found)
    }

    console.error("createUser error:", error)
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
            await ensureAvatarFileIsReadable(patient.avatarId)
        }

        return serializePatient(await withPatientStatus(patient))
    } catch (error) {
        console.error("getPatientByUserId error:", error)
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
}: {
    userId: string
    title?: string
    message: string
    emergency?: boolean
}) => {
    const normalizedMessage = normalizePatientStatusMessage(message)
    const normalizedTitle = title?.trim() || (emergency ? "Emergency message" : "Admin message")

    if (!userId) {
        throw new Error("Missing patient userId for notification delivery.")
    }

    if (!normalizedMessage) {
        throw new Error("Enter a notification message before sending it to the patient.")
    }

    const existingPrefs = await users
        .getPrefs<Record<string, any>>({ userId })
        .catch(() => ({} as Record<string, any>))
    const normalizedNotifications = normalizePatientNotifications(existingPrefs.adminNotifications)

    const nextNotification = buildPatientNotification({
        title: normalizedTitle,
        message: normalizedMessage,
        tone: emergency ? "warning" : "default",
        kind: emergency ? "emergency-message" : "admin-message",
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
