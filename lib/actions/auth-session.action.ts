"use server"

import { cookies } from "next/headers"

import {
  ADMIN_ACCESS_COOKIE,
  DEFAULT_COOKIE_MAX_AGE,
  DOCTOR_SESSION_COOKIE,
  PATIENT_PENDING_COOKIE,
  PATIENT_SESSION_COOKIE,
  createSignedAuthToken,
} from "@/lib/auth-cookies"
import { account } from "@/lib/appwrite.config"
import { updateStoredAdminPasskey, verifyAdminPasskey } from "@/lib/admin-passkey-store"
import { OAuthProvider } from "node-appwrite"

function getCookieOptions(maxAge = DEFAULT_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

export async function createAdminSession(passkey: string) {
  if (!(await verifyAdminPasskey(passkey))) {
    return { ok: false as const, error: "Invalid passkey. Please try again." }
  }

  const cookieStore = await cookies()
  const token = await createSignedAuthToken({
    sub: "admin",
    type: "admin",
  })

  cookieStore.set(ADMIN_ACCESS_COOKIE, token, getCookieOptions())

  return { ok: true as const }
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_ACCESS_COOKIE)
}

export async function resetAdminPassword({
  currentPassword,
  nextPassword,
  confirmPassword,
}: {
  currentPassword: string
  nextPassword: string
  confirmPassword: string
}) {
  const normalizedCurrent = currentPassword.trim()
  const normalizedNext = nextPassword.trim()
  const normalizedConfirm = confirmPassword.trim()

  if (!normalizedCurrent || !normalizedNext || !normalizedConfirm) {
    throw new Error("Current passkey, new passkey, and confirmation are all required.")
  }

  if (normalizedNext !== normalizedConfirm) {
    throw new Error("New passkey and confirmation do not match.")
  }

  if (normalizedCurrent === normalizedNext) {
    throw new Error("Choose a new passkey that is different from the current one.")
  }

  await updateStoredAdminPasskey(normalizedCurrent, normalizedNext)

  return { ok: true as const }
}

export async function createDoctorSession(userId: string) {
  if (!userId) {
    throw new Error("Missing doctor userId for active session.")
  }

  const cookieStore = await cookies()
  const token = await createSignedAuthToken({
    sub: userId,
    type: "doctor",
  })

  cookieStore.set(DOCTOR_SESSION_COOKIE, token, getCookieOptions())
}

export async function clearDoctorSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(DOCTOR_SESSION_COOKIE)
}

export async function beginPendingPatientSession(userId: string) {
  if (!userId) {
    throw new Error("Missing patient userId for pending session.")
  }

  const cookieStore = await cookies()
  const token = await createSignedAuthToken({
    sub: userId,
    type: "patient-pending",
  })

  cookieStore.set(PATIENT_PENDING_COOKIE, token, getCookieOptions())
  cookieStore.delete(PATIENT_SESSION_COOKIE)
}

export async function activatePatientSession(userId: string) {
  if (!userId) {
    throw new Error("Missing patient userId for active session.")
  }

  const cookieStore = await cookies()
  const token = await createSignedAuthToken({
    sub: userId,
    type: "patient",
  })

  cookieStore.set(PATIENT_SESSION_COOKIE, token, getCookieOptions())
  cookieStore.delete(PATIENT_PENDING_COOKIE)
}

export async function clearPatientSessions() {
  const cookieStore = await cookies()
  cookieStore.delete(PATIENT_SESSION_COOKIE)
  cookieStore.delete(PATIENT_PENDING_COOKIE)
}

export async function beginGoogleOAuthSession({
  successUrl,
  failureUrl,
}: {
  successUrl: string
  failureUrl: string
}) {
  if (!successUrl || !failureUrl) {
    return {
      ok: false as const,
      error: "Google sign up is currently unavailable. Please try again.",
    }
  }

  try {
    const url = await account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: successUrl,
      failure: failureUrl,
    })

    return {
      ok: true as const,
      url,
    }
  } catch (error) {
    console.error("beginGoogleOAuthSession failed:", error)

    return {
      ok: false as const,
      error: "Google sign up is currently unavailable. Please try again.",
    }
  }
}