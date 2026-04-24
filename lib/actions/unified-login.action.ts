"use server"

import { Query } from "node-appwrite"
import { users, tablesDB, DATABASE_ID } from "@/lib/appwrite.config"
import { withAppwriteRetry } from "@/lib/appwrite-retry"
import { getPatientByUserId } from "./patient.action"
import { getDoctorByUserId } from "./doctor.action"

const DOCTOR_TABLE_ID = process.env.NEXT_PUBLIC_DOCTOR_TABLE_ID || ""

export type UserRole = "admin" | "doctor" | "patient"

export interface UserLoginInfo {
  userId: string
  email: string
  role: UserRole
  name?: string
}

/**
 * Detect user role after successful authentication
 * Priority: Admin (passkey stored in file) > Doctor (has doctor record) > Patient
 */
export async function detectUserRole(email: string): Promise<UserRole> {
  const normalizedEmail = email.trim().toLowerCase()

  try {
    if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
      return "patient"
    }

    // Check if user is a doctor
    const doctor = await withAppwriteRetry(
      () =>
        tablesDB.listRows({
          databaseId: DATABASE_ID!,
          tableId: DOCTOR_TABLE_ID!,
          queries: [Query.equal("email", [normalizedEmail]), Query.limit(1)],
        }),
      "detectUserRole doctor check"
    )

    if (doctor?.rows && doctor.rows.length > 0) {
      return "doctor"
    }

    // If not a doctor, they're a patient
    // (Admin role is determined separately via passkey, not email-based)
    return "patient"
  } catch (error) {
    console.error("detectUserRole error:", error)
    // Default to patient if detection fails
    return "patient"
  }
}

/**
 * Get user information after login to determine redirect destination
 */
export async function getUserLoginInfo(userId: string): Promise<UserLoginInfo | null> {
  try {
    const appwriteUser = await withAppwriteRetry(
      () => users.get(userId),
      "getUserLoginInfo users.get"
    )

    if (!appwriteUser) {
      return null
    }

    const role = await detectUserRole(appwriteUser.email)

    // Get user name based on role
    let name = appwriteUser.name || "User"

    if (role === "doctor") {
      const doctor = await getDoctorByUserId(userId)
      name = doctor?.name || doctor?.fullName || name
    } else if (role === "patient") {
      const patient = await getPatientByUserId(userId)
      name = patient?.name || name
    }

    return {
      userId,
      email: appwriteUser.email,
      role,
      name,
    }
  } catch (error) {
    console.error("getUserLoginInfo error:", error)
    return null
  }
}
