"use server"

import { BUCKET_ID, DATABASE_ID, PATIENT_TABLE_ID, storage, tablesDB, users } from "../appwrite.config"
import { ID, Permission, Query, Role } from "node-appwrite"
import { InputFile } from "node-appwrite/file"
import { parseStringify } from "../utils"

const PUBLIC_AVATAR_PERMISSIONS = [Permission.read(Role.any())]

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
}) | null {
    if (!patient) {
        return null
    }

    return parseStringify({
        ...patient,
        avatarUrl: buildBucketFileUrl(patient.avatarId),
        identificationDocumentUrl: buildBucketFileUrl(patient.identificationDocumentId),
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

        return serializePatient(patient)
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

        return serializePatient(updatedPatient)
    } catch (error) {
        console.error("updatePatientProfile error:", error)
        throw error
    }
}

{/*export const getUser = async (userId: string) => {
    try {
        const user = await users.get(userId);

        return parseStringify(user);
    } catch (error) {
        throw error;
    }
}*/}
