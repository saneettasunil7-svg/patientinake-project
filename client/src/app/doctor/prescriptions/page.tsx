"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, FileText, Calendar, User, Activity } from 'lucide-react';
import Link from 'next/link';

interface MedicalRecord {
    id: number;
    patient_id: number;
    doctor_id: number;
    appointment_id: number | null;
    diagnosis: string;
    treatment: string;
    prescription: string | null;
    created_at: string;
    patient_name: string;
}

import { Suspense } from 'react';

function PrescriptionsContent() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientFilterId = searchParams.get('patient');

    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) router.push('/auth/login');
        if (user && user.role !== 'doctor') router.push('/auth/login');
        if (user) fetchRecords();
    }, [user, isLoading, router]);

    const fetchRecords = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            // we use the generic medical-records endpoint which now returns records for the logged-in user
            const url = patientFilterId
                ? `${getApiBaseUrl()}/medical-records/patient/${patientFilterId}`
                : `${getApiBaseUrl()}/medical-records/`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                let data = await res.json();

                // If we used the patient filter, ensure we only see THIS doctor's records for that patient
                if (patientFilterId) {
                    data = data.filter((r: MedicalRecord) => r.doctor_id === user?.id);
                }

                setRecords(data);
            }
        } catch (e) { console.error("Failed to fetch records", e); }
        setLoading(false);
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r =>
            r.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.prescription?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [records, searchTerm]);

    const formatDate = (isoStr: string) => {
        return new Date(isoStr).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Prescriptions & Records</h1>
                            <p className="text-sm font-medium text-slate-500">
                                {patientFilterId ? `Filtered by specific patient (${records.length} records)` : `Total ${records.length} records written`}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search */}
                <div className="mb-8 relative max-w-lg">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by patient name, diagnosis, or meds..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all shadow-sm"
                    />
                </div>

                {/* Records List */}
                {filteredRecords.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">No records found</h3>
                        <p className="text-slate-500">You haven't written any prescriptions matching that search yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredRecords.map((record, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={record.id}
                                className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Patient</div>
                                                <div className="text-lg font-bold text-slate-800 leading-none">{record.patient_name}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <Activity size={12} className="text-red-400" /> Diagnosis
                                                </div>
                                                <div className="text-slate-700 font-medium">{record.diagnosis}</div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <FileText size={12} className="text-sky-500" /> Treatment
                                                </div>
                                                <div className="text-slate-700 font-medium">{record.treatment}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:w-1/3 flex flex-col justify-between">
                                        {record.prescription && (
                                            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 mb-4 h-full">
                                                <div className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2">Prescribed Medication</div>
                                                <div className="text-sky-900 font-medium whitespace-pre-wrap">{record.prescription}</div>
                                            </div>
                                        )}

                                        <div className="flex items-center text-xs font-bold text-slate-400 self-end mt-auto pt-2">
                                            <Calendar size={14} className="mr-1.5" />
                                            {formatDate(record.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function DoctorPrescriptionsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Prescriptions...</div>}>
            <PrescriptionsContent />
        </Suspense>
    );
}
