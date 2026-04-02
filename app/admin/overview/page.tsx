"use client"

import Link from "next/link"
import {
  Activity,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
]

export default function OverviewPage() {
  return (
    <SidebarProvider className="min-h-screen w-full flex-row items-stretch">
      <Sidebar
        collapsible="icon"
        className="border-r border-slate-300/80 bg-slate-200/90 [&_[data-sidebar=sidebar]]:bg-slate-200/90 dark:border-slate-700 dark:bg-slate-800/90 dark:[&_[data-sidebar=sidebar]]:bg-slate-800/90"
      >
        <SidebarHeader>
          <div className="px-2 py-3">
            <p className="text-lg font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              NetCare Admin
            </p>
            <p className="text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Clinic operations dashboard
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              <p className="text-lg font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Dashboard
            </p>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = item.href === "/admin/overview";
                  return (
                    <SidebarMenuItem key={item.label}>
                      <div className={`rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-500'
                          : 'hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:justify-center"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className={`group-data-[collapsible=icon]:hidden ${
                              isActive ? 'text-white' : ''
                            }`}>
                              {item.label}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mb-4">
          <Link href="/" className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" title="Back to home">
            <LogOut className="size-5" />
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen flex-1 bg-slate-50/50 dark:bg-slate-950">
        <AdminHeader
          pageTitle="Overview"
          pageDescription="Dashboard overview and key metrics."
        />

        <section className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Card className="bg-blue-50/80 dark:bg-blue-950/30">
            <CardHeader>
              <CardDescription>Patients</CardDescription>
              <CardTitle>124 registered</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <Users className="size-5 text-blue-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Active patient records available for review.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50/80 dark:bg-emerald-950/30">
            <CardHeader>
              <CardDescription>Appointments</CardDescription>
              <CardTitle>18 scheduled today</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <CalendarDays className="size-5 text-emerald-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track queue volume and update slot availability.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50/80 dark:bg-amber-950/30">
            <CardHeader>
              <CardDescription>Reports</CardDescription>
              <CardTitle>3 pending reviews</CardTitle>
              <CardAction>
                <div className="rounded-full bg-white/80 p-2 dark:bg-slate-900/80">
                  <Activity className="size-5 text-amber-600" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Operational summaries ready for admin review.
              </p>
            </CardContent>
          </Card>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
