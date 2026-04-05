export const ADMIN_ACCESS_COOKIE = "netcare_admin_access"
export const DOCTOR_SESSION_COOKIE = "netcare_doctor_session"
export const PATIENT_SESSION_COOKIE = "netcare_patient_session"
export const PATIENT_PENDING_COOKIE = "netcare_patient_pending"
export const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export type AuthCookieType = "admin" | "doctor" | "patient" | "patient-pending"

type AuthCookiePayload = {
  sub: string
  type: AuthCookieType
  exp: number
}

function getAuthCookieSecret() {
  return process.env.AUTH_COOKIE_SECRET || process.env.API_KEY || process.env.PROJECT_ID || "netcare-dev-secret"
}

function encodeBase64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4)
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthCookieSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

async function signValue(value: string) {
  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return encodeBase64Url(new Uint8Array(signature))
}

export async function createSignedAuthToken({
  sub,
  type,
  maxAge = DEFAULT_COOKIE_MAX_AGE,
}: {
  sub: string
  type: AuthCookieType
  maxAge?: number
}) {
  const payload: AuthCookiePayload = {
    sub,
    type,
    exp: Date.now() + maxAge * 1000,
  }

  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = await signValue(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export async function verifySignedAuthToken(token: string | undefined, expectedType: AuthCookieType) {
  if (!token) {
    return null
  }

  const [encodedPayload, signature] = token.split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = await signValue(encodedPayload)

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload))) as AuthCookiePayload

    if (payload.type !== expectedType || payload.exp <= Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}