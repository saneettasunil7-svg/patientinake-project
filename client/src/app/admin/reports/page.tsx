"use client";

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Users, Calendar } from 'lucide-react';

interface Stats {
    total_doctors: number;
    active_doctors: number;
    verified_doctors: number;
    total_patients: number;
    total_appointments: number;
}

export default function Reports() {
    const [stats, setStats] = useState<Stats | null>(null);

    // Auth check handled by layout

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/admin/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-teal-100/50 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-bold mb-2 text-slate-900">System Reports</h1>
                    <p className="text-slate-500">Overview of platform performance and statistics</p>
                </motion.div>

                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <StatsCard
                            title="Total Doctors"
                            value={stats.total_doctors}
                            desc={`${stats.active_doctors} Active • ${stats.verified_doctors} Verified`}
                            icon={<Users className="text-indigo-600" size={24} />}
                            color="indigo"
                        />
                        <StatsCard
                            title="Total Patients"
                            value={stats.total_patients}
                            desc="Registered platform users"
                            icon={<Users className="text-pink-600" size={24} />}
                            color="pink"
                        />
                        <StatsCard
                            title="Appointments"
                            value={stats.total_appointments}
                            desc="Total bookings processed"
                            icon={<Calendar className="text-sky-600" size={24} />}
                            color="sky"
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

function StatsCard({ title, value, desc, icon, color }: { title: string, value: number, desc: string, icon: any, color: string }) {
    const colorClasses: any = {
        indigo: "bg-indigo-50 text-indigo-600",
        pink: "bg-pink-50 text-pink-600",
        sky: "bg-sky-50 text-sky-600"
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 shadow-lg"
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colorClasses[color]}`}>
                {icon}
            </div>
            <h3 className="text-slate-500 font-medium mb-2">{title}</h3>
            <div className="text-4xl font-bold text-slate-900 mb-4">{value}</div>
            <p className="text-sm text-slate-400 font-medium bg-slate-50 inline-block px-3 py-1 rounded-lg">
                {desc}
            </p>
        </motion.div>
    );
}
