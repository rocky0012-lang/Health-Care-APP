"use client"

import { useEffect, useState } from "react"
import { Bell, Globe, KeyRound, LogOut, Settings, UserRound } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  clearAdminSession,
  clearDoctorSessionCookie,
  clearPatientSessions,
} from "@/lib/actions/auth-session.action"
import { getPatientByUserId } from "@/lib/actions/patient.action"
import {
  clearPatientSession,
  getCurrentPatientUserId,
  getStoredPatientAvatar,
  setStoredPatientAvatar,
} from "@/lib/patient-session"
import {
  clearDoctorSession,
  getCurrentDoctorUserId,
  getStoredDoctorAvatar,
} from "@/lib/doctor-session"
import { getDoctorByUserId } from "@/lib/actions/doctor.action"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface AdminHeaderProps {
  pageTitle: string
  pageDescription: string
  notificationCount?: number
  notifications?: Array<{
    id: string
    title: string
    message: string
    createdAt?: string
    tone?: "default" | "warning" | "success"
  }>
  userRole?: string
  avatarInitials?: string
  welcomeName?: string
  subNavItems?: Array<{ label: string; href: string; active?: boolean }>
  showPageTitleInWelcome?: boolean
  onMarkNotificationRead?: (notificationId: string) => Promise<void> | void
}

export function AdminHeader({
  pageTitle,
  pageDescription,
  notificationCount = 0,
  notifications = [],
  userRole = "Admin",
  avatarInitials = "AD",
  welcomeName,
  subNavItems,
  showPageTitleInWelcome = true,
  onMarkNotificationRead,
}: AdminHeaderProps) {
  const [time, setTime] = useState("")
  const [avatarImage, setAvatarImage] = useState("")
  const [resolvedWelcomeName, setResolvedWelcomeName] = useState(welcomeName || userRole)
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationMenuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const isAdminRole = userRole.toLowerCase() === "admin"
  const isDoctorRole = userRole.toLowerCase() === "doctor"
  const profileHref = isAdminRole ? "/admin/profile" : isDoctorRole ? "/doctor/profile" : "/profile"
  const settingsHref = isAdminRole ? "/admin/settings" : isDoctorRole ? "/doctor/settings" : "/settings"
  const resetPasswordHref = isAdminRole ? "/admin/reset-password" : null
  const languageOptions = ["English", "French", "Spanish", "Swahili"]
  const resolvedNotificationCount = notifications.length > 0 ? notifications.length : notificationCount
  const derivedAvatarInitials = (resolvedWelcomeName || userRole)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || avatarInitials

  useEffect(() => {
    setResolvedWelcomeName(welcomeName || userRole)
  }, [userRole, welcomeName])

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isAdminRole) {
      setAvatarImage("")
      setResolvedWelcomeName(welcomeName || userRole)
      return
    }

    if (isDoctorRole) {
      const currentUserId = getCurrentDoctorUserId()
      const storedAvatar = getStoredDoctorAvatar(currentUserId)
      const hasLocalAvatar = storedAvatar.startsWith("data:")

      if (hasLocalAvatar) {
        setAvatarImage(storedAvatar)
      } else {
        setAvatarImage("")
      }

      if (!currentUserId) {
        return
      }

      let isMounted = true

      const loadDoctorAvatar = async () => {
        try {
          const doctor = await getDoctorByUserId(currentUserId)
          if (!isMounted || !doctor) {
            return
          }
          if (doctor.name) {
            setResolvedWelcomeName(doctor.name)
          }
          if (!hasLocalAvatar && doctor.avatarUrl) {
            setAvatarImage(doctor.avatarUrl)
          }
        } catch (error) {
          console.error("Failed to load doctor avatar", error)
        }
      }

      void loadDoctorAvatar()

      return () => {
        isMounted = false
      }
    }

    const currentUserId = getCurrentPatientUserId()
    const storedAvatar = getStoredPatientAvatar(currentUserId)
    const hasLocalAvatar = storedAvatar.startsWith("data:")

    if (hasLocalAvatar) {
      setAvatarImage(storedAvatar)
    } else {
      setAvatarImage("")
    }

    if (!currentUserId) {
      return
    }

    let isMounted = true

    const loadAvatar = async () => {
      try {
        const patient = await getPatientByUserId(currentUserId)
        if (!isMounted || !patient) {
          return
        }

        if (patient.name) {
          setResolvedWelcomeName(patient.name)
        }

        if (!hasLocalAvatar && patient.avatarUrl) {
          setAvatarImage(patient.avatarUrl)
        }
      } catch (error) {
        console.error("Failed to load patient avatar", error)
      }
    }

    void loadAvatar()

    return () => {
      isMounted = false
    }
  }, [isAdminRole, isDoctorRole, userRole, welcomeName])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setIsLanguageMenuOpen(false)
      }

      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const handleLogout = async () => {
    if (isDoctorRole) {
      const endpoint = process.env.NEXT_PUBLIC_ENDPOINT || ""
      const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ""
      if (endpoint && projectId) {
        try {
          await fetch(`${endpoint.replace(/\/$/,"")}/account/sessions/current`, {
            method: "DELETE",
            headers: { "X-Appwrite-Project": projectId },
            credentials: "include",
          })
        } catch (error) {
          console.error("Failed to clear doctor session", error)
        }
      }
      await clearDoctorSessionCookie()
      clearDoctorSession()
      router.push("/doctor/login")
      return
    }

    if (isAdminRole) {
      await clearAdminSession()
      router.push("/")
      return
    }

    await clearPatientSessions()
    clearPatientSession()
    router.push("/")
  }

  return (
    <div className="border-b border-border/60">
      <header className="flex flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: trigger + welcome + time */}
        <div className="flex w-full items-start gap-3 sm:items-center lg:w-auto">
          <SidebarTrigger className="mt-1 hidden border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 md:inline-flex sm:mt-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">
              Welcome {resolvedWelcomeName || userRole}
              {showPageTitleInWelcome && pageTitle ? ` - ${pageTitle}` : ""}
            </h1>
            <p className="break-words text-sm text-muted-foreground">{pageDescription}</p>
          </div>
          {time && (
            <span className="hidden shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-muted-foreground dark:bg-slate-800 md:inline-block">
              {time}
            </span>
          )}
        </div>

        {/* Right: language, notifications, avatar */}
        <div className="flex w-full items-center justify-end gap-2 sm:gap-3 lg:w-auto">
          <div className="relative" ref={languageMenuRef}>
            <button
              className="rounded-md p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Language"
              onClick={() => setIsLanguageMenuOpen((open) => !open)}
              type="button"
            >
              <Globe className="size-5" />
            </button>

            {isLanguageMenuOpen && (
              <div className="absolute right-0 top-12 z-50 min-w-40 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-white p-2 shadow-lg dark:bg-slate-950">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Select language
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  {languageOptions.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(language)
                        setIsLanguageMenuOpen(false)
                      }}
                      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selectedLanguage === language
                          ? "bg-blue-500 text-white"
                          : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={notificationMenuRef}>
            <button
              className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Notifications"
              type="button"
              onClick={() => setIsNotificationMenuOpen((open) => !open)}
            >
              <Bell className="size-5" />
              {resolvedNotificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                  {resolvedNotificationCount > 9 ? "9+" : resolvedNotificationCount}
                </span>
              )}
            </button>

            {isNotificationMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-white p-2 shadow-lg dark:bg-slate-950">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notifications
                </p>
                {notifications.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">No new messages.</div>
                ) : (
                  <div className="mt-1 flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {notifications.map((notification) => {
                      const toneClass =
                        notification.tone === "warning"
                          ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
                          : notification.tone === "success"
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                            : "border-border bg-slate-50 dark:bg-slate-900/60"

                      return (
                        <div key={notification.id} className={`rounded-lg border px-3 py-3 ${toneClass}`}>
                          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                          {notification.createdAt && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          )}
                          {onMarkNotificationRead ? (
                            <button
                              type="button"
                              onClick={() => void onMarkNotificationRead(notification.id)}
                              className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-blue-600 transition-colors hover:text-blue-700"
                            >
                              Mark as Read
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <Drawer direction="right">
            <DrawerTrigger asChild>
              <button className="relative rounded-full transition-transform hover:scale-105" title="Open profile menu">
                <Avatar size="default">
                  <AvatarImage src={avatarImage} alt={`${userRole} avatar`} />
                  <AvatarFallback className="bg-blue-500 text-white font-semibold">
                    {derivedAvatarInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="bg-white dark:bg-slate-950">
              <DrawerHeader>
                <DrawerTitle>{resolvedWelcomeName || userRole}</DrawerTitle>
                <DrawerDescription>
                  Manage your account, profile details, and preferences.
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-2 p-4">
                <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Account navigation
                </div>
                <DrawerClose asChild>
                  <Link
                    href={profileHref}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <UserRound className="size-4" />
                    <span>Profile</span>
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    href={settingsHref}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </Link>
                </DrawerClose>
                {resetPasswordHref && (
                  <DrawerClose asChild>
                    <Link
                      href={resetPasswordHref}
                      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <KeyRound className="size-4" />
                      <span>Reset Passkey</span>
                    </Link>
                  </DrawerClose>
                )}
                <DrawerClose asChild>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout()
                    }}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="size-4" />
                    <span>Log out</span>
                  </button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      {subNavItems && subNavItems.length > 0 && (
        <nav className="flex items-center gap-2 overflow-x-auto border-t border-border/60 px-4 py-2 md:px-6">
          {subNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                item.active
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
