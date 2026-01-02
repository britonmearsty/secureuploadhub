"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, type Transition } from "framer-motion"
import {
    LayoutDashboard,
    Users,
    Settings,
    Menu,
    X,
    ShieldCheck,
    LogOut,
    ChevronLeft,
    FolderOpen,
    CreditCard,
    Zap,
    Mail,
    FileText,
    BarChart3,
} from "lucide-react"

interface AdminSidebarProps {
    userName?: string | null
    userImage?: string | null
    signOutAction: () => Promise<void>
}

const navItems = [
    {
        name: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        name: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
    },
    {
        name: "Users",
        href: "/admin/users",
        icon: Users,
    },
    {
        name: "Portals",
        href: "/admin/portals",
        icon: FolderOpen,
    },
    {
        name: "Billing",
        href: "/admin/billing",
        icon: CreditCard,
    },
    {
        name: "Audit Logs",
        href: "/admin/audit",
        icon: FileText,
    },
    {
        name: "Settings",
        href: "/admin/settings",
        icon: Settings,
    },
    {
        name: "Email Templates",
        href: "/admin/email-templates",
        icon: Mail,
    },
]

// Professional spring transition
const SPRING_TRANSITION: Transition = {
    type: "spring",
    stiffness: 260,
    damping: 30,
    mass: 0.8,
} as const

export default function AdminSidebar({ userName, userImage, signOutAction }: AdminSidebarProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin"
        }
        return pathname.startsWith(href)
    }

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
            className="flex flex-col h-full bg-white text-slate-900 border-r border-slate-200 shadow-sm"
        >
            {/* Brand / Logo Section */}
            <div className="flex items-center justify-between p-6 mb-2">
                <Link href="/admin" className="flex items-center gap-3">
                    <motion.div
                        layout="position"
                        className="bg-slate-900 p-2 rounded-lg flex-shrink-0"
                    >
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </motion.div>
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap"
                            >
                                Admin Panel
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md border border-slate-200 text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-50"
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

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ${active
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <motion.div layout="position" className="flex-shrink-0">
                                <Icon className={`w-5 h-5 ${active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`} />
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
                                    layoutId="admin-sidebar-active-indicator"
                                    className="absolute left-0 w-1 h-5 bg-slate-900 rounded-r-full"
                                    transition={SPRING_TRANSITION}
                                />
                            )}

                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Admin Badge */}
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="px-4 mb-6"
                    >
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-3.5 h-3.5 text-slate-600" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin Access</span>
                            </div>
                            <p className="text-xs text-slate-500">Full system control and management.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Section */}
            <motion.div layout className="p-4 border-t border-slate-200 bg-slate-50/50">
                <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-slate-100 ${isCollapsed ? "justify-center" : ""}`}>
                    <motion.div layout="position" className="relative flex-shrink-0">
                        {userImage ? (
                            <img
                                src={userImage}
                                alt={userName || "User"}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold">
                                {userName?.charAt(0).toUpperCase() || "A"}
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
                                <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
                                <p className="text-[11px] text-slate-500">Administrator</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <form action={signOutAction} className="mt-2 text-slate-500">
                    <button
                        type="submit"
                        className={`flex items-center gap-2.5 w-full px-4 py-2 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all group ${isCollapsed ? "justify-center" : ""
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
                className="lg:hidden fixed top-4 left-4 z-40 p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm active:scale-95 transition-transform"
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
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 lg:hidden"
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
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 z-50 transition-colors"
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
