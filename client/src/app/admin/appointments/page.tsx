"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Calendar, User, UserCheck, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Appointment {
    id: number;
    patient_id: number;
    doctor_id: number | null;
    appointment_date: string;
    status: string;
    notes: string | null;
}

export default function AdminAppointments() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchAppointments();
        }
    }, [user]);

    const fetchAppointments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${getApiBaseUrl()}/admin/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    setError('Unauthorized or forbidden access to admin appointments');
                    return;
                }
                const errText = await response.text();
                setError(`Failed to fetch appointments: ${response.status} - ${errText}`);
                return;
            }

            const data = await response.json();
            setAppointments(data);
        } catch (err: any) {
            console.error('Error fetching appointments:', err);
            setError(err.message || 'Network error fetching appointments');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
            case 'scheduled':
                return 'bg-blue-50 text-blue-600 border border-blue-100';
            case 'pending':
                return 'bg-yellow-50 text-yellow-600 border border-yellow-100';
            case 'cancelled':
                return 'bg-red-50 text-red-600 border border-red-100';
            default:
                return 'bg-slate-50 text-slate-500 border border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle size={14} />;
            case 'cancelled': return <XCircle size={14} />;
            case 'scheduled': return <Calendar size={14} />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <div className="relative overflow-hidden min-h-screen">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-slate-900">All Appointments</h1>
                        <p className="text-slate-500">Overview of all system appointments and bookings.</p>
                    </div>

                    <div className="flex space-x-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => fetchAppointments()}
                            className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center"
                        >
                            Refresh
                        </motion.button>
                        <a
                            href={`${getApiBaseUrl()}/admin/export/appointments`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 font-bold shadow-lg shadow-indigo-500/25 text-white flex items-center"
                            >
                                <FileText size={20} className="mr-2" />
                                Export Excel
                            </motion.button>
                        </a>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <XCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient ID</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor ID</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {appointments.map((apt, index) => (
                                        <motion.tr
                                            key={apt.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="py-4 px-6 font-medium text-slate-900">#{apt.id}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center text-slate-600 font-medium">
                                                    <User size={16} className="mr-2 text-slate-400" />
                                                    Patient #{apt.patient_id}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {apt.doctor_id ? (
                                                    <div className="flex items-center text-indigo-600 font-medium">
                                                        <UserCheck size={16} className="mr-2 text-indigo-400" />
                                                        Doctor #{apt.doctor_id}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{formatDate(apt.appointment_date)}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(apt.status)}`}>
                                                    {getStatusIcon(apt.status)}
                                                    <span className="capitalize">{apt.status.replace('_', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-500 max-w-xs truncate">
                                                {apt.notes || <span className="italic text-slate-300">No notes</span>}
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {appointments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                                No appointments found in the system.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
