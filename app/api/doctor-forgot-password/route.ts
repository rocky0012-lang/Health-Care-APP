import { NextResponse } from "next/server"
import { initiateDoctorPasswordRecovery } from "@/lib/actions/doctor.action"

export async function POST(request: Request) {
  const body = await request.json()
  const email = typeof body.email === "string" ? body.email.trim() : ""

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 })
  }

  try {
    await initiateDoctorPasswordRecovery(email)
    return NextResponse.json({ ok: true, message: "If an account with that email exists, a password reset link has been sent." })
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to send password reset email." },
      { status: 400 }
    )
  }
}