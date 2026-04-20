"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Activity, Users, BarChart3, Settings, LogOut, Shield, FileSpreadsheet } from 'lucide-react';

export default function AdminDashboard() {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();

    // Auth check handled by layout

    return (
        <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-[calc(100vh-80px)] overflow-auto">
            <div className="mb-12 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-xl">
                <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-md">Admin Dashboard</h1>
                <p className="text-slate-200">System overview and hospital management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <DashboardCard
                    icon={<Users className="text-indigo-600" />}
                    title="Doctor Management"
                    desc="Add, verify, and update doctor profiles"
                    action="Manage Doctors"
                    onClick={() => router.push('/admin/doctors')}
                    color="indigo"
                />

                <DashboardCard
                    icon={<Shield className="text-purple-600" />}
                    title="Policy Management"
                    desc="Create and update system guidelines"
                    action="Manage Policies"
                    onClick={() => router.push('/admin/policies')}
                    color="purple"
                />

                <DashboardCard
                    icon={<Activity className="text-pink-600" />}
                    title="Audit Logs"
                    desc="Track admin actions and system security"
                    action="View Logs"
                    onClick={() => router.push('/admin/audit-logs')}
                    color="pink"
                />

                <DashboardCard
                    icon={<Activity className="text-red-600" />}
                    title="Ambulance Management"
                    desc="Manage emergency dispatch agencies and fleet"
                    action="Manage Ambulances"
                    onClick={() => router.push('/admin/agencies')}
                    color="pink"
                />

                <DashboardCard
                    icon={<BarChart3 className="text-sky-600" />}
                    title="System Reports"
                    desc="View platform performance statistics"
                    action="View Reports"
                    onClick={() => router.push('/admin/reports')}
                    color="indigo"
                />

                <DashboardCard
                    icon={<FileSpreadsheet className="text-emerald-600" />}
                    title="Export Appointments"
                    desc="Download all doctor appointments with patient details as Excel"
                    action="Download Excel"
                    onClick={async () => {
                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${getApiBaseUrl()}/admin/export/appointments`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) {
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `appointments_${new Date().toISOString().slice(0, 10)}.xlsx`;
                                a.click();
                                URL.revokeObjectURL(url);
                            } else {
                                const errText = await res.text();
                                alert(`Export failed (${res.status}): ${errText}`);
                            }
                        } catch (e: any) {
                            alert(`Network error during export: ${e.message}`);
                        }
                    }}
                    color="emerald"
                />
            </div>
        </main>
    );
}

function DashboardCard({ icon, title, desc, action, onClick, color }: { icon: any, title: string, desc: string, action: string, onClick: () => void, color: string }) {
    const colorClasses: any = {
        indigo: "group-hover:text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100",
        purple: "group-hover:text-purple-600 bg-purple-50 group-hover:bg-purple-100",
        pink: "group-hover:text-pink-600 bg-pink-50 group-hover:bg-pink-100",
        emerald: "group-hover:text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100"
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            onClick={onClick}
            className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/40 shadow-xl hover:shadow-2xl transition-all cursor-pointer group hover:bg-white"
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-inner ${colorClasses[color]}`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-900">{title}</h3>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">{desc}</p>
            <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                {action} <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </div>
        </motion.div>
    );
}

