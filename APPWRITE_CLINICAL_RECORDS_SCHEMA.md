# Appwrite Clinical Records Schema Plan

This project should keep the existing patient table for profile-style fields and add separate tables for repeatable clinical records.

## Keep On Patient Table

Existing fields already fit the patient profile model and should remain on the patient table:

- `userId`
- `name`
- `email`
- `phone`
- `birthDate`
- `gender`
- `address`
- `occupation`
- `emergencyContactName`
- `emergencyContactNumber`
- `primaryPhysician`
- `insuranceProvider`
- `insurancePolicyNumber`
- `allergies`
- `currentMedication`
- `familyMedicalHistory`
- `pastMedicalHistory`
- `avatarId`
- `identificationType`
- `identificationNumber`
- `identificationDocumentId`
- `privacyConsent`

Optional snapshot fields that are reasonable to add to the patient table:

- `bloodGroup` as string
- `heightCm` as double
- `weightKg` as double
- `primaryDiagnosis` as string
- `lastRecordedAt` as datetime

## New Table: Patient Vitals

Environment variable:

- `PATIENT_VITALS_TABLE_ID`

Suggested Appwrite columns:

- `patientId` string, required, indexed
- `patientUserId` string, required, indexed
- `appointmentId` string, optional, indexed
- `doctorId` string, optional, indexed
- `recordedAt` datetime, required, indexed
- `bloodPressureSystolic` integer, optional
- `bloodPressureDiastolic` integer, optional
- `heartRate` integer, optional
- `temperatureCelsius` float, optional
- `respiratoryRate` integer, optional
- `oxygenSaturation` integer, optional
- `weightKg` float, optional
- `heightCm` float, optional
- `notes` string, optional

Recommended indexes:

- `patientId`
- `patientUserId`
- `appointmentId`
- `doctorId`
- `recordedAt`
- compound: `patientId + recordedAt desc`

## New Table: Patient Diagnoses

Environment variable:

- `PATIENT_DIAGNOSIS_TABLE_ID`

Suggested Appwrite columns:

- `patientId` string, required, indexed
- `patientUserId` string, required, indexed
- `appointmentId` string, optional, indexed
- `doctorId` string, required, indexed
- `diagnosisName` string, required
- `status` enum: `active`, `resolved`, `chronic`
- `notes` string, optional
- `diagnosedAt` datetime, required, indexed

Recommended indexes:

- `patientId`
- `patientUserId`
- `appointmentId`
- `doctorId`
- `status`
- `diagnosedAt`
- compound: `patientId + diagnosedAt desc`

## New Table: Patient Prescriptions

Environment variable:

- `PATIENT_PRESCRIPTION_TABLE_ID`

Suggested Appwrite columns:

- `patientId` string, required, indexed
- `patientUserId` string, required, indexed
- `appointmentId` string, optional, indexed
- `doctorId` string, required, indexed
- `medicationName` string, required
- `dosage` string, required
- `frequency` string, required
- `duration` string, optional
- `instructions` string, optional
- `status` enum: `active`, `completed`, `stopped`
- `prescribedAt` datetime, required, indexed

Recommended indexes:

- `patientId`
- `patientUserId`
- `appointmentId`
- `doctorId`
- `status`
- `prescribedAt`
- compound: `patientId + prescribedAt desc`

## Rollout Order

Recommended implementation sequence:

1. Add optional snapshot fields to the patient table only if you want a quick summary on the records page.
2. Create the `Patient Vitals` table first because it gives immediate value and timeline data.
3. Add the `Patient Diagnoses` table next.
4. Add the `Patient Prescriptions` table after that.

## UI Mapping

Patient records page should use:

- patient table: health summary, insurance, ID, completion score
- patient vitals table: latest vitals card and vitals history timeline
- patient diagnoses table: active diagnoses and diagnosis history
- patient prescriptions table: active medication list and prescription history

Doctor-facing pages should create new vitals, diagnoses, and prescriptions from appointment workflows instead of editing them directly on the patient table.