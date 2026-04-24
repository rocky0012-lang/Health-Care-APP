import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
	ADMIN_ACCESS_COOKIE,
	DOCTOR_SESSION_COOKIE,
	PATIENT_PENDING_COOKIE,
	PATIENT_SESSION_COOKIE,
	verifySignedAuthToken,
} from "@/lib/auth-cookies"

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const patientSessionToken = request.cookies.get(PATIENT_SESSION_COOKIE)?.value
	const pendingPatientToken = request.cookies.get(PATIENT_PENDING_COOKIE)?.value
	const patientSession = await verifySignedAuthToken(patientSessionToken, "patient")
	const pendingPatient = await verifySignedAuthToken(pendingPatientToken, "patient-pending")

	if (pathname.startsWith("/doctor") && !pathname.startsWith("/doctor/login")) {
		const doctorSession = await verifySignedAuthToken(
			request.cookies.get(DOCTOR_SESSION_COOKIE)?.value,
			"doctor"
		)

		if (!doctorSession?.sub) {
			return NextResponse.redirect(new URL("/doctor/login", request.url))
		}
	}

	if (pathname.startsWith("/admin")) {
		const adminSession = await verifySignedAuthToken(
			request.cookies.get(ADMIN_ACCESS_COOKIE)?.value,
			"admin"
		)

		if (!adminSession) {
			return NextResponse.redirect(new URL("/?admin=true", request.url))
		}
	}

	if (
		pathname.startsWith("/patientsDashboard") ||
		pathname === "/profile" ||
		pathname === "/settings"
	) {
		if (!patientSession?.sub) {
			return NextResponse.redirect(new URL("/", request.url))
		}
	}

	const patientRegisterMatch = pathname.match(/^\/patients\/([^/]+)\/register$/)

	if (patientRegisterMatch) {
		const requestedUserId = patientRegisterMatch[1]

		if (!pendingPatient?.sub) {
			if (patientSession?.sub) {
				return NextResponse.redirect(new URL("/patientsDashboard", request.url))
			}

			return NextResponse.redirect(new URL("/", request.url))
		}

		if (pendingPatient.sub !== requestedUserId) {
			return NextResponse.redirect(new URL(`/patients/${pendingPatient.sub}/register`, request.url))
		}
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		"/doctor/:path*",
		"/admin/:path*",
		"/patientsDashboard/:path*",
		"/profile",
		"/settings",
		"/patients/:path*/register",
	],
}
