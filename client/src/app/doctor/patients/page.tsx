"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Activity, ArrowLeft, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

interface Patient {
    id: number;
    full_name: string;
    email: string;
    gender: string | null;
    blood_group: string | null;
    last_visit: string;
}

export default function DoctorPatientsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) router.push('/auth/login');
        if (user && user.role !== 'doctor') router.push('/auth/login');
        if (user) fetchPatients();
    }, [user, isLoading, router]);

    const fetchPatients = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/doctors/me/patients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPatients(await res.json());
            }
        } catch (e) { console.error("Failed to fetch patients", e); }
        setLoading(false);
    };

    const filteredPatients = patients.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (isoStr: string) => {
        if (!isoStr) return "Never";
        return new Date(isoStr).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <Link href="/doctor/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Patients</h1>
                        <p className="text-sm font-medium text-slate-500">Total {patients.length} unique patients seen</p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search / Filters */}
                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Patient Grid */}
                {filteredPatients.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Users size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">No patients found</h3>
                        <p className="text-slate-500">Could not find any patients matching your search criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPatients.map((patient, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={patient.id}
                                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all group"
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl flex items-center justify-center text-sky-600 font-black text-xl shadow-inner border border-sky-100 group-hover:scale-110 transition-transform">
                                        {patient.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-800 truncate">{patient.full_name}</h3>
                                        <div className="flex items-center text-sm text-slate-500 mt-0.5">
                                            <Mail size={12} className="mr-1.5 opacity-70" />
                                            <span className="truncate">{patient.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                                            <Users size={10} className="mr-1" /> Gender
                                        </div>
                                        <div className="text-sm font-bold text-slate-700">{patient.gender || '—'}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                                            <Activity size={10} className="mr-1 text-red-400" /> Blood Group
                                        </div>
                                        <div className="text-sm font-bold text-slate-700">{patient.blood_group || '—'}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center">
                                            <Calendar size={10} className="mr-1" /> Last Visit
                                        </span>
                                        <span className="text-xs font-bold text-slate-700">{formatDate(patient.last_visit)}</span>
                                    </div>
                                    <Link
                                        href={`/doctor/prescriptions?patient=${patient.id}`}
                                        className="w-10 h-10 bg-slate-50 text-sky-600 rounded-xl flex items-center justify-center hover:bg-sky-50 hover:scale-105 transition-all"
                                        title="View Prescriptions"
                                    >
                                        <FileText size={16} />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
