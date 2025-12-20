"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  Cloud,
} from "lucide-react"

interface SidebarProps {
  userName?: string | null
  userImage?: string | null
  signOutAction: () => Promise<void>
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Portals",
    href: "/dashboard/portals",
    icon: FolderOpen,
  },
  {
    name: "Integrations",
    href: "/dashboard/integrations",
    icon: Cloud,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export default function Sidebar({ userName, userImage, signOutAction }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-gray-900">SecureUploadHub</span>
          )}
        </Link>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:block p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-indigo-600" : ""}`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? "justify-center" : ""}`}>
          {userImage ? (
            <img
              src={userImage}
              alt={userName || "User"}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-medium text-sm">
                {userName?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          )}
          {!isCollapsed && (
            <span className="text-sm text-gray-700 truncate">{userName}</span>
          )}
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className={`flex items-center gap-2 w-full px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm">Sign out</span>}
          </button>
        </form>
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center w-full mt-2 px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col h-full">{sidebarContent}</div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

