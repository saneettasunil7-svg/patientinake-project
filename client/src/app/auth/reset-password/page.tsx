"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ArrowRight, Activity, Shield, CheckCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();

    const handleStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to reset password');
            }

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-slate-50 selection:bg-sky-100 font-sans">
            {/* Hospital Background Image */}
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.04] grayscale mix-blend-multiply transition-opacity duration-1000"
                style={{
                    backgroundImage: "url('/images/hospital_bg.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />

            {/* Background pattern/gradient */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-sky-100/50 via-white to-white" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white overflow-hidden">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 text-white"
                        >
                            <Shield size={32} strokeWidth={2.5} />
                        </motion.div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            Reset Password
                        </h2>
                        <p className="text-slate-500 mt-3 font-medium">
                            {isSuccess ? 'Password reset complete' : step === 1 ? 'Find your account' : 'Set your new password'}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-8"
                            >
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                                    <CheckCircle size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Successfully Reset!</h3>
                                <p className="text-slate-500 mt-2">Redirecting you to login...</p>
                            </motion.div>
                        ) : step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                                onSubmit={handleStep1}
                            >
                                <div className="space-y-1.5">
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                                        <input
                                            type="email"
                                            required
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    className="group relative w-full flex justify-center items-center py-4 px-6 rounded-2xl text-lg font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none transition-all shadow-xl"
                                >
                                    Next Step
                                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} strokeWidth={2.5} />
                                </motion.button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                                onSubmit={handleStep2}
                            >
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                                        <input
                                            type="password"
                                            required
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold"
                                            placeholder="New Password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                                        <input
                                            type="password"
                                            required
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold"
                                            placeholder="Confirm New Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-1/3 flex items-center justify-center p-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-2/3 flex justify-center items-center py-4 px-6 rounded-2xl font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition-all shadow-xl"
                                    >
                                        {isLoading ? <Activity className="animate-spin" size={20} /> : 'Reset Now'}
                                    </motion.button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Back to Login */}
                    {!isSuccess && (
                        <div className="mt-10 text-center">
                            <Link
                                href="/auth/login"
                                className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1"
                            >
                                <ChevronLeft size={14} /> Back to Sign in
                            </Link>
                        </div>
                    )}
                </div>

                {/* Footer Link */}
                <p className="text-center mt-8 text-slate-400 text-sm font-medium">
                    &copy; {new Date().getFullYear()} Patient Intake. Secure Access.
                </p>
            </motion.div>
        </div>
    );
}
