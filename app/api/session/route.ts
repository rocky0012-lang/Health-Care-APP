import { NextRequest, NextResponse } from "next/server"
import {
  PATIENT_SESSION_COOKIE,
  PATIENT_PENDING_COOKIE,
  verifySignedAuthToken,
} from "@/lib/auth-cookies"

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(PATIENT_SESSION_COOKIE)?.value
    const pendingCookie = request.cookies.get(PATIENT_PENDING_COOKIE)?.value

    const session = await verifySignedAuthToken(sessionCookie, "patient")
    if (session?.sub) {
      return NextResponse.json({ ok: true, userId: session.sub, pending: false })
    }

    const pending = await verifySignedAuthToken(pendingCookie, "patient-pending")
    if (pending?.sub) {
      return NextResponse.json({ ok: true, userId: pending.sub, pending: true })
    }

    return NextResponse.json({ ok: false, userId: null, pending: false }, { status: 204 })
  } catch (err) {
    console.error("/api/session error:", err)
    return NextResponse.json({ ok: false, userId: null, pending: false }, { status: 500 })
  }
}
