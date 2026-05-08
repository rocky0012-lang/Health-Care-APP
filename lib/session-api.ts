export type SessionApiResponse = {
  ok: boolean
  userId: string | null
  pending: boolean
}

export async function fetchCurrentPatientSession(): Promise<SessionApiResponse | null> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" })
    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data as SessionApiResponse
  } catch (err) {
    console.error("fetchCurrentPatientSession error:", err)
    return null
  }
}
