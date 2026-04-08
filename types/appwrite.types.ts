import { Models } from "node-appwrite";

export interface Patient extends Models.Document {
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date;
  gender: Gender;
  address: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  primaryPhysician: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  allergies: string | undefined;
  currentMedication: string | undefined;
  familyMedicalHistory: string | undefined;
  pastMedicalHistory: string | undefined;
  avatarId?: string;
  avatarUrl?: string;
  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocumentId?: string;
  identificationDocumentUrl?: string;
  identificationDocument: FormData | undefined;
  privacyConsent: boolean;
  accountStatus?: PatientAccountStatus;
  accountStatusMessage?: string;
  accountStatusMessageUpdatedAt?: string;
  adminNotifications?: PatientAdminNotification[];
}

export interface Doctor extends Models.Document {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  specialty?: string;
  licenseNumber?: string;
  experienceYears?: number;
  hospitalName?: string;
  availability?: string;
  profilePhoto?: string;
  name?: string;
  specialization?: string;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  accountStatus: DoctorAccountStatus;
  accountStatusMessage?: string;
  weeklySchedule?: DoctorWeeklySchedule;
}

export interface Appointment extends Models.Document {
  appointment_date: string;
  time_slot: string;
  status: Status;
  reason_for_visit: string;
  notes?: string;
  booking_channel: AppointmentBookingChannel;
  patient: Patient | string;
  doctor: Doctor | string;
  schedule?: Date;
  reason?: string;
  note?: string;
  primaryPhysician?: string;
  userId?: string;
  cancellationReason?: string | null;
  doctorDetails?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    specialty?: string;
  } | null;
  patientDetails?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    phone?: string;
  } | null;
}
