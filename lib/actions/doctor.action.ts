"use server"

import { DATABASE_ID, DOCTOR_TABLE_ID, account, tablesDB, users } from "../appwrite.config"
import { ID, Query } from "node-appwrite"
import { parseStringify } from "../utils"
import { sendDoctorWelcomeEmail } from "./email-notification.action"

type DoctorStatusPrefs = {
  accountStatus?: DoctorAccountStatus
  accountStatusMessage?: string
  accountStatusMessageUpdatedAt?: string
  adminNotifications?: DoctorAdminNotification[]
  weeklySchedule?: DoctorWeeklySchedule
}

const DEFAULT_DOCTOR_ACCOUNT_STATUS: DoctorAccountStatus = "active"
const MAX_DOCTOR_ADMIN_NOTIFICATIONS = 20
const DEFAULT_WEEKLY_SCHEDULE: DoctorWeeklySchedule = {
  monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
}
const DOCTOR_SCHEDULE_DAY_KEYS: DoctorScheduleDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizeDoctorWeeklySchedule(schedule: unknown): DoctorWeeklySchedule {
  if (!schedule || typeof schedule !== "object") {
    return DEFAULT_WEEKLY_SCHEDULE
  }

  const candidate = schedule as Partial<Record<DoctorScheduleDayKey, Partial<DoctorWeeklyScheduleDay>>>

  return DOCTOR_SCHEDULE_DAY_KEYS.reduce<DoctorWeeklySchedule>((accumulator, dayKey) => {
    const defaultDay = DEFAULT_WEEKLY_SCHEDULE[dayKey]
    const nextDay = candidate[dayKey]

    accumulator[dayKey] = {
      enabled: typeof nextDay?.enabled === "boolean" ? nextDay.enabled : defaultDay.enabled,
      startTime: isTimeValue(nextDay?.startTime) ? nextDay.startTime : defaultDay.startTime,
      endTime: isTimeValue(nextDay?.endTime) ? nextDay.endTime : defaultDay.endTime,
    }

    return accumulator
  }, {} as DoctorWeeklySchedule)
}

function assertDoctorWeeklySchedule(schedule: DoctorWeeklySchedule) {
  for (const dayKey of DOCTOR_SCHEDULE_DAY_KEYS) {
    const day = schedule[dayKey]

    if (!day.enabled) {
      continue
    }

    if (!isTimeValue(day.startTime) || !isTimeValue(day.endTime)) {
      throw new Error("Each enabled weekday needs a valid start and end time.")
    }

    if (day.startTime >= day.endTime) {
      throw new Error("Each enabled weekday must end after it starts.")
    }
  }
}

function normalizeDoctorStatus(status?: string): DoctorAccountStatus {
  if (status === "deactivated" || status === "suspended") {
    return status
  }

  return DEFAULT_DOCTOR_ACCOUNT_STATUS
}

function normalizeDoctorStatusMessage(message?: string) {
  const trimmedMessage = message?.trim()
  return trimmedMessage ? trimmedMessage : undefined
}

function normalizeDoctorNotificationTone(tone?: string): DoctorNotificationTone {
  if (tone === "warning" || tone === "success") {
    return tone
  }

  return "default"
}

function normalizeDoctorNotifications(notifications: unknown): DoctorAdminNotification[] {
  if (!Array.isArray(notifications)) {
    return []
  }

  const normalized: DoctorAdminNotification[] = []

  for (const notification of notifications) {
      if (!notification || typeof notification !== "object") {
        continue
      }

      const candidate = notification as Partial<DoctorAdminNotification>
      const title = typeof candidate.title === "string" ? candidate.title.trim() : ""
      const message = typeof candidate.message === "string" ? candidate.message.trim() : ""
      const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : ""
      const readAt = typeof candidate.readAt === "string" && candidate.readAt.trim() ? candidate.readAt : undefined

      if (!title || !message || !createdAt) {
        continue
      }

      normalized.push({
        id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : ID.unique(),
        title,
        message,
        tone: normalizeDoctorNotificationTone(candidate.tone),
        createdAt,
        readAt,
        kind: candidate.kind === "status" ? "status" : "admin-message",
        status:
          candidate.status === "active" ||
          candidate.status === "deactivated" ||
          candidate.status === "suspended"
            ? candidate.status
            : undefined,
      })
  }

  return normalized
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_DOCTOR_ADMIN_NOTIFICATIONS)
}

function buildDoctorNotification({
  title,
  message,
  tone,
  kind,
  status,
}: {
  title: string
  message: string
  tone: DoctorNotificationTone
  kind: "status" | "admin-message"
  status?: DoctorAccountStatus
}): DoctorAdminNotification {
  return {
    id: ID.unique(),
    title: title.trim(),
    message: message.trim(),
    tone,
    createdAt: new Date().toISOString(),
    readAt: undefined,
    kind,
    status,
  }
}

async function getDoctorPrefsRecord(userId: string) {
  return users
    .getPrefs<Record<string, any>>({ userId })
    .catch(() => ({} as Record<string, any>))
}

async function updateDoctorNotifications(
  userId: string,
  updater: (notifications: DoctorAdminNotification[]) => DoctorAdminNotification[]
) {
  if (!userId) {
    throw new Error("Missing doctor userId for notification update.")
  }

  const existingPrefs = await getDoctorPrefsRecord(userId)
  const normalizedNotifications = normalizeDoctorNotifications(existingPrefs.adminNotifications)
  const nextNotifications = updater(normalizedNotifications)

  await users.updatePrefs({
    userId,
    prefs: {
      ...existingPrefs,
      adminNotifications: nextNotifications,
    },
  })

  return parseStringify(nextNotifications)
}

function assertDoctorStatusMessage(status: DoctorAccountStatus, message?: string) {
  if (normalizeDoctorStatus(status) !== "active" && !normalizeDoctorStatusMessage(message)) {
    throw new Error("Please provide a reason for suspending or deactivating this doctor.")
  }
}

async function getDoctorStatusPrefs(userId: string): Promise<DoctorStatusPrefs> {
  if (!userId) {
    return {}
  }

  try {
    const prefs = await users.getPrefs<DoctorStatusPrefs>({ userId })

    return {
      accountStatus: normalizeDoctorStatus(prefs?.accountStatus),
      accountStatusMessage: normalizeDoctorStatusMessage(prefs?.accountStatusMessage),
      accountStatusMessageUpdatedAt:
        typeof prefs?.accountStatusMessageUpdatedAt === "string"
          ? prefs.accountStatusMessageUpdatedAt
          : undefined,
      adminNotifications: normalizeDoctorNotifications(prefs?.adminNotifications),
      weeklySchedule: normalizeDoctorWeeklySchedule(prefs?.weeklySchedule),
    }
  } catch (error) {
    console.error("getDoctorStatusPrefs error:", error)
    return {}
  }
}

async function updateDoctorStatusPrefs(
  userId: string,
  status: DoctorAccountStatus,
  message?: string
) {
  if (!userId) {
    return
  }

  assertDoctorStatusMessage(status, message)

  const existingPrefs = await getDoctorPrefsRecord(userId)
  const normalizedMessage = normalizeDoctorStatusMessage(message)
  const normalizedNotifications = normalizeDoctorNotifications(existingPrefs.adminNotifications)

  const nextNotifications = normalizedMessage
    ? [
        buildDoctorNotification({
          title:
            status === "suspended"
              ? "Account suspended"
              : status === "deactivated"
                ? "Account deactivated"
                : "Account active",
          message: normalizedMessage,
          tone: status === "active" ? "success" : "warning",
          kind: "status",
          status,
        }),
        ...normalizedNotifications,
      ].slice(0, MAX_DOCTOR_ADMIN_NOTIFICATIONS)
    : normalizedNotifications

  const nextPrefs = {
    ...existingPrefs,
    accountStatus: normalizeDoctorStatus(status),
    accountStatusMessage: normalizedMessage || "",
    accountStatusMessageUpdatedAt: normalizedMessage ? new Date().toISOString() : "",
    adminNotifications: nextNotifications,
  }

  await users.updatePrefs({
    userId,
    prefs: nextPrefs,
  })
}

async function withDoctorStatus<T extends Record<string, any>>(doctor: T | null) {
  if (!doctor) {
    return null
  }

  const statusPrefs = await getDoctorStatusPrefs(doctor.userId)
  const accountStatus = normalizeDoctorStatus(statusPrefs.accountStatus)

  return {
    ...doctor,
    accountStatus,
    accountStatusMessage: statusPrefs.accountStatusMessage,
    accountStatusMessageUpdatedAt: statusPrefs.accountStatusMessageUpdatedAt,
    adminNotifications: statusPrefs.adminNotifications || [],
    weeklySchedule: normalizeDoctorWeeklySchedule(statusPrefs.weeklySchedule),
    isActive: accountStatus === "active",
  }
}

function serializeDoctor<T extends Record<string, any>>(doctor: T | null): (T & {
  avatarUrl: string
  name: string
  specialization: string
  department: string
  accountStatus: DoctorAccountStatus
  accountStatusMessage?: string
  accountStatusMessageUpdatedAt?: string
  adminNotifications: DoctorAdminNotification[]
  weeklySchedule: DoctorWeeklySchedule
  isActive: boolean
}) | null {
  if (!doctor) {
    return null
  }

  const accountStatus = normalizeDoctorStatus(doctor.accountStatus)

  return parseStringify({
    ...doctor,
    name: doctor.fullName || doctor.name || "",
    specialization: doctor.specialty || doctor.specialization || "",
    department: doctor.hospitalName || doctor.department || "",
    avatarUrl: doctor.profilePhoto || doctor.avatarUrl || "",
    accountStatus,
    accountStatusMessage: normalizeDoctorStatusMessage(doctor.accountStatusMessage),
    accountStatusMessageUpdatedAt:
      typeof doctor.accountStatusMessageUpdatedAt === "string"
        ? doctor.accountStatusMessageUpdatedAt
        : undefined,
    adminNotifications: normalizeDoctorNotifications(doctor.adminNotifications),
    weeklySchedule: normalizeDoctorWeeklySchedule(doctor.weeklySchedule),
    isActive: accountStatus === "active",
  })
}

function normalizeDoctorEmail(email: string) {
  return email.trim().toLowerCase()
}

async function doesDoctorUserExist(userId: string) {
  if (!userId) {
    return false
  }

  try {
    await users.get(userId)
    return true
  } catch (error) {
    return false
  }
}

async function assertDoctorRecordDoesNotExist({
  userId,
  email,
  excludeDoctorId,
}: {
  userId: string
  email: string
  excludeDoctorId?: string
}) {
  const normalizedEmail = normalizeDoctorEmail(email)

  const [existingByUserId, existingByEmail] = await Promise.all([
    getDoctorByUserId(userId),
    getDoctorByEmail(normalizedEmail),
  ])

  if (existingByUserId && existingByUserId.$id !== excludeDoctorId) {
    throw new Error("A doctor record already exists for this Appwrite user.")
  }

  if (existingByEmail && existingByEmail.$id !== excludeDoctorId) {
    throw new Error("A doctor record already exists for this email address.")
  }
}

export const getDoctorById = async (doctorId: string) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  try {
    const doctor = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: DOCTOR_TABLE_ID,
      rowId: doctorId,
    })

    return serializeDoctor(await withDoctorStatus(doctor))
  } catch (error) {
    console.error("getDoctorById error:", error)
    throw error
  }
}

const DOCTOR_PASSWORD_RESET_URL =
  process.env.NEXT_PUBLIC_DOCTOR_PASSWORD_RESET_URL?.trim() ||
  "https://netcareflow.com/doctor/reset-password"

async function sendDoctorPasswordRecoveryEmail(email: string, userId: string) {
  if (!email || !userId || !DOCTOR_PASSWORD_RESET_URL) {
    return
  }

  try {
    await account.createRecovery({
      email,
      url: DOCTOR_PASSWORD_RESET_URL,
    })
  } catch (recoveryError) {
    console.error("sendDoctorPasswordRecoveryEmail error:", recoveryError)
  }
}

export const createDoctorAccount = async (doctor: CreateDoctorAccountParams) => {
  const normalizedEmail = normalizeDoctorEmail(doctor.email)

  try {
    const newDoctorUser = await users.create({
      userId: ID.unique(),
      email: normalizedEmail,
      password: doctor.password,
      phone: doctor.phone,
      name: doctor.fullName,
    })

    await sendDoctorWelcomeEmail({
      userId: newDoctorUser.$id,
      doctorName: doctor.fullName,
      email: normalizedEmail,
      temporaryPassword: doctor.password,
      loginUrl:
        process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL ||
        "https://netcareflow.com/doctor/login",
    })

    return parseStringify(newDoctorUser)
  } catch (error: any) {
    if (error?.code === 409) {
      throw new Error(
        "An Appwrite user already exists for this doctor email. Use Edit on the existing doctor account to change credentials, or choose a different email address."
      )
    }

    console.error("createDoctorAccount error:", error)
    throw error
  }
}

export const completeDoctorPasswordRecovery = async ({
  userId,
  secret,
  password,
}: {
  userId: string
  secret: string
  password: string
}) => {
  const normalizedPassword = password.trim()

  if (!userId || !secret) {
    throw new Error("Missing recovery token or user identifier.")
  }

  if (normalizedPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.")
  }

  await account.updateRecovery(userId, secret, normalizedPassword)
}

export const createDoctorRecord = async (doctor: CreateDoctorRecordParams) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  try {
    await assertDoctorRecordDoesNotExist({
      userId: doctor.userId,
      email: doctor.email,
    })

    const record = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: DOCTOR_TABLE_ID,
      rowId: ID.unique(),
      data: {
        userId: doctor.userId,
        fullName: doctor.fullName,
        email: normalizeDoctorEmail(doctor.email),
        phone: doctor.phone,
        gender: doctor.gender,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        experienceYears: doctor.experienceYears,
        hospitalName: doctor.hospitalName,
        availability: doctor.availability,
        profilePhoto: doctor.profilePhoto,
        isActive: normalizeDoctorStatus(doctor.accountStatus) === "active",
      },
    })

    await updateDoctorStatusPrefs(doctor.userId, doctor.accountStatus, doctor.accountStatusMessage)

    return serializeDoctor(await withDoctorStatus(record))
  } catch (error) {
    console.error("createDoctorRecord error:", error)
    throw error
  }
}

export const uploadDoctorAvatar = async () => {
  throw new Error("Doctor profile photos are now stored in the profilePhoto URL column.")
}

export const getDoctorByUserId = async (userId: string) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: DOCTOR_TABLE_ID,
      queries: [Query.equal("userId", [userId])],
    })

    const doctor = response.rows?.[0]

    if (!doctor || !(await doesDoctorUserExist(doctor.userId))) {
      return null
    }

    return serializeDoctor(await withDoctorStatus(doctor))
  } catch (error) {
    console.error("getDoctorByUserId error:", error)
    throw error
  }
}

export const getDoctorByEmail = async (email: string) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  try {
    const normalizedEmail = normalizeDoctorEmail(email)
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: DOCTOR_TABLE_ID,
      queries: [Query.equal("email", [normalizedEmail])],
    })

    const doctor = response.rows?.[0]

    if (!doctor || !(await doesDoctorUserExist(doctor.userId))) {
      return null
    }

    return serializeDoctor(await withDoctorStatus(doctor))
  } catch (error) {
    console.error("getDoctorByEmail error:", error)
    throw error
  }
}

export const listDoctors = async (limit = 6) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: DOCTOR_TABLE_ID,
      queries: [Query.orderDesc("$createdAt"), Query.limit(limit)],
    })

    const doctorsWithStatus = await Promise.all(
      response.rows.map(async (doctor) => {
        if (!doctor.userId || !(await doesDoctorUserExist(doctor.userId))) {
          return null
        }

        return serializeDoctor(await withDoctorStatus(doctor))
      })
    )

    return doctorsWithStatus.filter((doctor): doctor is NonNullable<typeof doctor> => Boolean(doctor))
  } catch (error) {
    console.error("listDoctors error:", error)
    throw error
  }
}

export const provisionDoctor = async (
  account: CreateDoctorAccountParams,
  record: Omit<CreateDoctorRecordParams, "userId" | "fullName" | "email" | "phone">
) => {
  const doctorUser = await createDoctorAccount(account)

  const doctorRecord = await createDoctorRecord({
    userId: doctorUser.$id,
    fullName: account.fullName,
    email: account.email,
    phone: account.phone,
    ...record,
  })

  return parseStringify({
    account: doctorUser,
    record: doctorRecord,
  })
}

export const getDoctorLoginRecord = async ({ email }: { email: string }) => {
  const doctor = await getDoctorByEmail(email)

  if (!doctor) {
    return null
  }

  return {
    userId: doctor.userId,
    email: doctor.email,
    name: doctor.name || doctor.fullName,
    accountStatus: doctor.accountStatus,
    accountStatusMessage: doctor.accountStatusMessage,
    accountStatusMessageUpdatedAt: doctor.accountStatusMessageUpdatedAt,
    adminNotifications: doctor.adminNotifications,
    isActive: doctor.accountStatus === "active",
  }
}

export const sendDoctorNotification = async ({
  userId,
  title,
  message,
}: {
  userId: string
  title?: string
  message: string
}) => {
  const normalizedMessage = normalizeDoctorStatusMessage(message)
  const normalizedTitle = title?.trim() || "Admin message"

  if (!userId) {
    throw new Error("Missing doctor userId for notification delivery.")
  }

  if (!normalizedMessage) {
    throw new Error("Enter a notification message before sending it to the doctor.")
  }

  const existingPrefs = await getDoctorPrefsRecord(userId)
  const normalizedNotifications = normalizeDoctorNotifications(existingPrefs.adminNotifications)

  const nextPrefs = {
    ...existingPrefs,
    adminNotifications: [
      buildDoctorNotification({
        title: normalizedTitle,
        message: normalizedMessage,
        tone: "default",
        kind: "admin-message",
      }),
      ...normalizedNotifications,
    ].slice(0, MAX_DOCTOR_ADMIN_NOTIFICATIONS),
  }

  await users.updatePrefs({
    userId,
    prefs: nextPrefs,
  })

  return parseStringify(nextPrefs.adminNotifications[0])
}

export const markDoctorNotificationReadState = async ({
  userId,
  notificationId,
  read,
}: {
  userId: string
  notificationId: string
  read: boolean
}) => {
  if (!notificationId) {
    throw new Error("Missing notification id.")
  }

  const nextReadAt = read ? new Date().toISOString() : undefined

  return updateDoctorNotifications(userId, (notifications) =>
    notifications.map((notification) =>
      notification.id === notificationId
        ? {
            ...notification,
            readAt: nextReadAt,
          }
        : notification
    )
  )
}

export const updateDoctorWeeklySchedule = async ({
  userId,
  weeklySchedule,
}: {
  userId: string
  weeklySchedule: DoctorWeeklySchedule
}) => {
  if (!userId) {
    throw new Error("Missing doctor userId for schedule update.")
  }

  const normalizedSchedule = normalizeDoctorWeeklySchedule(weeklySchedule)
  assertDoctorWeeklySchedule(normalizedSchedule)

  const existingPrefs = await users
    .getPrefs<Record<string, any>>({ userId })
    .catch(() => ({} as Record<string, any>))

  await users.updatePrefs({
    userId,
    prefs: {
      ...existingPrefs,
      weeklySchedule: normalizedSchedule,
    },
  })

  return getDoctorByUserId(userId)
}

export const updateDoctorAccountStatus = async ({
  doctorId,
  userId,
  accountStatus,
  accountStatusMessage,
}: {
  doctorId: string
  userId: string
  accountStatus: DoctorAccountStatus
  accountStatusMessage?: string
}) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  const normalizedStatus = normalizeDoctorStatus(accountStatus)
  const normalizedMessage = normalizeDoctorStatusMessage(accountStatusMessage)

  await updateDoctorStatusPrefs(userId, normalizedStatus, normalizedMessage)

  const updatedDoctor = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: DOCTOR_TABLE_ID,
    rowId: doctorId,
    data: {
      isActive: normalizedStatus === "active",
    },
  })

  return serializeDoctor(await withDoctorStatus(updatedDoctor))
}

export const updateDoctorRecord = async (doctor: UpdateDoctorRecordParams) => {
  if (!DATABASE_ID || !DOCTOR_TABLE_ID) {
    throw new Error("Missing DATABASE_ID or DOCTOR_TABLE_ID in environment")
  }

  const existingDoctor = await getDoctorById(doctor.doctorId)

  if (!existingDoctor) {
    throw new Error("Doctor record not found.")
  }

  await assertDoctorRecordDoesNotExist({
    userId: doctor.userId,
    email: doctor.email,
    excludeDoctorId: doctor.doctorId,
  })

  const normalizedEmail = normalizeDoctorEmail(doctor.email)

  if ((existingDoctor.fullName || "") !== doctor.fullName) {
    await users.updateName({
      userId: doctor.userId,
      name: doctor.fullName,
    })
  }

  if ((existingDoctor.email || "") !== normalizedEmail) {
    await users.updateEmail({
      userId: doctor.userId,
      email: normalizedEmail,
    })
  }

  if ((existingDoctor.phone || "") !== doctor.phone) {
    await users.updatePhone({
      userId: doctor.userId,
      number: doctor.phone,
    })
  }

  if (doctor.password && doctor.password.trim().length > 0) {
    await users.updatePassword({
      userId: doctor.userId,
      password: doctor.password,
    })
  }

  try {
    await updateDoctorStatusPrefs(
      doctor.userId,
      doctor.accountStatus,
      doctor.accountStatusMessage
    )

    const updatedDoctor = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: DOCTOR_TABLE_ID,
      rowId: doctor.doctorId,
      data: {
        userId: doctor.userId,
        fullName: doctor.fullName,
        email: normalizedEmail,
        phone: doctor.phone,
        gender: doctor.gender,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        experienceYears: doctor.experienceYears,
        hospitalName: doctor.hospitalName,
        availability: doctor.availability,
        profilePhoto: doctor.profilePhoto,
        isActive: normalizeDoctorStatus(doctor.accountStatus) === "active",
      },
    })

    return serializeDoctor(await withDoctorStatus(updatedDoctor))
  } catch (error) {
    console.error("updateDoctorRecord error:", error)
    throw error
  }
}