import { NextRequest, NextResponse } from "next/server"
import { account } from "@/lib/appwrite.config"
import { beginPendingPatientSession } from "@/lib/actions/auth-session.action"
import { getPatientByUserId } from "@/lib/actions/patient.action"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")?.trim()
  const secret = searchParams.get("secret")?.trim()

  if (!userId || !secret) {
    return NextResponse.redirect(
      new URL("/auth/signup?oauth=google&status=missing", request.url)
    )
  }

  try {
    await account.createSession(userId, secret)

    const patient = await getPatientByUserId(userId)
    await beginPendingPatientSession(userId)

    if (patient) {
      return NextResponse.redirect(new URL("/patientsDashboard", request.url))
    }

    return NextResponse.redirect(
      new URL(`/patients/${userId}/register`, request.url)
    )
  } catch (error) {
    console.error("Google OAuth callback failed:", error)
    return NextResponse.redirect(
      new URL("/auth/signup?oauth=google&status=failed", request.url)
    )
  }
}
