"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, Activity, Shield, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', email.trim());
            formData.append('password', password.trim());

            const res = await fetch(`${getApiBaseUrl()}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('Invalid email or password');
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || `Login failed (Status: ${res.status})`);
            }

            const { access_token } = await res.json();
            localStorage.setItem('token', access_token); // Set it early for the booking call

            const userRes = await fetch(`${getApiBaseUrl()}/users/me`, {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            if (!userRes.ok) throw new Error('Failed to fetch user profile');
            const userData = await userRes.json();

            // AUTO-BOOKING LOGIC
            const pending = localStorage.getItem('pendingAppointment');
            if (pending && userData.role === 'patient') {
                try {
                    const apptData = JSON.parse(pending);
                    await fetch(`${getApiBaseUrl()}/appointments/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${access_token}`
                        },
                        body: JSON.stringify({
                            doctor_id: apptData.doctorId,
                            appointment_date: apptData.date,
                            notes: `Booked via guest flow (Login). (Mobile: ${apptData.mobile})`
                        })
                    });
                    localStorage.removeItem('pendingAppointment');
                    // We'll redirect to a specific tab
                    login(access_token, userData);
                    router.push('/patient/dashboard?tab=appointments');
                    return;
                } catch (e) {
                    console.error("Auto-booking on login failed", e);
                }
            }

            login(access_token, userData);
        } catch (err: any) {
            if (err.message === 'Failed to fetch' || err.message === 'Network Error') {
                setError('Cannot reach server. Please ensure the backend is running and you have accepted the security certificate.');
            } else {
                setError(err.message || 'An unexpected error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 selection:bg-sky-100 font-sans overflow-hidden">

            {/* Hospital Top Contact Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/40 backdrop-blur-md text-white py-2 px-6 text-[10px] font-bold uppercase tracking-[0.2em] flex justify-between items-center border-b border-white/10">
                <div className="flex items-center space-x-3">
                    <Activity size={12} className="text-sky-400" />
                    <span className="opacity-80">Medi-Connect Portal</span>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sky-400">Emergency: +1 (800) MEDI-CARE</span>
                    <div className="w-1 h-1 rounded-full bg-sky-500 animate-pulse" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-[900px] flex flex-col md:flex-row items-stretch justify-center gap-0 overflow-hidden rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.3)] border border-white/20 bg-white/10 backdrop-blur-2xl"
            >
                {/* Visual Side (Fingerprint Sensor) */}
                <div className="hidden md:flex flex-col items-center justify-center w-[400px] p-12 bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-r border-white/10">
                    <div className="relative group cursor-pointer mb-8">
                        {/* Fingerprint Scanning Animation */}
                        <div className="absolute inset-0 bg-sky-500/20 rounded-full blur-2xl group-hover:bg-sky-400/40 transition-all duration-500" />
                        <div className="relative w-48 h-48 rounded-full border-2 border-sky-400/30 flex items-center justify-center overflow-hidden">
                            {/* Scanning line */}
                            <motion.div
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400/80 to-transparent z-20"
                            />
                            {/* Fingerprint Icon Overlay */}
                            <div className="p-8 text-sky-400 group-hover:scale-110 transition-transform duration-500">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-32 h-32 opacity-80">
                                    <path d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12" />
                                    <path d="M5 15.5C5 12.5 7.5 10 10.5 10C13.5 10 16 12.5 16 15.5" />
                                    <path d="M8 18C8 16 10 14 12.5 14C15 14 17 16 17 18" />
                                    <path d="M12 22V20" />
                                    <path d="M11 7C11 7 12 6 13.5 6C15 6 16 7 16 7" />
                                    <path d="M9 12C9 12 10 11 11.5 11C13 11 14 12 14 12" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-widest">
                            Biometric Encrypted
                        </div>
                        <h3 className="text-2xl font-black text-black tracking-tight">User Login</h3>
                        <p className="text-slate-700 text-sm font-medium leading-relaxed px-8">
                            Advanced secure access for medical professionals & patients
                        </p>
                    </div>
                </div>

                {/* Form Side */}
                <div className="flex-1 p-8 md:p-14 bg-white">
                    {/* Header mobile only */}
                    <div className="md:hidden text-center mb-10">
                        <div className="w-16 h-16 bg-sky-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-sky-400">
                            <Activity size={32} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-black text-black tracking-tight">User Login</h2>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Email */}
                        <div className="space-y-4">
                            <div className="group relative">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-sky-600/50 group-focus-within:text-sky-600 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-black placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold"
                                    placeholder="Username or Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* Password */}
                            <div className="group relative">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-sky-600/50 group-focus-within:text-sky-600 transition-colors" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-14 text-black placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-sky-600/50 hover:text-sky-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input type="checkbox" className="peer sr-only" />
                                    <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-all" />
                                    <CheckMarkIcon />
                                </div>
                                <span className="text-xs text-slate-600 group-hover:text-black transition-colors">Keep me logged in for 7 days</span>
                            </label>
                            <Link
                                href="/auth/reset-password"
                                className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors tracking-wide underline decoration-sky-600/20 underline-offset-4"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Error Msg */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-medium backdrop-blur-md"
                            >
                                <div className="flex items-center gap-3">
                                    <Activity size={14} className="animate-pulse" />
                                    <span>{error}</span>
                                </div>
                            </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: "rgba(14, 165, 233, 0.95)" }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-sky-600/90 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-sky-600/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Activity className="animate-spin mx-auto" size={18} /> : 'Log in'}
                            </motion.button>
                            <Link
                                href="/"
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-center py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] border border-slate-200 transition-all"
                            >
                                Cancel
                            </Link>
                        </div>

                        {/* Register Link */}
                        <div className="pt-6 text-center">
                            <p className="text-slate-500 text-xs font-medium">
                                Don't have an account?{' '}
                                <Link href="/auth/register" className="text-sky-600 font-black hover:text-sky-700 transition-colors tracking-wider ml-1">
                                    CREATE ONE
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </motion.div>

            {/* Futuristic Details */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 select-none pointer-events-none">
                <span className="flex items-center gap-2">
                    <Shield size={10} /> Secure Layer v4.2
                </span>
                <span className="hidden sm:inline">256-bit AES Encryption</span>
                <span>&copy; {new Date().getFullYear()} Medi-Connect</span>
            </div>
        </div>
    );
}

function CheckMarkIcon() {
    return (
        <svg
            className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="4"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}
