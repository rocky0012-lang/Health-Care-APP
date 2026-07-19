import { NextRequest, NextResponse } from "next/server"

import { getDoctorByUserId } from "@/lib/actions/doctor.action"
import { listDoctorAppointmentsByDoctorId } from "@/lib/actions/appointment.action"

function getPerformanceAccessToken() {
  return process.env.PERFORMANCE_TEST_TOKEN?.trim() || ""
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const expectedToken = getPerformanceAccessToken()

  if (expectedToken) {
    const providedToken =
      request.headers.get("x-performance-token")?.trim() || url.searchParams.get("token")?.trim() || ""

    if (providedToken !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized performance test request." },
        { status: 401 }
      )
    }
  }

  const doctorUserId =
    url.searchParams.get("doctorUserId")?.trim() ||
    process.env.PERFORMANCE_DOCTOR_USER_ID?.trim() ||
    ""

  if (!doctorUserId) {
    return NextResponse.json(
      { ok: false, error: "Missing doctorUserId. Provide a query parameter or PERFORMANCE_DOCTOR_USER_ID." },
      { status: 400 }
    )
  }

  const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "150", 10)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 250) : 150

  const totalStartedAt = performance.now()
  const doctorLookupStartedAt = performance.now()
  const doctor = await getDoctorByUserId(doctorUserId)
  const doctorLookupMs = performance.now() - doctorLookupStartedAt

  if (!doctor) {
    return NextResponse.json(
      { ok: false, error: "Doctor record not found for the provided user id." },
      { status: 404 }
    )
  }

  const appointmentsStartedAt = performance.now()
  const appointments = await listDoctorAppointmentsByDoctorId(doctor.$id, limit)
  const appointmentsMs = performance.now() - appointmentsStartedAt
  const totalMs = performance.now() - totalStartedAt

  const response = NextResponse.json(
    {
      ok: true,
      doctorUserId,
      doctorId: doctor.$id,
      doctorName: doctor.name || doctor.fullName || "",
      appointmentCount: appointments.length,
      limit,
      timings: {
        doctorLookupMs: Number(doctorLookupMs.toFixed(2)),
        appointmentsMs: Number(appointmentsMs.toFixed(2)),
        totalMs: Number(totalMs.toFixed(2)),
      },
    },
    { status: 200 }
  )

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  response.headers.set(
    "Server-Timing",
    [
      `doctor;dur=${doctorLookupMs.toFixed(2)}`,
      `appointments;dur=${appointmentsMs.toFixed(2)}`,
      `total;dur=${totalMs.toFixed(2)}`,
    ].join(", ")
  )

  return response
}
