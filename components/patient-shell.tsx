"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
} from "lucide-react"

import { AdminHeader } from "@/components/admin-header"
import { clearPatientSessions } from "@/lib/actions/auth-session.action"
import { getPatientByUserId } from "@/lib/actions/patient.action"
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
  clearPatientSession,
  getCurrentPatientUserId,
  getStoredPatientName,
} from "@/lib/patient-session"

type PatientShellProps = {
  pageTitle: string
  pageDescription: string
  children: ReactNode
}

const navItems = [
  { label: "Overview", href: "/patientsDashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/patientsDashboard/appointments", icon: CalendarCheck },
  { label: "Messages", href: "/patientsDashboard/messages", icon: Bell },
  { label: "Records", href: "/patientsDashboard/records", icon: FileText },
  { label: "Billing", href: "/patientsDashboard/billing", icon: CreditCard },
]

function isActiveStatusNoticeVisible(notification: PatientAdminNotification) {
  if (notification.kind !== "status" || notification.status !== "active") {
    return true
  }

  const createdAtMs = Date.parse(notification.createdAt)
  if (Number.isNaN(createdAtMs)) {
    return false
  }

  return Date.now() - createdAtMs <= 24 * 60 * 60 * 1000
}

export function PatientShell({ pageTitle, pageDescription, children }: PatientShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [patientName, setPatientName] = useState("Patient")
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; createdAt?: string; tone: "default" | "warning" | "success" }>
  >([])
  const [topNotice, setTopNotice] = useState<
    { title: string; message: string; tone: "default" | "warning" | "success" } | null
  >(null)

  useEffect(() => {
    const currentUserId = getCurrentPatientUserId()
    const storedName = getStoredPatientName(currentUserId)

    if (storedName && storedName.trim().length > 0) {
      setPatientName(storedName)
    }

    if (!currentUserId) {
      setNotifications([])
      setTopNotice(null)
      return
    }

    let isMounted = true

    const loadPatientState = async () => {
      try {
        const patient = await getPatientByUserId(currentUserId)

        if (!isMounted || !patient) {
          return
        }

        if (patient.name) {
          setPatientName(patient.name)
        }

        const visibleNotifications = (patient.adminNotifications || [])
          .filter((notification) => isActiveStatusNoticeVisible(notification))
          .filter((notification) => !notification.readAt)
          .map((notification) => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt,
            tone: notification.tone,
          }))

        setNotifications(visibleNotifications)
        setTopNotice(
          visibleNotifications.length > 0
            ? {
                title: visibleNotifications[0].title,
                message: visibleNotifications[0].message,
                tone: visibleNotifications[0].tone,
              }
            : null
        )
      } catch (error) {
        console.error("Failed to load patient notifications", error)
      }
    }

    void loadPatientState()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    await clearPatientSessions()
    clearPatientSession()
    router.push("/")
  }

  const topNoticeClasses =
    topNotice?.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
      : topNotice?.tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
        : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100"

  return (
    <SidebarProvider className="min-h-screen w-full flex-row items-stretch">
      <Sidebar
        collapsible="icon"
        className="border-r border-slate-300/80 bg-slate-200/90 [&_[data-sidebar=sidebar]]:bg-slate-200/90 dark:border-slate-700 dark:bg-slate-800/90 dark:[&_[data-sidebar=sidebar]]:bg-slate-800/90"
      >
        <SidebarHeader>
          <div className="px-2 py-3">
            <p className="text-lg font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              NetCare Patient
            </p>
            <p className="text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Personal health dashboard
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
                          isActive ? "bg-blue-500" : "hover:bg-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:justify-center"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className={`group-data-[collapsible=icon]:hidden ${isActive ? "text-white" : ""}`}>
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
            onClick={() => void handleLogout()}
            className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-700"
            title="Log out"
          >
            <LogOut className="size-5" />
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-slate-50/50 dark:bg-slate-950">
        <AdminHeader
          userRole="Patient"
          avatarInitials="PT"
          welcomeName={patientName}
          showPageTitleInWelcome={false}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          notifications={notifications}
          subNavItems={navItems.map((item) => ({
            label: item.label === "Overview" ? "My Dashboard" : item.label,
            href: item.href,
            active: pathname === item.href,
          }))}
        />

        {topNotice && (
          <div className={`border-b px-4 py-3 md:px-6 ${topNoticeClasses}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{topNotice.title}</p>
                <p className="text-sm opacity-90">{topNotice.message}</p>
              </div>
            </div>
          </div>
        )}

        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}