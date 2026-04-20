"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { ArrowLeft, Calendar, Clock, AlertCircle, Save } from 'lucide-react';
import Link from 'next/link';

export default function ReschedulePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const [appointment, setAppointment] = useState<any>(null);
    const [newDate, setNewDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !id) return;

        // We fetch all appointments and find the one matching ID because there isn't a single fetch endpoint yet
        // Optimization: Ideally implement GET /appointments/{id}
        const fetchAppt = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${getApiBaseUrl()}/appointments/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const appt = data.find((a: any) => a.id.toString() === id);
                    if (appt) {
                        setAppointment(appt);
                        // Pre-fill date (convert to input format YYYY-MM-DDTHH:mm)
                        const d = new Date(appt.appointment_date);
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        setNewDate(d.toISOString().slice(0, 16));
                    } else {
                        setError('Appointment not found');
                    }
                } else {
                    setError('Failed to fetch appointments');
                }
            } catch (e) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        fetchAppt();
    }, [user, id]);

    const handleReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${getApiBaseUrl()}/appointments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    appointment_date: newDate
                })
            });

            if (res.ok) {
                router.push('/patient/dashboard');
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to reschedule');
            }
        } catch (e) {
            setError('Network error during update');
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

    if (error || !appointment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error || "Appointment not found"}</p>
                    <Link href="/patient/dashboard" className="px-6 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 font-bold text-slate-700">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center">
                    <Link href="/patient/dashboard" className="flex items-center text-slate-500 hover:text-sky-600 font-medium">
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Dashboard
                    </Link>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-sky-50 p-8 border-b border-sky-100">
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Reschedule Appointment</h1>
                        <p className="text-slate-600">Update your appointment time with <span className="font-bold text-sky-700">{appointment.doctor_name}</span></p>
                    </div>

                    <div className="p-8">
                        <div className="flex items-start space-x-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="p-3 bg-white rounded-lg shadow-sm text-sky-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Time</p>
                                <p className="text-lg font-bold text-slate-800">
                                    {new Date(appointment.appointment_date).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleReschedule} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select New Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-lg font-medium"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-200 transition-all flex items-center justify-center space-x-2"
                            >
                                {submitting ? (
                                    <span>Updating...</span>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Confirm Reschedule</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
