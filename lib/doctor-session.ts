const CURRENT_DOCTOR_USER_KEY = "doctorUserId"
const CURRENT_DOCTOR_NAME_KEY = "doctorName"
const LEGACY_DOCTOR_AVATAR_KEY = "doctorAvatar"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function getCurrentDoctorUserId() {
  if (!canUseStorage()) {
    return ""
  }

  return window.localStorage.getItem(CURRENT_DOCTOR_USER_KEY) || ""
}

export function getDoctorNameStorageKey(userId: string) {
  return `doctorName:${userId}`
}

export function getDoctorAvatarStorageKey(userId: string) {
  return `doctorAvatar:${userId}`
}

export function getStoredDoctorName(userId?: string) {
  if (!canUseStorage()) {
    return ""
  }

  if (userId) {
    return window.localStorage.getItem(getDoctorNameStorageKey(userId)) || ""
  }

  return window.localStorage.getItem(CURRENT_DOCTOR_NAME_KEY) || ""
}

export function setStoredDoctorName(userId: string, name: string) {
  if (!canUseStorage()) {
    return
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return
  }

  window.localStorage.setItem(CURRENT_DOCTOR_USER_KEY, userId)
  window.localStorage.setItem(CURRENT_DOCTOR_NAME_KEY, trimmedName)
  window.localStorage.setItem(getDoctorNameStorageKey(userId), trimmedName)
}

export function getStoredDoctorAvatar(userId?: string) {
  if (!canUseStorage()) {
    return ""
  }

  if (userId) {
    return window.localStorage.getItem(getDoctorAvatarStorageKey(userId)) || ""
  }

  return window.localStorage.getItem(LEGACY_DOCTOR_AVATAR_KEY) || ""
}

export function setStoredDoctorAvatar(userId: string, avatarDataUrl: string) {
  if (!canUseStorage() || !avatarDataUrl) {
    return
  }

  window.localStorage.setItem(CURRENT_DOCTOR_USER_KEY, userId)
  window.localStorage.setItem(getDoctorAvatarStorageKey(userId), avatarDataUrl)
}

export function clearDoctorSession(userId?: string) {
  if (!canUseStorage()) {
    return
  }

  const resolvedUserId = userId || getCurrentDoctorUserId()

  window.localStorage.removeItem(CURRENT_DOCTOR_USER_KEY)
  window.localStorage.removeItem(CURRENT_DOCTOR_NAME_KEY)
  window.localStorage.removeItem(LEGACY_DOCTOR_AVATAR_KEY)

  if (!resolvedUserId) {
    return
  }

  window.localStorage.removeItem(getDoctorNameStorageKey(resolvedUserId))
  window.localStorage.removeItem(getDoctorAvatarStorageKey(resolvedUserId))
}