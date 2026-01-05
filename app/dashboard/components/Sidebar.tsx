"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, type Transition } from "framer-motion"
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Cloud,
  CreditCard,
  Users,
  Archive,
  Zap,
  MessageSquare,
  Star,
  Bell,
  HelpCircle,
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
    name: "Assets",
    href: "/dashboard/assets",
    icon: Archive,
  },
  {
    name: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    name: "Support",
    href: "/support",
    icon: HelpCircle,
    description: "Help center and documentation"
  },
  {
    name: "Communication",
    href: "/dashboard/communication",
    icon: MessageSquare,
    description: "Tickets and feedback",
    subItems: [
      {
        name: "My Tickets",
        href: "/dashboard/communication/tickets",
        icon: MessageSquare,
      },
      {
        name: "Feedback",
        href: "/dashboard/communication/feedback",
        icon: Star,
      },
      {
        name: "Updates",
        href: "/dashboard/communication/notifications",
        icon: Bell,
      },
    ]
  },
  {
    name: "Integrations",
    href: "/dashboard/integrations",
    icon: Cloud,
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

// Professional spring transition
const SPRING_TRANSITION: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.8,
} as const

export default function Sidebar({ userName, userImage, signOutAction }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  // Auto-expand Support section if we're on a communication page
  useEffect(() => {
    if (pathname.startsWith('/dashboard/communication')) {
      setExpandedItems(prev => prev.includes('Support') ? prev : [...prev, 'Support'])
    }
  }, [pathname])

  // Handle auto-collapse on smaller desktop screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
        setIsCollapsed(true)
      } else if (window.innerWidth >= 1280) {
        setIsCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarContent = (
    <motion.div
      layout
      className="flex flex-col h-full bg-card text-card-foreground border-r border-border shadow-sm"
    >
      {/* Brand / Logo Section */}
      <div className="flex items-center justify-between p-6 mb-2">
        <Link href="/dashboard" className="flex items-center gap-3">
          <motion.div
            layout="position"
            className="bg-primary p-2 rounded-lg flex-shrink-0"
          >
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap"
              >
                SecureUpload
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md border border-border text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={SPRING_TRANSITION}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none pt-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const hasSubItems = item.subItems && item.subItems.length > 0
          const isExpanded = expandedItems.includes(item.name)

          return (
            <div key={item.href}>
              {hasSubItems ? (
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 w-full ${active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <motion.div layout="position" className="flex-shrink-0">
                    <Icon className={`w-5 h-5 ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  </motion.div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium text-[0.9375rem] whitespace-nowrap flex-1 text-left"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, rotate: isExpanded ? 180 : 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {active && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                      transition={SPRING_TRANSITION}
                    />
                  )}

                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border shadow-md">
                      {item.name}
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ${active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <motion.div layout="position" className="flex-shrink-0">
                    <Icon className={`w-5 h-5 ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  </motion.div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium text-[0.9375rem] whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {active && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                      transition={SPRING_TRANSITION}
                    />
                  )}

                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border shadow-md">
                      {item.name}
                    </div>
                  )}
                </Link>
              )}

              {/* Sub-items */}
              {hasSubItems && !isCollapsed && (
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 mt-1 space-y-1"
                    >
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon
                        const subActive = isActive(subItem.href)

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${subActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                          >
                            <SubIcon className={`w-4 h-4 ${subActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                            <span className="font-medium text-sm whitespace-nowrap">
                              {subItem.name}
                            </span>
                            {subActive && (
                              <motion.div
                                layoutId="sidebar-sub-active-indicator"
                                className="absolute left-0 w-0.5 h-4 bg-primary rounded-r-full"
                                transition={SPRING_TRANSITION}
                              />
                            )}
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          )
        })}
      </nav>

      {/* Upgrade Placeholder */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 mb-6"
          >
            <div className="p-4 bg-muted border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pro Plan</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Higher limits and faster sharing.</p>
              <button className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-all">
                Upgrade
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Section */}
      <motion.div layout className="p-4 border-t border-border bg-muted/50">
        <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-muted ${isCollapsed ? "justify-center" : ""}`}>
          <motion.div layout="position" className="relative flex-shrink-0">
            {userImage ? (
              <img
                src={userImage}
                alt={userName || "User"}
                className="w-10 h-10 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                {userName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground">Personal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form action={signOutAction} className="mt-2 text-muted-foreground">
          <button
            type="submit"
            className={`flex items-center gap-2.5 w-full px-4 py-2 hover:text-foreground hover:bg-muted rounded-xl transition-all group ${isCollapsed ? "justify-center" : ""
              }`}
          >
            <motion.div layout="position">
              <LogOut className="w-4 h-4" />
            </motion.div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium"
                >
                  Log out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>
      </motion.div>
    </motion.div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 bg-card border border-border text-muted-foreground rounded-xl shadow-sm active:scale-95 transition-transform"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/80 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={SPRING_TRANSITION}
              className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden"
            >
              <div className="h-full relative shadow-2xl">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground z-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 88 : 280 }}
        transition={SPRING_TRANSITION}
        className="hidden lg:flex flex-col sticky top-0 h-screen z-30 overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>
    </>
  )
}
