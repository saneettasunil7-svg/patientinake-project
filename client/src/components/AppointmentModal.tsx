"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, User, Phone, Mail, ChevronRight, CheckCircle, Stethoscope, ChevronLeft, Loader2, Lock, Eye, EyeOff, ArrowRight, CreditCard, Landmark, Hash, MapPin as PinIcon } from "lucide-react";
import Link from "next/link";
import { getApiBaseUrl } from "@/utils/apiConfig";

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Doctor {
    id: number;
    full_name: string;
    specialization: string;
    is_available: boolean;
}

const getTodayStr = () => new Date().toISOString().split("T")[0];

export default function AppointmentModal({ open, onClose }: Props) {
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    // Doctors from DB
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [fetchError, setFetchError] = useState("");

    // Step 1 fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dob, setDob] = useState("");
    const [gender, setGender] = useState("");
    const [bloodGroup, setBloodGroup] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Step 2 fields
    const [speciality, setSpeciality] = useState("");
    const [doctorId, setDoctorId] = useState<number | "">("");
    const [date, setDate] = useState("");

    // Bank Details (New)
    const [upiId, setUpiId] = useState("");
    const [bankName, setBankName] = useState("");
    const [branchName, setBranchName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");

    // Derived data
    const specialities = Array.from(new Set(doctors.map((d) => d.specialization))).sort();
    const filteredDoctors = doctors.filter((d) => d.specialization === speciality);
    const selectedDoctor = doctors.find((d) => d.id === doctorId);

    // Fetch doctors when modal opens
    useEffect(() => {
        if (!open) return;
        setLoadingDoctors(true);
        setFetchError("");
        fetch(`${getApiBaseUrl()}/public/doctors`)
            .then((r) => r.json())
            .then((data) => { setDoctors(Array.isArray(data) ? data : []); })
            .catch(() => setFetchError("Could not load doctors. Please call our helpline."))
            .finally(() => setLoadingDoctors(false));
    }, [open]);

    const resetForm = () => {
        setStep(1); setSubmitted(false); setSubmitting(false); setSubmitError("");
        setFirstName(""); setLastName(""); setDob(""); setGender(""); setBloodGroup(""); setMobile(""); setEmail(""); setPassword(""); setShowPassword(false);
        setSpeciality(""); setDoctorId(""); setDate("");
        setUpiId(""); setBankName(""); setBranchName(""); setAccountNumber(""); setIfscCode("");
    };

    const handleClose = () => { resetForm(); onClose(); };

    const step1Valid = firstName && lastName && dob && gender && mobile && password.length >= 6;
    const step2Valid = upiId || (bankName && accountNumber && ifscCode); // At least UPI or Bank details
    const step3Valid = speciality && doctorId && date;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError("");
        try {
            const res = await fetch(`${getApiBaseUrl()}/public/book-appointment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    dob,
                    gender,
                    blood_group: bloodGroup,
                    mobile,
                    email,
                    password,
                    speciality,
                    doctor_id: doctorId,
                    appointment_date: date,
                    upi_id: upiId,
                    bank_name: bankName,
                    branch_name: branchName,
                    account_number: accountNumber,
                    ifsc_code: ifscCode,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 409) {
                    setSubmitError("This email is already registered. Please log in to book an appointment.");
                } else {
                    setSubmitError(data.detail || "Booking failed. Please try again.");
                }
                return;
            }
            setSubmitted(true);
        } catch {
            setSubmitError("Network error. Please check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 30 }}
                        transition={{ type: "spring", stiffness: 280, damping: 25 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h2 className="font-extrabold text-slate-800 text-lg leading-none">Book an Appointment</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Quick & easy – takes under 2 minutes</p>
                                    </div>
                                </div>
                                <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Step indicator */}
                            {!submitted && (
                                <div className="flex items-center mt-4 gap-2">
                                    {[1, 2].map((s) => (
                                        <React.Fragment key={s}>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${step === s ? "bg-sky-100 text-sky-700" : step > s ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black ${step === s ? "bg-sky-500 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"}`}>
                                                    {step > s ? "✓" : s}
                                                </span>
                                                {s === 1 ? "Info" : "Booking"}
                                            </div>
                                            {s < 2 && <div className="flex-1 h-px bg-slate-200" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {submitted ? (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle size={40} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Appointment Requested!</h3>
                                        <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                                            Thank you, <span className="font-semibold text-slate-700">{firstName} {lastName}</span>!<br />
                                            Your appointment has been requested. Your account is now ready—you can sign in to view your dashboard and track your status.
                                        </p>
                                        <p className="text-xs text-slate-400 mt-4 font-medium px-3 py-1 bg-slate-50 rounded-lg inline-block">Confirmation sent to: {mobile}</p>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={handleClose} className="flex-1 py-3.5 rounded-2xl bg-slate-50 text-slate-500 font-bold text-sm hover:bg-slate-100 transition-all">Later</button>
                                        <Link href="/auth/login" className="flex-[1.5] py-3.5 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white font-bold text-sm text-center shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 transition-all flex items-center justify-center gap-2" onClick={handleClose}>
                                            Sign in to Portal <ArrowRight size={18} />
                                        </Link>
                                    </div>
                                </motion.div>
                            ) : step === 1 ? (
                                <form onSubmit={(e) => { e.preventDefault(); if (step1Valid) setStep(2); }} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">First Name *</label>
                                            <div className="relative">
                                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="John"
                                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Last Name *</label>
                                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Doe"
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                                                <span>Date of Birth *</span>
                                                {dob && <span className="text-sky-600 font-black bg-sky-50 px-1.5 rounded">{Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)} yrs</span>}
                                            </label>
                                            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={getTodayStr()} required
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Gender *</label>
                                            <select value={gender} onChange={(e) => setGender(e.target.value)} required
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all bg-white">
                                                <option value="">Select</option>
                                                <option>Male</option><option>Female</option><option>Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Blood Group</label>
                                            <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all bg-white">
                                                <option value="">Select (Optional)</option>
                                                <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                                                <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Mobile Number *</label>
                                            <div className="relative">
                                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required placeholder="+91 98765"
                                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Email Address</label>
                                        <div className="relative">
                                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com"
                                                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Password *</label>
                                        <div className="relative">
                                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                placeholder="Min. 6 characters"
                                                className="w-full pl-8 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        {password.length > 0 && password.length < 6 && (
                                            <p className="text-[11px] text-red-400 mt-1 ml-1">Password must be at least 6 characters</p>
                                        )}
                                    </div>

                                    <button type="submit" disabled={!step1Valid}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-sky-500/20">
                                        Next: Booking <ChevronRight size={16} />
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Loading / Error */}
                                    {loadingDoctors && (
                                        <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
                                            <Loader2 size={18} className="animate-spin" /> Loading available doctors…
                                        </div>
                                    )}
                                    {fetchError && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{fetchError}</div>
                                    )}

                                    {!loadingDoctors && (
                                        <>
                                            {/* Speciality */}
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Speciality *</label>
                                                <div className="relative">
                                                    <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setDoctorId(""); }} required
                                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all bg-white">
                                                        <option value="">{specialities.length === 0 ? "No departments available" : "Choose a speciality"}</option>
                                                        {specialities.map((s) => <option key={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                {specialities.length === 0 && !fetchError && (
                                                    <p className="text-[11px] text-slate-400 mt-1 ml-1">No doctors are currently registered in the system.</p>
                                                )}
                                            </div>

                                            {/* Doctor */}
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Preferred Doctor *</label>
                                                <select value={doctorId} onChange={(e) => setDoctorId(Number(e.target.value) || "")} required disabled={!speciality}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all bg-white disabled:opacity-50">
                                                    <option value="">{speciality ? "Choose a doctor" : "Select speciality first"}</option>
                                                    {filteredDoctors.map((d) => (
                                                        <option key={d.id} value={d.id}>
                                                            {d.full_name}{d.is_available ? " ✓ Available" : " (Busy)"}
                                                        </option>
                                                    ))}
                                                </select>
                                                {speciality && filteredDoctors.length === 0 && (
                                                    <p className="text-[11px] text-amber-600 mt-1 ml-1">No doctors found for this speciality.</p>
                                                )}
                                            </div>

                                            {/* Date */}
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Appointment Date *</label>
                                                <div className="relative">
                                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getTodayStr()} required
                                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" />
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            {step3Valid && (
                                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                    className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs text-slate-600 space-y-1">
                                                    <p className="font-bold text-sky-700 mb-1.5">Appointment Summary</p>
                                                    <p>👤 <span className="font-semibold">{firstName} {lastName}</span> · {gender} · {dob}</p>
                                                    <p>🏥 <span className="font-semibold">{speciality}</span> → {selectedDoctor?.full_name}</p>
                                                    <p>📅 <span className="font-semibold">{new Date(date).toLocaleDateString(undefined, { dateStyle: "long" })}</span></p>
                                                </motion.div>
                                            )}
                                        </>
                                    )}

                                    {submitError && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{submitError}</div>
                                    )}

                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => { setStep(1); setSubmitError(""); }}
                                            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm flex items-center justify-center gap-1 hover:bg-slate-200 transition-colors">
                                            <ChevronLeft size={16} /> Back
                                        </button>
                                        <button type="submit" disabled={!step3Valid || loadingDoctors || submitting}
                                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-sky-500/20">
                                            {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <>Confirm Booking <CheckCircle size={16} /></>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
