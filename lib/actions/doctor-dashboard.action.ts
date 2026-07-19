"use server"

import { getDoctorByUserId } from "@/lib/actions/doctor.action"
import { listDoctorAppointmentsByDoctorId } from "@/lib/actions/appointment.action"

export async function getDoctorDashboardData(doctorUserId: string, limit = 150) {
  if (!doctorUserId) {
    return {
      doctor: null,
      appointments: [],
    }
  }

  const doctor = await getDoctorByUserId(doctorUserId)

  if (!doctor) {
    return {
      doctor: null,
      appointments: [],
    }
  }

  const appointments = await listDoctorAppointmentsByDoctorId(doctor.$id, limit)

  return {
    doctor,
    appointments,
  }
}
