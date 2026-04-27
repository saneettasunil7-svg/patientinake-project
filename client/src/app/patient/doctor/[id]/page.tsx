"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Activity, Calendar, Clock, ArrowLeft, Video, CheckCircle, AlertCircle, Stethoscope, Mail, Hash, Users } from 'lucide-react';
import Link from 'next/link';
import ChatBox from '@/components/ChatBox';

export default function DoctorDetailsPage() {
    const { user, token: authToken, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const doctorId = params.id;
    const autoJoin = searchParams.get('autoJoin') === 'true';

    const [doctor, setDoctor] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Queue State
    const [tokenStatus, setTokenStatus] = useState<any | null>(null);
    const [queuePosition, setQueuePosition] = useState<any | null>(null);
    const [isRequestingToken, setIsRequestingToken] = useState(false);
    const [autoJoined, setAutoJoined] = useState(false);

    // --- NEW CONNECTIVITY CHECK ---
    const [connectivityError, setConnectivityError] = useState<string | null>(null);

    useEffect(() => {
        // Immediate check on mount
        checkConnectivity();
    }, []);

    const checkConnectivity = async () => {
        try {
            console.log(`Checking connectivity to: ${getApiBaseUrl()}`);
            const res = await fetch(`${getApiBaseUrl()}/`, { method: 'GET' }); // Simple root check
            if (!res.ok) {
                console.warn("Root connectivity check failed", res.status);
            } else {
                console.log("Root connectivity check PASSED");
            }
        } catch (e) {
            console.error("Connectivity check failed completely:", e);
            setConnectivityError('Unable to connect to server. Please accept the certificate.');
        }
    };
    // ------------------------------

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/auth/login');
        } else if (user.role !== 'patient') {
            router.push('/auth/login');
        } else if (doctorId) {
            fetchDoctorDetails();
            checkTokenStatus();
        }
    }, [user, authLoading, doctorId, router]);

    // Auto-join logic
    const [hasCheckedToken, setHasCheckedToken] = useState(false);

    useEffect(() => {
        if (autoJoin && !autoJoined && doctor && !authLoading && hasCheckedToken && tokenStatus === null && !isRequestingToken) {
            console.log("Auto-joining queue as requested...");
            setAutoJoined(true);
            requestToken();
        }
    }, [autoJoin, autoJoined, doctor, authLoading, hasCheckedToken, tokenStatus, isRequestingToken]);

    const handleMainAction = () => {
        if (!tokenStatus) {
            requestToken();
            return;
        }

        if (tokenStatus.payment_status !== 'completed') {
            router.push(`/patient/payment?tokenId=${tokenStatus.id}&doctorId=${doctorId}`);
            return;
        }

        if (tokenStatus.status === 'called' || tokenStatus.status === 'in_progress') {
            joinVideoCall();
            return;
        }
    };

    const joinVideoCall = async () => {
        if (!tokenStatus) return;
        const token = localStorage.getItem('token');
        try {
            const sessionResponse = await fetch(`${getApiBaseUrl()}/video/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token_id: tokenStatus.id })
            });

            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                router.push(`/video/${session.session_id}`);
            }
        } catch (error) {
            console.error('Error joining video call:', error);
        }
    };

    // Auto-refresh queue position every 3 seconds when patient has a token
    useEffect(() => {
        if (!tokenStatus || !doctorId) return;

        const interval = setInterval(() => {
            fetchQueuePosition();
            checkTokenStatus();
        }, 3000);

        return () => clearInterval(interval);
    }, [tokenStatus, doctorId]);

    const fetchDoctorDetails = async () => {
        if (!doctorId) return;

        const token = authToken || localStorage.getItem('token');
        setLoading(true);
        setError(null);

        try {
            // Validate ID format (should be numeric for our DB)
            const id = Array.isArray(doctorId) ? doctorId[0] : doctorId;
            if (isNaN(Number(id))) {
                throw new Error("Invalid Doctor ID");
            }

            // Fetch Profile
            const url = `${getApiBaseUrl()}/doctors/${id}`;
            console.log(`[DoctorDetails] Fetching: ${url}`);

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                // Fetch Schedule
                try {
                    const scheduleRes = await fetch(`${getApiBaseUrl()}/doctors/${id}/schedule`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (scheduleRes.ok) {
                        const scheduleData = await scheduleRes.json();
                        // Filter for today's schedule
                        const today = new Date().getDay(); // 0 is Sunday, 6 is Saturday
                        // Map JS getDay (0=Sun) to our backend (0=Mon, 6=Sun) if needed
                        // Backend uses 0=Monday, 6=Sunday
                        // JS: 0=Sun, 1=Mon ... 6=Sat
                        // Mapping: (jsDay + 6) % 7
                        const backendDay = (today + 6) % 7;

                        data.full_schedule = scheduleData;
                    }
                } catch (schedErr) {
                    console.error("Failed to fetch schedule details", schedErr);
                }

                setDoctor(data);
            } else {
                console.error(`[DoctorDetails] Backend returned ${res.status}`);
                if (res.status === 401) {
                    // Session expired
                    router.push('/auth/login');
                    return;
                }
                if (res.status === 404) setError('Doctor not found');
                else setError(`Server error: ${res.status}`);
            }
        } catch (err: any) {
            console.error('[DoctorDetails] Network/Fetch Error:', err);
            if (err.message === 'Failed to fetch') {
                setError(`Failed to connect to backend at ${getApiBaseUrl()}. Please click the button below to accept the security certificate.`);
            } else {
                setError(err.message || 'network-error');
            }
        } finally {
            setLoading(false);
        }
    };

    const isCurrentSlot = (slot: any) => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = slot.start_time.split(':').map(Number);
        const [endH, endM] = slot.end_time.split(':').map(Number);

        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        return currentTime >= startTime && currentTime < endTime;
    };

    // Modified fetchDoctorDetails above to include:
    /*
            if (res.ok) {
                const data = await res.json();
                setDoctor(data);
            } else {
                console.error(`[DoctorDetails] Backend returned ${res.status}`);
                if (res.status === 401) {
                    alert('Session expired. Please log in again.');
                    router.push('/auth/login');
                    return;
                }
                if (res.status === 404) setError('Doctor not found');
                else setError(`Server error: ${res.status}`);
            }
    */

    const checkTokenStatus = async () => {
        const token = authToken || localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/my-active/token`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTokenStatus(data);
                // Fetch queue position if we have a token
                if (data && doctorId) {
                    fetchQueuePosition();
                }
            } else if (res.status === 404) {
                setTokenStatus(null);
                setQueuePosition(null);
            }
        } catch (error: any) {
            console.error('Error checking token:', error);
            if (error.message === 'Failed to fetch') {
                setError(`Failed to connect to backend. Please verify your secure connection at ${getApiBaseUrl()}/docs`);
            }
        } finally {
            setHasCheckedToken(true);
        }
    };

    const fetchQueuePosition = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/my-position/${doctorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQueuePosition(data);
            } else if (res.status === 404) {
                setQueuePosition(null);
            }
        } catch (error: any) {
            console.error('Error fetching queue position:', error);
            if (error.message === 'Failed to fetch') {
                setError(`Failed to connect to backend for queue data. URL: ${getApiBaseUrl()}`);
            }
        }
    };



    const requestToken = async () => {
        if (!doctor) return;
        setIsRequestingToken(true);
        const token = localStorage.getItem('token');

        try {
            // 1. Request Token (Join Queue)
            const response = await fetch(`${getApiBaseUrl()}/tokens/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ doctor_id: parseInt(doctorId as string) })
            });

            if (response.ok) {
                const tokenData = await response.json();

                // Redirect to payment page instead of creating session immediately
                router.push(`/patient/payment?tokenId=${tokenData.id}&doctorId=${doctorId}`);
            } else {
                const err = await response.json();
                alert(`Failed to join queue: ${err.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error requesting token:', error);
            alert('Network Error');
        } finally {
            setIsRequestingToken(false);
        }
    };

    if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">Loading Doctor Profile...</div>;

    const backendUrl = getApiBaseUrl();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Failed</h2>
                    <p className="text-slate-600 mb-2">Could not reach the backend.</p>
                    <div className="bg-red-50 p-2 rounded text-left text-xs font-mono text-red-600 mb-4 overflow-auto max-h-24">
                        {connectivityError || error || "Unknown Error"}
                    </div>
                    <p className="text-sm text-slate-500 mb-4 font-mono bg-slate-50 p-2 rounded break-all">{backendUrl}</p>
                    <a
                        href={`${backendUrl}/docs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors"
                    >
                        Accept Certificate for Backend
                    </a>
                    <p className="text-xs text-slate-500 mt-3">
                        Click above → "Advanced" → "Proceed to {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}"
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Then refresh this page</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => router.push('/patient/dashboard')}
                        className="mt-2 text-slate-400 hover:text-slate-600 font-medium text-sm"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!doctor) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-sky-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-teal-100/50 rounded-full blur-[100px]" />
            </div>

            <nav className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link href="/patient/dashboard" className="flex items-center space-x-2 text-slate-600 hover:text-sky-600 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back to Dashboard</span>
                        </Link>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                                <Activity size={16} />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-slate-900">Medi<span className="text-sky-600">Connect</span></span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Doctor Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-1"
                    >
                        <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/50 shadow-2xl text-center relative overflow-hidden group">
                            {/* Decorative Elements */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-400/10 rounded-full blur-3xl group-hover:bg-sky-400/20 transition-all duration-700" />
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-sky-50/50 to-transparent -z-10" />

                            <div className="relative mb-8">
                                <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200 mx-auto flex items-center justify-center border-4 border-white shadow-xl overflow-hidden transform group-hover:scale-105 transition-all duration-500">
                                    {doctor.profile_photo ? (
                                        <img src={getApiBaseUrl() + doctor.profile_photo} alt={doctor.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl font-black text-sky-600 italic tracking-tighter">{doctor.full_name?.charAt(0) || 'D'}</span>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                                    <CheckCircle size={20} />
                                </div>
                            </div>

                            <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">{doctor.full_name}</h1>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Medical Specialist</p>

                            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2 rounded-2xl text-sm font-black shadow-lg shadow-sky-500/30 mb-8 uppercase tracking-widest">
                                <Stethoscope size={16} />
                                <span>{doctor.specialization || 'General Consultation'}</span>
                            </div>

                            <div className="space-y-4 text-left bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                <div className="flex items-center space-x-4 text-slate-600 group/item">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-sky-500 group-hover/item:bg-sky-500 group-hover/item:text-white transition-all">
                                        <Mail size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Email</p>
                                        <p className="font-bold text-sm truncate">{doctor.email}</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">About Doctor</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {doctor.bio || "No biography available for this doctor."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Actions Area */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Option 1: Live Consultation */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/50 shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000 -rotate-12 pointer-events-none">
                                <Activity size={250} className="text-sky-600" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3 animate-ping" />
                                            Clinical Enrollment
                                        </h2>
                                        <p className="text-slate-500 font-medium text-sm mt-1">Join the real-time queue for an immediate video consultation.</p>
                                    </div>
                                    <div className="hidden sm:block">
                                        {doctor.is_available ? (
                                            <span className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                                Active Online
                                            </span>
                                        ) : (
                                            <span className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest border border-slate-200 flex items-center">
                                                <span className="w-2 h-2 rounded-full bg-slate-400 mr-2" />
                                                Currently Away
                                            </span>
                                        )}
                                    </div>
                                </div>                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                    {/* Operational Hours */}
                                    <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm">
                                        <h3 className="text-[10px] font-black text-slate-400 mb-6 flex items-center uppercase tracking-[0.2em]">
                                            <Clock size={14} className="mr-2 text-sky-500" strokeWidth={3} />
                                            Operational Hours
                                        </h3>
                                        <div className="space-y-4">
                                            {(() => {
                                                const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                                                return days.map((day, index) => {
                                                    const slots = doctor.full_schedule?.filter((s: any) => s.day_of_week === index && s.is_active) || [];
                                                    const isToday = (new Date().getDay() + 6) % 7 === index;
                                                    
                                                    return (
                                                        <div key={day} className="flex items-center justify-between">
                                                            <span className={`text-[10px] font-black tracking-widest ${isToday ? 'text-sky-600' : 'text-slate-400'}`}>
                                                                {day}
                                                            </span>
                                                            <div className="flex gap-2 flex-wrap justify-end max-w-[150px]">
                                                                {slots.length > 0 ? slots.slice(0, 3).map((s: any, idx: number) => (
                                                                    <span key={idx} className="text-[9px] font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-600">
                                                                        {s.start_time.substring(0, 5)}
                                                                    </span>
                                                                )) : (
                                                                    <span className="text-[9px] font-medium text-slate-300">--:--</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Token Reference Card (The Blue Card) */}
                                    <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group/token">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/token:scale-110 transition-transform duration-700">
                                            <Hash size={100} />
                                        </div>
                                        
                                        {tokenStatus ? (
                                            <div className="relative z-10 h-full flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Your Reference</p>
                                                    <p className="text-6xl font-black italic tracking-tighter">#{tokenStatus.token_number}</p>
                                                </div>
                                                <div className="mt-8 pt-6 border-t border-white/20">
                                                    <div className="flex justify-between text-xs font-bold mb-2">
                                                        <span className="opacity-70 font-medium">Pos in Queue</span>
                                                        <span className="text-sm">01</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="opacity-70 font-medium">Current Token</span>
                                                        <span className="text-sm">{tokenStatus.token_number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center opacity-40">
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-2">Reference Card</p>
                                                <p className="text-4xl font-black italic">#</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Orange Action Button */}
                                <button
                                    onClick={handleMainAction}
                                    disabled={!doctor.is_available || (!!tokenStatus && (tokenStatus.status === 'completed' || tokenStatus.status === 'expired') && tokenStatus.payment_status === 'completed') || isRequestingToken}
                                    className={`px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center space-x-3 w-full justify-center
                                        ${!doctor.is_available
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border-2 border-slate-100'
                                            : tokenStatus && tokenStatus.payment_status !== 'completed'
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 active:scale-95'
                                                : (tokenStatus?.status === 'called' || tokenStatus?.status === 'in_progress') && tokenStatus?.payment_status === 'completed'
                                                    ? 'bg-emerald-600 text-white shadow-emerald-500/30 animate-pulse ring-4 ring-emerald-500/20'
                                                    : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20 hover:scale-[1.01] active:scale-95'
                                        }`}
                                >
                                    {isRequestingToken ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Video size={20} />
                                    )}
                                    <span>
                                        {isRequestingToken ? 'Processing Enrollment...' :
                                            (tokenStatus?.status === 'called' || tokenStatus?.status === 'in_progress') && tokenStatus?.payment_status === 'completed' ? 'Join Video Call Now' :
                                                tokenStatus && tokenStatus.payment_status !== 'completed' ? 'Complete Payment to Proceed' :
                                                    tokenStatus ? `Active Enrollment: #${tokenStatus.token_number}` :
                                                        !doctor.is_available ? 'Specialist Offline' : 'Enroll in Queue Now'}
                                    </span>
                                </button>
                            </div>
                        </motion.div>

                        {/* Chat Box Enhancement */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative"
                        >
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg z-20 border-2 border-white">
                                Hospital Coordinates Only
                            </div>
                            <ChatBox
                                recipientId={doctor.user_id}
                                recipientName={doctor.full_name}
                                currentUserId={user?.id || 0}
                            />
                        </motion.div>

                    </div>
                </div>
            </main>

        </div>
    );
}
