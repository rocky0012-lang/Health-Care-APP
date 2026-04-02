"use client"

import { useEffect, useState } from "react"
import { Bell, Globe, Settings, UserRound } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getPatientByUserId } from "@/lib/actions/patient.action"
import {
  getCurrentPatientUserId,
  getStoredPatientAvatar,
  setStoredPatientAvatar,
} from "@/lib/patient-session"
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
  userRole?: string
  avatarInitials?: string
  welcomeName?: string
  subNavItems?: Array<{ label: string; href: string; active?: boolean }>
  showPageTitleInWelcome?: boolean
}

export function AdminHeader({
  pageTitle,
  pageDescription,
  notificationCount = 4,
  userRole = "Admin",
  avatarInitials = "AD",
  welcomeName,
  subNavItems,
  showPageTitleInWelcome = true,
}: AdminHeaderProps) {
  const [time, setTime] = useState("")
  const [avatarImage, setAvatarImage] = useState("")
  const [resolvedWelcomeName, setResolvedWelcomeName] = useState(welcomeName || userRole)
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement | null>(null)
  const isAdminRole = userRole.toLowerCase() === "admin"
  const profileHref = isAdminRole ? "/admin/profile" : "/profile"
  const settingsHref = isAdminRole ? "/admin/settings" : "/settings"
  const languageOptions = ["English", "French", "Spanish", "Swahili"]
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
  }, [isAdminRole, userRole, welcomeName])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setIsLanguageMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

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

          <button
            className="relative rounded-md p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

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
