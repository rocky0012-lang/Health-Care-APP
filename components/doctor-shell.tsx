"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react"

import { AdminHeader } from "@/components/admin-header"
import { getDoctorByUserId, markDoctorNotificationReadState } from "@/lib/actions/doctor.action"
import { clearDoctorSessionCookie } from "@/lib/actions/auth-session.action"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  clearDoctorSession,
  getCurrentDoctorUserId,
  getStoredDoctorName,
} from "@/lib/doctor-session"

type DoctorShellProps = {
  pageTitle: string
  pageDescription: string
  children: ReactNode
}

const navItems = [
  { label: "Overview", href: "/doctor/dashboard", icon: LayoutDashboard },
  { label: "My Patients", href: "/doctor/patients", icon: Users },
  { label: "Appointments", href: "/doctor/appointments", icon: CalendarDays },
  { label: "Schedule", href: "/doctor/schedule", icon: Clock },
]

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_ENDPOINT || ""
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || ""

export function DoctorShell({ pageTitle, pageDescription, children }: DoctorShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [doctorName, setDoctorName] = useState("Doctor")
  const [statusBanner, setStatusBanner] = useState<{ status: DoctorAccountStatus; message: string } | null>(null)
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; createdAt?: string; tone: "default" | "warning" | "success" }>
  >([])

  const syncUnreadNotifications = (doctorNotifications: DoctorAdminNotification[]) => {
    setNotifications(
      doctorNotifications
        .filter((notification) => !notification.readAt)
        .map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt,
          tone: notification.tone,
        }))
    )
  }

  const isActiveStatusMessageVisible = (updatedAt?: string) => {
    if (!updatedAt) {
      return false
    }

    const updatedAtMs = Date.parse(updatedAt)
    if (Number.isNaN(updatedAtMs)) {
      return false
    }

    return Date.now() - updatedAtMs <= 24 * 60 * 60 * 1000
  }

  useEffect(() => {
    const currentUserId = getCurrentDoctorUserId()
    const storedName = getStoredDoctorName(currentUserId)

    if (storedName && storedName.trim().length > 0) {
      setDoctorName(storedName)
    }

    if (!currentUserId) {
      setStatusBanner(null)
      setNotifications([])
      return
    }

    let isMounted = true

    const loadDoctorStatus = async () => {
      try {
        const doctor = await getDoctorByUserId(currentUserId)

        if (!isMounted || !doctor) {
          return
        }

        if (doctor.name) {
          setDoctorName(doctor.name)
        }

        const hasVisibleActiveNotice =
          doctor.accountStatus === "active" &&
          doctor.accountStatusMessage &&
          isActiveStatusMessageVisible(doctor.accountStatusMessageUpdatedAt)

        syncUnreadNotifications(doctor.adminNotifications || [])

        if (doctor.accountStatus !== "active" || hasVisibleActiveNotice) {
          const resolvedMessage =
            doctor.accountStatusMessage ||
            `Your account is ${doctor.accountStatus}. Please contact admin.`

          setStatusBanner({
            status: doctor.accountStatus,
            message: resolvedMessage,
          })
          return
        }

        setStatusBanner(null)
      } catch (error) {
        console.error("Failed to load doctor status", error)
      }
    }

    void loadDoctorStatus()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID) {
        await fetch(
          `${APPWRITE_ENDPOINT.replace(/\/$/, "")}/account/sessions/current`,
          {
            method: "DELETE",
            headers: { "X-Appwrite-Project": APPWRITE_PROJECT_ID },
            credentials: "include",
          }
        )
      }
    } catch {
      // Local cleanup still needs to happen if the session request fails.
    }

    await clearDoctorSessionCookie()
    clearDoctorSession()
    router.push("/doctor/login")
  }

  return (
    <SidebarProvider className="min-h-screen w-full flex-row items-stretch">
      <Sidebar
        collapsible="icon"
        className="border-r border-slate-300/80 bg-slate-200/90 [&_[data-sidebar=sidebar]]:bg-slate-200/90 dark:border-slate-700 dark:bg-slate-800/90 dark:[&_[data-sidebar=sidebar]]:bg-slate-800/90"
      >
        <SidebarHeader>
          <div className="px-2 py-3">
            <p className="text-lg font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              NetCare Doctors
            </p>
            <p className="text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Doctor portal
            </p>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              Dashboard
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <SidebarMenuItem key={item.label}>
                      <div
                        className={`rounded-md transition-colors ${
                          isActive
                            ? "bg-blue-500"
                            : "hover:bg-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:justify-center"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span
                              className={`group-data-[collapsible=icon]:hidden ${
                                isActive ? "text-white" : ""
                              }`}
                            >
                              {item.label}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </div>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-700"
            title="Log out"
          >
            <LogOut className="size-5" />
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-slate-50/50 dark:bg-slate-950">
        <AdminHeader
          userRole="Doctor"
          avatarInitials="DR"
          welcomeName={doctorName}
          showPageTitleInWelcome={false}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          notifications={notifications}
          onMarkNotificationRead={async (notificationId) => {
            const currentUserId = getCurrentDoctorUserId()

            if (!currentUserId) {
              return
            }

            const updatedNotifications = await markDoctorNotificationReadState({
              userId: currentUserId,
              notificationId,
              read: true,
            })

            syncUnreadNotifications(updatedNotifications)
          }}
          subNavItems={navItems.map((item) => ({
            label: item.label,
            href: item.href,
            active: pathname === item.href,
          }))}
        />

        {statusBanner && (
          <div
            className={`border-b px-4 py-3 md:px-6 ${
              statusBanner.status === "active"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30"
            }`}
          >
            <div
              className={`flex items-start gap-3 ${
                statusBanner.status === "active"
                  ? "text-emerald-900 dark:text-emerald-100"
                  : "text-amber-900 dark:text-amber-100"
              }`}
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  Admin notice: {statusBanner.status === "suspended"
                    ? "Account suspended"
                    : statusBanner.status === "deactivated"
                      ? "Account deactivated"
                      : "Account active"}
                </p>
                <p
                  className={`text-sm ${
                    statusBanner.status === "active"
                      ? "text-emerald-800/90 dark:text-emerald-200/90"
                      : "text-amber-800/90 dark:text-amber-200/90"
                  }`}
                >
                  {statusBanner.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}