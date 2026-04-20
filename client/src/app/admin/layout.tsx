"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Shield,
    Activity,
    BarChart3,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'admin')) {
            router.replace('/auth/login');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== 'admin') {
        return <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">Loading...</div>;
    }

    const navItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Appointments', href: '/admin/appointments', icon: Calendar },
        { name: 'Doctors', href: '/admin/doctors', icon: Users },
        { name: 'Ambulances', href: '/admin/agencies', icon: Activity },
        { name: 'Policies', href: '/admin/policies', icon: Shield },
        { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
        { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-cover bg-center bg-fixed flex relative" style={{ backgroundImage: "url('/images/hospital-bg.jpg')" }}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0"></div>

            {/* Sidebar */}
            <motion.aside
                initial={{ width: isSidebarOpen ? 260 : 80 }}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className={`sticky top-0 h-screen bg-white/70 backdrop-blur-xl border-r border-white/20 z-30 transition-all duration-300 hidden md:flex flex-col shadow-2xl`}
            >
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200/50">
                    {isSidebarOpen ? (
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Activity size={22} className="text-white" />
                            </div>
                            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Medi<span className="text-indigo-600">Connect</span></span>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                            <Activity size={22} className="text-white" />
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        {isSidebarOpen ? <ChevronRight size={20} className="rotate-180" /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <item.icon size={22} className={`${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                                    {isSidebarOpen && (
                                        <span className="ml-3 font-medium whitespace-nowrap overflow-hidden">{item.name}</span>
                                    )}
                                    {isActive && isSidebarOpen && (
                                        <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={() => logout()}
                        className={`flex items-center w-full px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={22} />
                        {isSidebarOpen && <span className="ml-3 font-medium">Sign Out</span>}
                    </button>
                    {isSidebarOpen && (
                        <div className="mt-4 px-4 py-3 bg-slate-50 rounded-xl">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Signed in as</div>
                            <div className="text-sm font-medium text-slate-900 truncate">{user?.email}</div>
                        </div>
                    )}
                </div>
            </motion.aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 bg-black z-40 md:hidden"
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 md:hidden flex flex-col border-r border-slate-200"
                        >
                            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <Activity size={22} className="text-white" />
                                    </div>
                                    <span className="font-extrabold text-xl text-slate-900 tracking-tight">Medi<span className="text-indigo-600">Connect</span></span>
                                </div>
                                <button onClick={() => setIsMobileOpen(false)} className="text-slate-400">
                                    <X size={24} />
                                </button>
                            </div>
                            <nav className="flex-1 py-6 px-4 space-y-2">
                                {navItems.map((item) => (
                                    <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                                        <div className={`flex items-center px-4 py-3 rounded-xl transition-all ${pathname === item.href ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                                            <item.icon size={22} className={pathname === item.href ? 'text-indigo-600' : 'text-slate-400'} />
                                            <span className="ml-3 font-medium">{item.name}</span>
                                        </div>
                                    </Link>
                                ))}
                            </nav>
                            <div className="p-4 border-t border-slate-100">
                                <button onClick={() => logout()} className="flex items-center w-full px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
                                    <LogOut size={22} />
                                    <span className="ml-3 font-medium">Sign Out</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto relative z-10 w-full md:pl-0 h-screen">
                {/* Mobile Header */}
                <div className="md:hidden h-20 bg-white/70 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-6 sticky top-0 z-20">
                    <button onClick={() => setIsMobileOpen(true)} className="text-slate-700">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-slate-900 drop-shadow-sm">Admin Portal</span>
                    <div className="w-8" /> {/* Spacer */}
                </div>

                <div className="p-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
