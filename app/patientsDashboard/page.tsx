"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CalendarCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
} from "lucide-react"
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
import { AdminHeader } from "@/components/admin-header"
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentPatientUserId, getStoredPatientName } from "@/lib/patient-session"

const navItems = [
  { label: "Overview", href: "/patientsDashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/patientsDashboard/appointments", icon: CalendarCheck },
  { label: "Records", href: "/patientsDashboard/records", icon: FileText },
  { label: "Billing", href: "/patientsDashboard/billing", icon: CreditCard },
]

export default function PatientDashboardPage() {
  const [patientName, setPatientName] = useState("Patient")

  useEffect(() => {
    const storedName = getStoredPatientName(getCurrentPatientUserId())
    if (storedName && storedName.trim().length > 0) {
      setPatientName(storedName)
    }
  }, [])

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
                  const isActive = item.href === "/patientsDashboard"
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
          <Link
            href="/"
            className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            title="Back to home"
          >
            <LogOut className="size-5" />
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-slate-50/50 dark:bg-slate-950">
        <AdminHeader
          userRole="Patient"
          avatarInitials="PT"
          welcomeName={patientName}
          showPageTitleInWelcome={false}
          pageTitle="My Dashboard"
          pageDescription="Track your care plan, appointments, and billing in one place."
          notificationCount={0}
          subNavItems={[
            { label: "My Dashboard", href: "/patientsDashboard", active: true },
            { label: "Appointments", href: "/patientsDashboard/appointments" },
            { label: "Records", href: "/patientsDashboard/records" },
            { label: "Billing", href: "/patientsDashboard/billing" },
          ]}
        />

        <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Card className="bg-blue-50/70 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Next Appointment</CardDescription>
              <CardTitle>0 scheduled</CardTitle>
              <CardAction>
                <CalendarCheck className="size-7 text-blue-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No appointments have been booked yet.
              </p>
            </CardContent>
          </Card>

          <Card id="records" className="bg-emerald-50/70 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>Medical Records</CardDescription>
              <CardTitle>0 updates</CardTitle>
              <CardAction>
                <FileText className="size-7 text-emerald-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No medical records have been added yet.
              </p>
            </CardContent>
          </Card>

          <Card id="billing" className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Outstanding Balance</CardDescription>
              <CardTitle>$0.00</CardTitle>
              <CardAction>
                <CreditCard className="size-7 text-amber-600" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No billing activity is available for this account.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="appointments" className="px-4 pb-6 md:px-6">
          <Card className="bg-indigo-50/70 dark:bg-indigo-950/30">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>
                Review upcoming visits and prepare questions for your provider.
              </CardDescription>
              <CardAction>
                <CalendarCheck className="size-7 text-indigo-600" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                You do not have any upcoming appointments yet.
              </div>
            </CardContent>
          </Card>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
