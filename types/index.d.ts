/* eslint-disable no-unused-vars */

declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

declare type Gender = "Male" | "Female" | "Other";
declare type Status = "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
declare type AppointmentBookingChannel = "web" | "mobile" | "phone";
declare type UserRole = "admin" | "patient" | "doctor";
declare type DoctorAccountStatus = "active" | "deactivated" | "suspended";
declare type PatientAccountStatus = "active" | "deactivated" | "suspended";
declare type DoctorNotificationTone = "default" | "warning" | "success";
declare type PatientNotificationKind = "status" | "admin-message" | "emergency-message" | "broadcast" | "doctor-message" | "appointment-update";
declare type DoctorScheduleDayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
declare type PaymentMethodKind = "card" | "mobile" | "bank";
declare type PaymentCardBrand = "visa" | "mastercard" | "amex" | "discover" | "verve" | "unknown";

declare interface DoctorWeeklyScheduleDay {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

declare type DoctorWeeklySchedule = Record<DoctorScheduleDayKey, DoctorWeeklyScheduleDay>;

declare interface DoctorAdminNotification {
  id: string;
  title: string;
  message: string;
  tone: DoctorNotificationTone;
  createdAt: string;
  readAt?: string;
  kind: "status" | "admin-message";
  status?: DoctorAccountStatus;
}

declare interface PatientAdminNotification {
  id: string;
  title: string;
  message: string;
  tone: DoctorNotificationTone;
  createdAt: string;
  readAt?: string;
  kind: PatientNotificationKind;
  status?: PatientAccountStatus;
}

declare interface PatientSavedPaymentMethod {
  method: PaymentMethodKind;
  brand?: PaymentCardBrand;
  nameOnAccount: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  referenceHint?: string;
  notes?: string;
  updatedAt: string;
}

declare interface PatientBillingPreferences {
  savePaymentMethod: boolean;
  emailReceipt: boolean;
  updatedAt: string;
}

declare interface CreateUserParams {
  name: string;
  email: string;
  phone: string;
}
declare interface User extends CreateUserParams {
  $id: string;
}

declare interface CreateDoctorAccountParams {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

declare interface CreateDoctorRecordParams {
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
  accountStatus: DoctorAccountStatus;
  accountStatusMessage?: string;
  weeklySchedule?: DoctorWeeklySchedule;
}

declare interface UpdateDoctorRecordParams extends CreateDoctorRecordParams {
  doctorId: string;
  password?: string;
}

declare interface DoctorLoginParams {
  email: string;
  password: string;
}

declare interface RegisterUserParams extends CreateUserParams {
  userId: string;
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
  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocument: FormData | undefined;
  privacyConsent: boolean;
}

declare type CreateAppointmentParams = {
  patientUserId: string;
  doctorId: string;
  appointmentDate: string;
  timeSlot: string;
  status: Status;
  reasonForVisit: string;
  notes?: string;
  bookingChannel: AppointmentBookingChannel;
};

declare type UpdateAppointmentParams = {
  appointmentId: string;
  userId: string;
  appointment: Appointment;
  type: string;
};