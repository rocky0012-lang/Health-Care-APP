import Link from "next/link"
import type { LucideIcon } from "lucide-react"

type AdminSidebarNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export function AdminSidebarNav({
  items,
  activeHref,
}: {
  items: AdminSidebarNavItem[]
  activeHref: string
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = item.href === activeHref

        return (
          <li key={item.label} data-slot="sidebar-menu-item" data-sidebar="menu-item" className="group/menu-item relative">
            <div
              className={`rounded-md transition-colors ${
                isActive ? "bg-blue-500" : "hover:bg-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Link
                href={item.href}
                data-slot="sidebar-menu-button"
                data-sidebar="menu-button"
                data-size="default"
                data-active={isActive}
                className={`peer/menu-button group/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2! ${
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={`group-data-[collapsible=icon]:hidden ${isActive ? "text-white" : ""}`}>
                  {item.label}
                </span>
              </Link>
            </div>
          </li>
        )
      })}
    </>
  )
}