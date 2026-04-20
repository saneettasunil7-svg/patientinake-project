"use client";

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Users, Clock, AlertCircle, Download, FileText } from 'lucide-react';

interface ReportItem {
    id: number;
    patient_id: number;
    patient_name: string;
    type: string;
    time_str: string;
    status: string;
    notes?: string;
    created_at: string;
    is_emergency: boolean;
}

interface DailyReport {
    date: string;
    total_patients: number;
    total_appointments: number;
    total_walk_ins: number;
    total_emergencies: number;
    avg_wait_minutes: number;
    items: ReportItem[];
}

export default function DoctorReportsPage() {
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReport(selectedDate);
    }, [selectedDate]);

    const fetchReport = async (dateStr: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${getApiBaseUrl()}/doctors/me/daily-report?date_str=${dateStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setReport(data);
            } else {
                const errData = await response.json();
                setError(errData.detail || 'Failed to fetch report');
            }
        } catch (err) {
            setError('Network Error. Could not connect to backend.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!report) return;

        const headers = ['Time', 'Patient Name', 'Type', 'Status', 'Emergency', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...report.items.map(item =>
                `${item.time_str},"${item.patient_name}","${item.type.replace('_', ' ')}","${item.status}",${item.is_emergency ? 'Yes' : 'No'},"${item.notes || ''}"`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `daily_report_${report.date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-800">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-sky-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-teal-100/50 rounded-full blur-[100px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl font-black mb-2 text-slate-900 tracking-tight">Daily Manifest</h1>
                        <p className="text-slate-500 font-medium">Review patient visits and detailed metrics</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-sm"
                    >
                        <div className="flex items-center bg-slate-100 px-4 py-2 rounded-xl text-slate-700">
                            <CalendarIcon size={18} className="mr-2 text-sky-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-black text-slate-800 cursor-pointer"
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            disabled={!report || report.items.length === 0}
                            className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl flex items-center transition-colors shadow-sm"
                        >
                            <Download size={18} className="mr-2" /> Export CSV
                        </button>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
                        <AlertCircle className="inline-block mr-2" /> {error}
                    </div>
                ) : report ? (
                    <>
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            <StatCard title="Total Patients" value={report.total_patients} icon={<Users />} color="bg-indigo-50 border-indigo-100 text-indigo-600" />
                            <StatCard title="Appointments" value={report.total_appointments} icon={<CalendarIcon />} color="bg-sky-50 border-sky-100 text-sky-600" />
                            <StatCard title="Walk-ins" value={report.total_walk_ins} icon={<Users />} color="bg-teal-50 border-teal-100 text-teal-600" />
                            <StatCard title="Emergencies" value={report.total_emergencies} icon={<AlertCircle />} color="bg-red-50 border-red-100 text-red-600" />
                            <StatCard title="Avg Wait" value={report.avg_wait_minutes} suffix="m" icon={<Clock />} color="bg-amber-50 border-amber-100 text-amber-600" />
                        </div>

                        {/* Data Table */}
                        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden relative">
                            {report.items.length === 0 ? (
                                <div className="p-16 text-center text-slate-400 font-medium">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    No records found for {report.date}.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100 bg-slate-50/50 uppercase text-[10px] font-black tracking-widest text-slate-400">
                                                <th className="px-6 py-4">Time</th>
                                                <th className="px-6 py-4">Patient Name</th>
                                                <th className="px-6 py-4">Visit Type</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.items.map((item, idx) => (
                                                <tr key={`${item.type}-${item.id}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4 font-black text-slate-700 whitespace-nowrap">
                                                        {item.time_str}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">
                                                        {item.patient_name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.type === 'appointment' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                                                            }`}>
                                                            {item.type.replace('_', ' ')}
                                                        </span>
                                                        {item.is_emergency && (
                                                            <span className="ml-2 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600">
                                                                SOS
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${item.status === 'completed' ? 'text-emerald-600 bg-emerald-50' :
                                                            item.status === 'in_progress' ? 'text-sky-600 bg-sky-50' :
                                                                item.status === 'cancelled' ? 'text-red-600 bg-red-50' :
                                                                    'text-amber-600 bg-amber-50'
                                                            }`}>
                                                            {item.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={item.notes || ''}>
                                                        {item.notes || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}

function StatCard({ title, value, suffix = '', icon, color }: { title: string, value: number | string, suffix?: string, icon: any, color: string }) {
    return (
        <div className={`p-6 rounded-[1.5rem] border backdrop-blur-md flex flex-col items-start ${color}`}>
            <div className="mb-4 opacity-80">{icon}</div>
            <div className="text-3xl font-black mb-1">{value}{suffix}</div>
            <div className="text-xs uppercase font-black tracking-widest opacity-70">{title}</div>
        </div>
    );
}
