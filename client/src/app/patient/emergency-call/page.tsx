'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, PhoneOff, Video, Activity, User, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function EmergencyCallPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [tokenStatus, setTokenStatus] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const hasAutoJoined = useRef(false);

    // Auto-poll for status
    useEffect(() => {
        let failCount = 0;
        const checkStatus = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${getApiBaseUrl()}/tokens/my-active/token`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    failCount = 0;
                    const data = await res.json();
                    if (!data.is_emergency) {
                        router.push('/patient/dashboard'); // Not an emergency, go back
                        return;
                    }
                    setTokenStatus(data);

                    // Auto-join if doctor has accepted/called
                    if ((data.status === 'in_progress' || data.status === 'called') && !hasAutoJoined.current) {
                        hasAutoJoined.current = true;
                        joinVideoCall(data.id);
                    }
                } else {
                    // Increment fail count, only redirect after 3 consecutive failures
                    failCount++;
                    if (failCount >= 3) {
                        console.warn('Token not found or session ended, redirecting...');
                        router.push('/patient/dashboard');
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
                failCount++;
            }
        };

        const interval = setInterval(checkStatus, 1500); // Slightly slower polling to reduce server load
        checkStatus(); // Initial check

        return () => clearInterval(interval);
    }, [router]);

    const handleCancel = async () => {
        if (!tokenStatus) return;
        if (!confirm('Are you sure you want to cancel this EMERGENCY request?')) return;

        setIsCancelling(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/${tokenStatus.id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                router.push('/patient/dashboard');
            } else {
                setError('Failed to cancel');
            }
        } catch (e) {
            setError('Network error');
        } finally {
            setIsCancelling(false);
        }
    };

    const joinVideoCall = async (specificId?: number) => {
        const tokenId = specificId || tokenStatus?.id;
        if (!tokenId) return;

        const token = localStorage.getItem('token');
        try {
            const sessionResponse = await fetch(`${getApiBaseUrl()}/video/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token_id: tokenId })
            });

            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                router.push(`/video/${session.session_id}`);
            } else {
                const err = await sessionResponse.json();
                setError(err.detail || 'Failed to join session');
            }
        } catch (error: any) {
            setError('Connection error');
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden text-white font-sans">
            {/* Animated Background Layers */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-red-600/20 via-slate-900 to-slate-900" />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px]"
                />
            </div>

            <main className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
                {/* Header Signal */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center space-x-2 mb-12"
                >
                    <div className="flex space-x-1">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-red-500 rounded-full" />
                        <motion.div animate={{ height: [8, 16, 8] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }} className="w-1 bg-red-500 rounded-full" />
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }} className="w-1 bg-red-500 rounded-full" />
                    </div>
                    <span className="text-red-500 font-black uppercase tracking-[0.3em] text-xs">Emergency Department Signaling...</span>
                </motion.div>

                {/* Avatar Section */}
                <div className="relative mb-12">
                    <motion.div
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="w-40 h-40 bg-gradient-to-br from-red-500 to-rose-700 rounded-full p-1 shadow-2xl shadow-red-500/40"
                    >
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden border-4 border-slate-900 relative">
                            {tokenStatus?.doctor_name ? (
                                <div className="text-5xl font-black text-white">{tokenStatus.doctor_name.charAt(0)}</div>
                            ) : (
                                <User size={64} className="text-slate-700" />
                            )}
                            {/* Pulsing ring */}
                            <div className="absolute inset-0 border-4 border-red-500/30 rounded-full animate-ping" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-xl"
                    >
                        <Zap size={24} fill="currentColor" />
                    </motion.div>
                </div>

                {/* Main Content */}
                <div className="text-center mb-16 space-y-4">
                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-4xl font-black tracking-tight"
                    >
                        {tokenStatus?.doctor_name || "Finding Doctor..."}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-400 font-bold uppercase tracking-widest text-sm"
                    >
                        {tokenStatus?.doctor_specialization || "24/7 EMERGENCY DEPT"}
                    </motion.p>
                    <div className="pt-4">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 px-6 py-2 rounded-full inline-block"
                        >
                            <span className="text-sm font-medium text-slate-400">
                                {tokenStatus?.status === 'waiting' ? 'Connecting to emergency doctors...' : 'Ringing...'}
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full space-y-4">
                    <AnimatePresence>
                        {(tokenStatus?.status === 'called' || tokenStatus?.status === 'in_progress') && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => joinVideoCall()}
                                className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-emerald-500/40 transition-all active:scale-95 flex items-center justify-center space-x-4 mb-8"
                            >
                                <Video size={28} />
                                <span>Answer Call</span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="w-full py-5 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-[1.8rem] font-bold text-sm tracking-widest transition-all border border-white/5 hover:border-red-500/20 active:scale-95 flex items-center justify-center space-x-3 disabled:opacity-50"
                    >
                        <PhoneOff size={20} />
                        <span>{isCancelling ? 'Cancelling...' : 'End Emergency Call'}</span>
                    </button>
                </div>

                {/* Footer Assurance */}
                <div className="mt-12 flex items-center space-x-3 text-slate-500">
                    <Shield size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Secure End-to-End Consultation</span>
                </div>
            </main>

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center space-x-3 animate-bounce">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
