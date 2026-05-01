import { redirect } from "next/navigation"

import { account } from "@/lib/appwrite.config"
import { beginPendingPatientSession } from "@/lib/actions/auth-session.action"
import { getPatientByUserId } from "@/lib/actions/patient.action"

export default async function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string
    secret?: string
  }>
}) {
  const params = await searchParams
  const userId = params?.userId?.trim()
  const secret = params?.secret?.trim()

  if (!userId || !secret) {
    redirect("/auth/signup?oauth=google&status=missing")
  }

  try {
    await account.createSession(userId, secret)

    const patient = await getPatientByUserId(userId)
    await beginPendingPatientSession(userId)

    if (patient) {
      redirect("/patientsDashboard")
    }

    redirect(`/patients/${userId}/register`)
  } catch (error) {
    console.error("Google OAuth callback failed:", error)
    redirect("/auth/signup?oauth=google&status=failed")
  }
}