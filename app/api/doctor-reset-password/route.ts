import { NextResponse } from "next/server"

import { completeDoctorPasswordRecovery } from "@/lib/actions/doctor.action"

export async function POST(request: Request) {
  const body = await request.json()
  const userId = typeof body.userId === "string" ? body.userId.trim() : ""
  const token = typeof body.token === "string" ? body.token.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : ""

  if (!userId || !token) {
    return NextResponse.json({ ok: false, message: "Missing password reset token." }, { status: 400 })
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ ok: false, message: "Password must be at least 8 characters long." }, { status: 400 })
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 })
  }

  try {
    await completeDoctorPasswordRecovery({ userId, token, password })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to reset the password." },
      { status: 400 }
    )
  }
}
