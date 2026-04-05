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

const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || "567468"

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
  if (passkey !== ADMIN_PASSKEY) {
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