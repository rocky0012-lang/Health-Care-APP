const CURRENT_PATIENT_USER_KEY = "patientUserId"
const PENDING_PATIENT_USER_KEY = "pendingPatientUserId"
const CURRENT_PATIENT_NAME_KEY = "patientName"
const LEGACY_PATIENT_AVATAR_KEY = "patientAvatar"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function getCurrentPatientUserId() {
  if (!canUseStorage()) {
    return ""
  }

  return (
    window.localStorage.getItem(CURRENT_PATIENT_USER_KEY) ||
    window.localStorage.getItem(PENDING_PATIENT_USER_KEY) ||
    ""
  )
}

export function getPatientNameStorageKey(userId: string) {
  return `patientName:${userId}`
}

export function getPatientAvatarStorageKey(userId: string) {
  return `patientAvatar:${userId}`
}

export function getStoredPatientName(userId?: string) {
  if (!canUseStorage()) {
    return ""
  }

  if (userId) {
    return window.localStorage.getItem(getPatientNameStorageKey(userId)) || ""
  }

  return window.localStorage.getItem(CURRENT_PATIENT_NAME_KEY) || ""
}

export function setStoredPatientName(userId: string, name: string) {
  if (!canUseStorage()) {
    return
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return
  }

  window.localStorage.setItem(CURRENT_PATIENT_NAME_KEY, trimmedName)
  window.localStorage.setItem(getPatientNameStorageKey(userId), trimmedName)
}

export function getStoredPatientAvatar(userId?: string) {
  if (!canUseStorage()) {
    return ""
  }

  if (userId) {
    return window.localStorage.getItem(getPatientAvatarStorageKey(userId)) || ""
  }

  return window.localStorage.getItem(LEGACY_PATIENT_AVATAR_KEY) || ""
}

export function setStoredPatientAvatar(userId: string, avatarDataUrl: string) {
  if (!canUseStorage() || !avatarDataUrl) {
    return
  }

  window.localStorage.setItem(getPatientAvatarStorageKey(userId), avatarDataUrl)
}