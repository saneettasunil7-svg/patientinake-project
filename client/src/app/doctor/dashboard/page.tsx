"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, CheckCircle, Clock, Video, Users, User, Activity, FileText, PhoneOff, Upload, PlusCircle, LogOut, MessageSquare, Power, HeartPulse, XCircle, X, FilePlus, ChevronRight, MessageCircle, Pill, Volume2, CreditCard, Share2, QrCode, Phone, Info, Stethoscope, ChevronDown, ChevronUp, Landmark, Hash } from 'lucide-react';
import Link from 'next/link';
import ChatBox from '@/components/ChatBox';
import QRCode from "react-qr-code";

interface Appointment {
    id: number;
    patient_name: string;
    patient_email: string;
    appointment_date: string;
    status: string;
    notes: string;
}

interface TokenQueue {
    id: number;
    token_number: number;
    patient_id: number;
    patient_name: string;
    status: string;
    payment_status: string;
    payment_amount: number;
    waiting_time: number;
    is_emergency: boolean;
    reason_for_visit?: string;
    voice_reason_url?: string;
    gender?: string;
    blood_group?: string;
    date_of_birth?: string;
    phone_number?: string;
    medical_history_summary?: string;
    upi_id?: string;
    bank_name?: string;
    branch_name?: string;
    account_number?: string;
    ifsc_code?: string;
    document_count: number;
    appointment_notes?: string;
}

import ScheduleManager from '@/components/ScheduleManager';
import { Suspense } from 'react';

function DashboardContent() {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isAvailable, setIsAvailable] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [tokenQueue, setTokenQueue] = useState<TokenQueue[]>([]);
    const [tokenStats, setTokenStats] = useState({ waiting: 0, completed: 0, avg_wait_minutes: 0 });
    const [stats, setStats] = useState({ pending: 0, completed: 0, cancelled: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextTokenId, setNextTokenId] = useState<number | null>(null); // Highlighted next token
    const [consultedTokenId, setConsultedTokenId] = useState<number | null>(null); // Highlighted patient just consulted
    const nextTokenRef = useRef<HTMLDivElement | null>(null);

    // Emergency Alerts
    const [emergencyAlert, setEmergencyAlert] = useState<TokenQueue | null>(null);

    // Modal States
    const [historyOpen, setHistoryOpen] = useState(false);
    const [recordOpen, setRecordOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Data States
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);
    const [historyDocuments, setHistoryDocuments] = useState<any[]>([]);
    const [selectedPatientName, setSelectedPatientName] = useState('');
    const [expandedPatientId, setExpandedPatientId] = useState<number | null>(null);
    const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
    const [newRecord, setNewRecord] = useState({ diagnosis: '', treatment: '', prescription: '', follow_up_days: 0 });
    const [isPredicting, setIsPredicting] = useState(false);
    const [chatContacts, setChatContacts] = useState<any[]>([]);
    const [activeChatRecipient, setActiveChatRecipient] = useState<any>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

    // New state to track tokens for which a prescription has been physically submitted in this session
    const [completedPrescriptions, setCompletedPrescriptions] = useState<number[]>([]);

    const [doctorPaymentInfo, setDoctorPaymentInfo] = useState<any>(null);
    const [doctorInfo, setDoctorInfo] = useState<{ name: string, email: string } | null>(null);
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        specialization: '',
        bio: '',
        phone_number: '',
        upi_id: '',
        bank_name: '',
        branch_name: '',
        account_number: '',
        ifsc_code: ''
    });
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);


    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/auth/login');
        } else if (user && user.role !== 'doctor') {
            router.push('/auth/login');
        } else if (user) {
            fetchData();
        }
    }, [user, isLoading, router]);

    // Detect return from video call: highlight consulted patient and auto-open prescription modal
    useEffect(() => {
        const docTokenId = searchParams.get('tokenId');
        if (searchParams.get('callEnded') === 'true') {
            if (docTokenId) {
                const tokenIdNum = parseInt(docTokenId);
                setConsultedTokenId(tokenIdNum);

                // Find patient details for the token to auto-open modal
                const tokenObj = tokenQueue.find(t => t.id === tokenIdNum);
                if (tokenObj) {
                    setTimeout(() => {
                        openAddRecordModal(tokenObj.patient_id, tokenObj.patient_name);
                    }, 500); // Slight delay for smooth UI transition
                }

                // Scroll to the consulted patient
                setTimeout(() => {
                    const el = document.getElementById(`token-${docTokenId}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 600);
            } else if (tokenQueue.length > 0) {
                const nextWaiting = tokenQueue.find(t => t.status === 'waiting');
                if (nextWaiting) {
                    setNextTokenId(nextWaiting.id);
                    setTimeout(() => {
                        nextTokenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 600);
                    setTimeout(() => setNextTokenId(null), 6000);
                }
            }
        }
    }, [searchParams, tokenQueue]);

    // Auto-Refresh Data
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            fetchData(true); // silent refresh
        }, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            if (!isBackground) setLoading(false);
            return;
        }

        try {
            const fetchOptions = { headers: { 'Authorization': `Bearer ${token}` } };
            const endpoints = [
                { url: `${getApiBaseUrl()}/doctors/me/availability`, key: 'avail' },
                { url: `${getApiBaseUrl()}/doctors/me/appointments`, key: 'appt' },
                { url: `${getApiBaseUrl()}/tokens/metrics/me`, key: 'metrics' },
                { url: `${getApiBaseUrl()}/chat/contacts`, key: 'contacts' },
                { url: `${getApiBaseUrl()}/profile/me`, key: 'profile' },
            ];

            if (user) {
                endpoints.push({ url: `${getApiBaseUrl()}/tokens/queue/${user.id}`, key: 'queue' });
            }

            const results = await Promise.allSettled(
                endpoints.map(async (ep) => {
                    try {
                        const response = await fetch(ep.url, { ...fetchOptions, cache: 'no-store' });
                        if (response.status === 401 || response.status === 403) {
                            localStorage.removeItem('token');
                            window.location.href = '/auth/login';
                            throw new Error('Unauthorized');
                        }
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const data = await response.json();
                        return { key: ep.key, data };
                    } catch (err) {
                        console.error(`Fetch failed for ${ep.key}:`, err);
                        throw err;
                    }
                })
            );

            // Flag if we got a network-level fetch failure (CORS, connection refused)
            let networkError = null;

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const { key, data } = result.value;
                    if (key === 'avail') setIsAvailable(data.is_available);
                    else if (key === 'appt') {
                        setAppointments(data.slice(0, 10));
                        const pending = data.filter((a: Appointment) => a.status === 'pending').length;
                        const completed = data.filter((a: Appointment) => a.status === 'completed').length;
                        const cancelled = data.filter((a: Appointment) => a.status === 'cancelled').length;
                        setStats({ pending, completed, cancelled });
                    }
                    else if (key === 'metrics') setTokenStats(data);
                    else if (key === 'contacts') setChatContacts(data);
                    else if (key === 'profile') {
                        setProfilePhoto(data.profile_photo);
                        setDoctorInfo({
                            name: data.full_name,
                            email: data.email
                        });
                        setDoctorPaymentInfo({
                            upi_id: data.upi_id,
                            bank_name: data.bank_name,
                            account_number: data.account_number,
                            ifsc_code: data.ifsc_code
                        });
                        setProfileForm({
                            full_name: data.full_name || '',
                            specialization: data.specialization || '',
                            bio: data.bio || '',
                            phone_number: data.phone_number || '',
                            upi_id: data.upi_id || '',
                            bank_name: data.bank_name || '',
                            branch_name: data.branch_name || '',
                            account_number: data.account_number || '',
                            ifsc_code: data.ifsc_code || ''
                        });
                    }
                    else if (key === 'queue') {
                        setTokenQueue(data);
                        const waitingEmergency = data.find((t: TokenQueue) => t.is_emergency && t.status === 'waiting');
                        if (waitingEmergency && (!emergencyAlert || emergencyAlert.id !== waitingEmergency.id)) {
                            setEmergencyAlert(waitingEmergency);
                            playEmergencySound();
                        } else if (!waitingEmergency) {
                            setEmergencyAlert(null);
                        }
                    }
                } else {
                    console.error('Endpoint fetch failed:', result.reason);
                    if (result.reason instanceof TypeError && result.reason.message.includes('Failed to fetch')) {
                        networkError = result.reason;
                    }
                }
            });

            if (networkError && !isBackground) {
                setError(`Failed to connect to backend at ${getApiBaseUrl()}. Please verify your secure connection.`);
            }

        } catch (error: any) {
            console.error('Fatal error fetching data:', error);
            if (!isBackground) {
                setError('Network Error: Could not reach backend.');
            }
        }
        if (!isBackground) setLoading(false);
    };

    const toggleAvailability = async () => {
        // ... (existing toggle logic unchanged)
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/doctors/availability`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_available: !isAvailable })
            });
            if (response.ok) setIsAvailable(!isAvailable);
        } catch (e) { console.error(e); }
    };

    const handleCallPatient = async (tokenId: number) => {
        // ... (existing call logic)
        const token = localStorage.getItem('token');
        try {
            await fetch(`${getApiBaseUrl()}/tokens/${tokenId}/call`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sessionResponse = await fetch(`${getApiBaseUrl()}/video/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ token_id: tokenId })
            });
            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                router.push(`/video/${session.session_id}`);
            }
        } catch (e) { console.error(e); setError('Failed to start call'); }
    };

    const handleAcceptEmergency = async (tokenId: number) => {
        const token = localStorage.getItem('token');
        try {
            const acceptRes = await fetch(`${getApiBaseUrl()}/tokens/${tokenId}/accept-emergency`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (acceptRes.ok) {
                const sessionResponse = await fetch(`${getApiBaseUrl()}/video/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ token_id: tokenId })
                });
                if (sessionResponse.ok) {
                    const session = await sessionResponse.json();
                    router.push(`/video/${session.session_id}`);
                }
            } else {
                const err = await acceptRes.json();
                setError(err.detail || 'Failed to accept emergency call (perhaps another doctor took it)');
                setEmergencyAlert(null);
                fetchData(true);
            }
        } catch (e) { console.error(e); setError('Failed to start call'); }
    };

    const handleCompleteToken = async (tokenId: number) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/tokens/${tokenId}/complete`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await fetchData();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    };

    const handleViewHistory = async (patientId: number, patientName: string) => {
        // ... (existing history logic)
        setSelectedPatientName(patientName);
        setHistoryOpen(true);
        setHistoryRecords([]);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/medical-records/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setHistoryRecords(await res.json());

            // Fetch Documents
            const docRes = await fetch(`${getApiBaseUrl()}/documents/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (docRes.ok) setHistoryDocuments(await docRes.json());
        } catch (e) { console.error(e); }
    };

    const openAddRecordModal = (patientId: number, patientName: string) => {
        setCurrentPatientId(patientId);
        setSelectedPatientName(patientName);
        setNewRecord({ diagnosis: '', treatment: '', prescription: '', follow_up_days: 0 });
        setRecordOpen(true);
    };

    const handlePredictMedicines = async () => {
        if (!newRecord.diagnosis.trim()) {
            alert("Please enter a diagnosis first before predicting medicines.");
            return;
        }

        setIsPredicting(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${getApiBaseUrl()}/medical-records/predict-medicines?diagnosis=${encodeURIComponent(newRecord.diagnosis)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setNewRecord(prev => ({
                    ...prev,
                    prescription: data.prescription
                }));
            } else {
                alert("Failed to predict medicines.");
            }
        } catch (e) {
            console.error("Prediction error:", e);
            alert("An error occurred during medicine prediction.");
        } finally {
            setIsPredicting(false);
        }
    };

    const handleAddRecordSubmit = async (e: React.FormEvent) => {
        // ... (existing add record logic)
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!currentPatientId) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/medical-records/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    patient_id: currentPatientId,
                    diagnosis: newRecord.diagnosis,
                    treatment: newRecord.treatment,
                    prescription: newRecord.prescription,
                    follow_up_days: newRecord.follow_up_days
                })
            });
            if (res.ok) {
                alert('Record Added');
                setRecordOpen(false);

                // If there's a consulted token actively selected, mark its prescription as completed
                if (consultedTokenId) {
                    await handleCompleteToken(consultedTokenId);
                    setConsultedTokenId(null);
                }

                // Send an automated chat message if chat is active or for future reference
                if (currentPatientId) {
                    try {
                        const recordData = await res.json();
                        await fetch(`${getApiBaseUrl()}/chat/send`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                content: `Dr. ${user?.email.split('@')[0]} has issued a new prescription. [REF:${recordData.id}]`,
                                receiver_id: currentPatientId
                            })
                        });
                    } catch (e) { console.error("Failed to send chat notification", e); }
                }
            }
        } catch (e) { console.error(e); }
    };

    const handleCallNext = async () => {
        // ... (existing call next logic)
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/call-next`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const sessionRes = await fetch(`${getApiBaseUrl()}/video/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ token_id: data.token_id })
                });
                if (sessionRes.ok) {
                    const session = await sessionRes.json();
                    router.push(`/video/${session.session_id}`);
                }
            } else { setError('No patients in queue'); }
        } catch (e) { console.error(e); }
    };

    const playEmergencySound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.warn('Sound play blocked by browser', e));
        } catch (e) { console.error('Audio error', e); }
    };

    const openChat = (contact: any) => {
        setActiveChatRecipient(contact);
        setChatOpen(true);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        setUploadingPhoto(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/profile/photo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setProfilePhoto(data.profile_photo);
            }
        } catch (e) {
            console.error("Failed to upload photo", e);
            setUploadingPhoto(false);
        }
        finally { setUploadingPhoto(false); }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setIsSavingProfile(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/profile/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileForm)
            });
            if (res.ok) {
                const updatedData = await res.json();
                setDoctorInfo({
                    name: updatedData.full_name,
                    email: user?.email || ''
                });
                setDoctorPaymentInfo({
                    upi_id: updatedData.upi_id,
                    bank_name: updatedData.bank_name,
                    account_number: updatedData.account_number,
                    ifsc_code: updatedData.ifsc_code
                });
                alert('Profile updated successfully!');
                setProfileOpen(false);
            } else {
                const errData = await res.json();
                alert(`Failed to update profile: ${errData.detail || 'Unknown error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while updating profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    if (isLoading || loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">Loading Doctor Dashboard...</div>;
    if (!user) return null;

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-800">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-sky-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-teal-100/50 rounded-full blur-[100px]" />
            </div>

            <nav className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
                                <Activity size={24} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900">Medi<span className="text-sky-600">Connect</span> <span className="text-slate-400 font-normal">| Doctor Portal</span></span>
                        </div>
                        <div className="flex items-center space-x-6">
                            <label className="relative cursor-pointer group">
                                <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-sky-500 transition-all shadow-md">
                                    {profilePhoto ? (
                                        <img src={getApiBaseUrl() + profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <Users size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-sky-500 rounded-lg border-2 border-white flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform">
                                    <PlusCircle size={12} />
                                </div>
                            </label>

                            {doctorInfo && (
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900 leading-tight">{doctorInfo.name}</span>
                                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">{doctorInfo.email}</span>
                                </div>
                            )}

                            <Link
                                href="/doctor/patients"
                                className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-white text-slate-700 border border-slate-100 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                            >
                                <Users size={18} className="text-sky-500" />
                                <span>My Patients</span>
                            </Link>

                            <Link
                                href="/doctor/prescriptions"
                                className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-white text-slate-700 border border-slate-100 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                            >
                                <FileText size={18} className="text-sky-500" />
                                <span>Prescriptions</span>
                            </Link>

                            <Link
                                href="/doctor/reports"
                                className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-white text-slate-700 border border-slate-100 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                            >
                                <Activity size={18} className="text-sky-500" />
                                <span>Reports</span>
                            </Link>

                            <button
                                onClick={() => setScheduleOpen(true)}
                                className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-white text-slate-700 border border-slate-100 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                            >
                                <Calendar size={18} className="text-sky-500" />
                                <span>Schedule</span>
                            </button>

                            <button
                                onClick={() => setProfileOpen(true)}
                                className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-white text-slate-700 border border-slate-100 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                            >
                                <User size={18} className="text-sky-500" />
                                <span>Profile</span>
                            </button>


                            <button
                                onClick={toggleAvailability}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${isAvailable
                                    ? 'bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100'
                                    : 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                                    }`}
                            >
                                <Power size={16} />
                                <span>{isAvailable ? 'Online' : 'Offline'}</span>
                            </button>

                            <button onClick={() => logout()} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav >

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Emergency Alert Banner */}
                {emergencyAlert && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 p-1 rounded-3xl bg-gradient-to-r from-red-600 via-orange-600 to-red-600 shadow-2xl shadow-red-500/40 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                        <div className="bg-white/95 backdrop-blur-md rounded-[1.4rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center space-x-6">
                                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner animate-pulse">
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-1">
                                            <HeartPulse size={10} /> Urgent
                                        </span>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Department SOS</h3>
                                    </div>
                                    <p className="text-slate-500 font-bold flex items-center">
                                        Patient: <span className="text-slate-900 ml-1.5">{emergencyAlert.patient_name}</span>
                                        <span className="mx-3 text-slate-300">|</span>
                                        Reason: <span className="text-red-600 ml-1.5 italic font-black">"{emergencyAlert.reason_for_visit || 'Medical Emergency'}"</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 w-full md:w-auto">
                                <button
                                    onClick={() => handleAcceptEmergency(emergencyAlert.id)}
                                    className="flex-1 md:flex-none px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3"
                                >
                                    <Video size={18} />
                                    <span>Accept Call Now</span>
                                </button>
                                <button
                                    onClick={() => setEmergencyAlert(null)}
                                    className="px-6 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all uppercase tracking-widest"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Connection Error Banner */}
                {error && error.includes('backend') && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top duration-500">
                        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
                            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Security Certificate Required</h3>
                                        <p className="text-sm text-slate-500 font-medium">Please accept the backend SSL certificate to enable real-time features.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                    <a
                                        href={`${getApiBaseUrl()}/docs`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all text-center w-full sm:w-auto"
                                    >
                                        Verify Connection
                                    </a>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all text-center w-full sm:w-auto"
                                    >
                                        Refresh Page
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <StatCard
                        icon={<Users className="text-white" />}
                        title="Waiting Patient Number"
                        value={tokenStats.waiting}
                        color="from-sky-500 to-blue-600"
                    />
                    <StatCard
                        icon={<CheckCircle className="text-white" />}
                        title="Completed Today"
                        value={tokenStats.completed}
                        color="from-emerald-500 to-teal-600"
                    />
                    <StatCard
                        icon={<Clock className="text-white" />}
                        title="Avg Wait Time"
                        value={tokenStats.avg_wait_minutes}
                        suffix="min"
                        color="from-amber-400 to-orange-500"
                    />
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Master List Section */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center text-slate-800">
                                <Users className="mr-2 text-sky-500" /> Clinical Dashboard
                            </h2>
                            <button
                                onClick={handleCallNext}
                                disabled={tokenQueue.length === 0 || !tokenQueue.some(t => t.status === 'waiting')}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md flex items-center space-x-2"
                            >
                                <Video size={18} />
                                <span>Call Next</span>
                            </button>
                        </div>

                        {tokenQueue.filter(t => t.status !== 'completed').length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 shadow-sm">
                                <p className="text-slate-400 text-lg">No appointments for today.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tokenQueue.filter(t => t.status !== 'completed').map((token) => (
                                    <div
                                        key={token.id}
                                        id={`token-${token.id}`}
                                        ref={token.id === nextTokenId ? nextTokenRef : null}
                                        className={`bg-white/80 backdrop-blur-md p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between group hover:shadow-xl transition-all duration-500 border-2 relative overflow-hidden
                                            ${token.id === nextTokenId
                                                ? 'border-emerald-400 shadow-emerald-400/30 shadow-xl ring-4 ring-emerald-300/50 animate-pulse-border'
                                                : token.id === consultedTokenId
                                                    ? 'border-amber-400 shadow-amber-400/20 bg-amber-50/30 ring-4 ring-amber-200/50'
                                                    : token.status === 'in_progress' ? 'border-sky-500 shadow-sky-500/10' : 'border-slate-100'
                                            }`}
                                    >
                                        {token.id === nextTokenId && (
                                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black uppercase tracking-widest text-center py-1.5 flex items-center justify-center gap-2">
                                                <ChevronRight size={14} className="animate-bounce-x" />
                                                Next Patient — Ready to Call
                                                <ChevronRight size={14} className="animate-bounce-x" />
                                            </div>
                                        )}
                                        {token.id === consultedTokenId && (
                                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 flex items-center justify-center gap-2">
                                                <CheckCircle size={14} />
                                                Consultation Ended — Finalize with Prescription
                                                <CheckCircle size={14} />
                                            </div>
                                        )}
                                        <div className="flex items-start space-x-6 w-full">
                                            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 transition-transform duration-500 group-hover:scale-105 ${token.status === 'in_progress' ? 'bg-sky-50 border-sky-100 text-sky-600 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                                <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Token</span>
                                                <span className="text-3xl font-black italic tracking-tighter">#{token.token_number}</span>
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{token.patient_name}</h3>
                                                    <div className="flex gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${token.status === 'in_progress' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40' :
                                                            token.status === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' :
                                                                token.status === 'waiting' ? 'bg-amber-400 text-white shadow-lg shadow-amber-500/40' :
                                                                    'bg-slate-200 text-slate-600'
                                                            }`}>{token.status.replace('_', ' ')}</span>
                                                        
                                                        {token.payment_status === 'completed' ? (
                                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-sm">
                                                                <CheckCircle size={10} /> Paid
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                                                                <Clock size={10} /> Payment Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 mb-3">
                                                    {token.gender && <span className="flex items-center px-2 py-1 bg-slate-100 rounded-lg"><Users size={12} className="mr-1.5 text-sky-500" /> {token.gender}</span>}
                                                    {token.blood_group && <span className="flex items-center px-2 py-1 bg-red-50 text-red-600 rounded-lg"><Activity size={12} className="mr-1.5" /> {token.blood_group}</span>}
                                                    <span className="flex items-center px-2 py-1 bg-slate-100 rounded-lg"><Clock size={12} className="mr-1.5 text-amber-500" /> {token.waiting_time} min</span>
                                                    {token.document_count > 0 && (
                                                        <button
                                                            onClick={() => handleViewHistory(token.patient_id, token.patient_name)}
                                                            className="flex items-center px-2 py-1 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors"
                                                        >
                                                            <FileText size={12} className="mr-1.5" /> {token.document_count} Documents
                                                        </button>
                                                    )}
                                                </div>

                                                {token.appointment_notes && (
                                                    <div className="mb-3 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
                                                        <span className="font-bold uppercase tracking-widest text-[9px] block mb-1">Appointment Notes</span>
                                                        {token.appointment_notes}
                                                    </div>
                                                )}

                                                {(token.reason_for_visit || token.voice_reason_url) && (
                                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-sm italic text-slate-600 leading-relaxed relative flex flex-col gap-3">
                                                        <div className="absolute left-0 top-0 w-1 h-full bg-sky-200 rounded-full" />
                                                        {token.reason_for_visit && (
                                                            <div>
                                                                <span className="not-italic font-black text-[9px] uppercase tracking-widest text-slate-400 block mb-1">Reason for Visit</span>
                                                                "{token.reason_for_visit}"
                                                            </div>
                                                        )}
                                                        {token.voice_reason_url && (
                                                            <div className="flex items-center gap-3 mt-1 not-italic">
                                                                <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
                                                                    <Volume2 size={16} />
                                                                </div>
                                                                <audio
                                                                    controls
                                                                    src={getApiBaseUrl() + token.voice_reason_url}
                                                                    className="h-8 max-w-[200px]"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setExpandedPatientId(expandedPatientId === token.id ? null : token.id)}
                                                        className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100"
                                                    >
                                                        <Info size={14} />
                                                        <span>Registration Details</span>
                                                        {expandedPatientId === token.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>

                                                    {expandedPatientId === token.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4"
                                                        >
                                                            {(token.gender || token.blood_group || token.date_of_birth || token.phone_number || token.medical_history_summary) && (
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal & Medical</h4>
                                                                    <div className="space-y-2">
                                                                        {token.gender && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <User size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">Gender:</span>
                                                                                {token.gender}
                                                                            </div>
                                                                        )}
                                                                        {token.blood_group && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <HeartPulse size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">Blood Group:</span>
                                                                                {token.blood_group}
                                                                            </div>
                                                                        )}
                                                                        {token.date_of_birth && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <Calendar size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">DOB / Age:</span>
                                                                                {`${token.date_of_birth} (${Math.floor((Date.now() - new Date(token.date_of_birth).getTime()) / 31557600000)}y)`}
                                                                            </div>
                                                                        )}
                                                                        {token.phone_number && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <Phone size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">Phone:</span>
                                                                                {token.phone_number}
                                                                            </div>
                                                                        )}
                                                                        {token.medical_history_summary && (
                                                                            <div className="flex items-start text-xs font-bold text-slate-600">
                                                                                <Stethoscope size={14} className="mr-2 text-slate-400 mt-0.5" />
                                                                                <span className="w-24 text-slate-400 font-medium shrink-0">History:</span>
                                                                                <span className="leading-relaxed">{token.medical_history_summary}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {(token.upi_id || token.bank_name || token.branch_name || token.account_number || token.ifsc_code) && (
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment & Bank Info</h4>
                                                                    <div className="space-y-2">
                                                                        {token.upi_id && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <QrCode size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">UPI ID:</span>
                                                                                {token.upi_id}
                                                                            </div>
                                                                        )}
                                                                        {token.bank_name && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <CreditCard size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">Bank:</span>
                                                                                {token.bank_name}
                                                                            </div>
                                                                        )}
                                                                        {token.branch_name && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <Landmark size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">Branch:</span>
                                                                                {token.branch_name}
                                                                            </div>
                                                                        )}
                                                                        {token.account_number && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <Info size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">Account:</span>
                                                                                {token.account_number}
                                                                            </div>
                                                                        )}
                                                                        {token.ifsc_code && (
                                                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                                                <Hash size={14} className="mr-2 text-slate-400" />
                                                                                <span className="w-24 text-slate-400 font-medium">IFSC:</span>
                                                                                {token.ifsc_code}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {token.id === consultedTokenId ? (
                                            <div className="flex flex-col md:flex-row gap-3 mt-6 md:mt-0 md:ml-6 w-full md:w-auto p-3 bg-amber-50/50 rounded-2xl border border-amber-200 shadow-inner">
                                                <button
                                                    onClick={() => openAddRecordModal(token.patient_id, token.patient_name)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-md shadow-amber-500/30 hover:scale-105 transition-all outline-none ring-2 ring-amber-500/30"
                                                >
                                                    <PlusCircle size={18} /> Prescription
                                                </button>

                                                <button
                                                    onClick={() => handleViewHistory(token.patient_id, token.patient_name)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md shadow-sky-500/30 hover:scale-105 transition-all"
                                                >
                                                    <FileText size={18} /> History
                                                </button>
                                                <button
                                                    onClick={() => handleViewHistory(token.patient_id, token.patient_name)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-500/30 hover:scale-105 transition-all"
                                                >
                                                    <Activity size={18} /> Reports
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setActiveChatRecipient({ id: token.patient_id, full_name: token.patient_name });
                                                        setChatOpen(true);
                                                    }}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-500/30 hover:scale-105 transition-all"
                                                >
                                                    <MessageCircle size={18} /> Chat
                                                </button>

                                                {/* Only show Complete buttons if a prescription has been added for this token */}
                                                {completedPrescriptions.includes(token.id) && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                const success = await handleCompleteToken(token.id);
                                                                if (success) {
                                                                    setConsultedTokenId(null);
                                                                    handleCallNext();
                                                                }
                                                            }}
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all outline-none ring-2 ring-emerald-500/20"
                                                        >
                                                            <ChevronRight size={18} /> Complete & Next
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleCompleteToken(token.id);
                                                                setConsultedTokenId(null);
                                                            }}
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white text-emerald-700 font-bold rounded-xl shadow-sm border border-emerald-100 hover:bg-emerald-50 transition-all"
                                                        >
                                                            <CheckCircle size={18} /> Complete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 mt-6 md:mt-0 md:ml-6">
                                                {token.status === 'waiting' && (
                                                    <button
                                                        onClick={() => handleCallPatient(token.id)}
                                                        className="w-12 h-12 bg-sky-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center p-0"
                                                        title="Start Consultation"
                                                    >
                                                        <Video size={20} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleViewHistory(token.patient_id, token.patient_name)}
                                                    className="w-12 h-12 bg-white text-slate-500 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-sky-500 transition-all shadow-sm flex items-center justify-center p-0"
                                                    title="View History"
                                                >
                                                    <FileText size={20} />
                                                </button>
                                                <button
                                                    onClick={() => openChat({ id: token.patient_id, full_name: token.patient_name, role: 'patient' })}
                                                    className="w-12 h-12 bg-white text-slate-500 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-emerald-500 transition-all shadow-sm flex items-center justify-center p-0"
                                                    title="Secure Chat"
                                                >
                                                    <MessageCircle size={20} />
                                                </button>

                                                {/* Send Payment Link / QR Feature */}
                                                {doctorPaymentInfo?.upi_id && (
                                                    <button
                                                        onClick={() => {
                                                            const text = `Hello ${token.patient_name}, please complete your payment for Dr. ${user?.email.split('@')[0]}'s consultation using this UPI link: upi://pay?pa=${doctorPaymentInfo.upi_id}&pn=Doctor&am=300&cu=INR`;
                                                            const whatsappUrl = `https://wa.me/${token.patient_id}?text=${encodeURIComponent(text)}`;
                                                            const confirmShare = confirm(`Generate and share payment link for ${token.patient_name}?\n\nThis will simulate sending a message with your UPI QR link.`);
                                                            if (confirmShare) {
                                                                alert(`Payment link shared successfully!\n\nSimulated Message: "${text}"`);
                                                            }
                                                        }}
                                                        className="w-12 h-12 bg-white text-slate-500 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-sky-600 transition-all shadow-sm flex items-center justify-center p-0"
                                                        title="Send Payment Link"
                                                    >
                                                        <Share2 size={20} />
                                                    </button>
                                                )}
                                                {token.status === 'in_progress' && (
                                                    <>
                                                        <button
                                                            onClick={() => openAddRecordModal(token.patient_id, token.patient_name)}
                                                            className="w-12 h-12 rounded-2xl flex items-center justify-center p-0 transition-all shadow-lg bg-amber-400 text-white hover:scale-110 active:scale-95 shadow-amber-400/30"
                                                            title="Add Medical Record / Prescription"
                                                        >
                                                            <PlusCircle size={24} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleCompleteToken(token.id);
                                                            }}
                                                            className="h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg px-4 gap-2 bg-emerald-500 text-white hover:scale-110 active:scale-95 shadow-emerald-500/30"
                                                            title="Finish Consultation"
                                                        >
                                                            <CheckCircle size={24} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Schedule & History Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center text-slate-800">
                                <Calendar className="mr-2 text-teal-500" /> Today's Schedule
                            </h3>
                            {/* Short summary of today's slots could go here, for now just a link */}
                            <p className="text-sm text-slate-500 mb-4">Manage your weekly availability slots and unavailable days.</p>
                            <button onClick={() => setScheduleOpen(true)} className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium text-sm">View Schedule</button>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center text-slate-800">
                                <MessageCircle className="mr-2 text-sky-500" /> Chat Inbox
                            </h3>
                            {chatContacts.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No active conversations.</p>
                            ) : (
                                <div className="space-y-3">
                                    {chatContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => openChat(contact)}
                                            className="w-full flex items-center p-4 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-100 hover:ring-sky-200 hover:border-sky-300 transition-all duration-300 text-left group shadow-sm hover:shadow-sky-500/5 hover:-translate-y-0.5"
                                        >
                                            <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-500 mr-4 group-hover:from-sky-50 group-hover:to-sky-100 group-hover:text-sky-600 transition-all shadow-inner overflow-hidden">
                                                {contact.profile_photo ? (
                                                    <img src={getApiBaseUrl() + contact.profile_photo} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users size={20} />
                                                )}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="text-sm font-black text-slate-900 truncate tracking-tight">{contact.full_name}</p>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{contact.role}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {
                    scheduleOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                                <button onClick={() => setScheduleOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                                <ScheduleManager onClose={() => setScheduleOpen(false)} />
                            </div>
                        </div>
                    )
                }

                {
                    profileOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-md transition-all">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-slate-900/20"
                            >
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-500" />
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Profile</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your professional & clinical details</p>
                                    </div>
                                    <button onClick={() => setProfileOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="overflow-y-auto p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    value={profileForm.full_name}
                                                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-sky-500/20 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none font-bold text-slate-800"
                                                    placeholder="Dr. Full Name"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Specialization</label>
                                            <div className="relative group">
                                                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    value={profileForm.specialization}
                                                    onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-sky-500/20 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none font-bold text-slate-800"
                                                    placeholder="e.g. Cardiologist"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Professional Bio</label>
                                            <textarea
                                                value={profileForm.bio}
                                                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-sky-500/20 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none font-bold text-slate-800 min-h-[100px]"
                                                placeholder="Tell patients about your experience and expertise..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                                                <input
                                                    type="tel"
                                                    value={profileForm.phone_number}
                                                    onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-sky-500/20 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none font-bold text-slate-800"
                                                    placeholder="+1 234 567 890"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-6">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm ring-1 ring-emerald-500/10">
                                                <CreditCard size={16} />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Payment & Bank Details</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/80 rounded-[2rem] border border-slate-100 shadow-inner">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">UPI ID</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.upi_id}
                                                    onChange={(e) => setProfileForm({ ...profileForm, upi_id: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-800 shadow-sm"
                                                    placeholder="doctor@upi"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.bank_name}
                                                    onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-800 shadow-sm"
                                                    placeholder="Global Health Bank"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Account Number</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.account_number}
                                                    onChange={(e) => setProfileForm({ ...profileForm, account_number: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-800 shadow-sm"
                                                    placeholder="XXXX XXXX XXXX XXXX"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.ifsc_code}
                                                    onChange={(e) => setProfileForm({ ...profileForm, ifsc_code: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-800 shadow-sm"
                                                    placeholder="GHLB000123"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 flex items-center gap-4 sticky bottom-0 bg-white pb-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingProfile}
                                            className="flex-grow py-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProfileOpen(false)}
                                            className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )
                }

                {
                    historyOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400" />
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Patient History</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center">
                                            <Users size={12} className="mr-1.5 text-sky-500" /> {selectedPatientName}
                                        </p>
                                    </div>
                                    <button onClick={() => setHistoryOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><XCircle /></button>
                                </div>
                                <div className="p-6 overflow-y-auto space-y-6">
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                            <Calendar size={14} className="mr-2" /> Medical History
                                        </h3>
                                        {historyRecords.length === 0 ? (
                                            <p className="text-center text-slate-500 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No medical records found.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {historyRecords.map((rec: any) => (
                                                    <div key={rec.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                                        <p className="font-bold text-lg text-slate-800">{rec.diagnosis}</p>
                                                        <p className="text-xs text-slate-500 mb-2">{new Date(rec.created_at).toLocaleDateString()}</p>
                                                        <div className="text-sm space-y-1">
                                                            <p><span className="font-semibold text-slate-600">Rx:</span> {rec.prescription}</p>
                                                            <p><span className="font-semibold text-slate-600">Tx:</span> {rec.treatment}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                            <FileText size={14} className="mr-2" /> Uploaded Documents
                                        </h3>
                                        {historyDocuments.length === 0 ? (
                                            <p className="text-center text-slate-500 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No documents found.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {historyDocuments.map((doc: any) => (
                                                    <div key={doc.id} className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between group">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sky-600 shadow-sm">
                                                                <FileText size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{doc.filename}</p>
                                                                <p className="text-[10px] text-slate-500">{new Date(doc.upload_date).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={`${getApiBaseUrl()}/static/${doc.file_path.split('\\').pop().split('/').pop()}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>

                            </div>
                        </div>
                    )
                }

                {
                    recordOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h2 className="text-xl font-bold text-slate-800">New Record: {selectedPatientName}</h2>
                                    <button onClick={() => setRecordOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle /></button>
                                </div>
                                <form onSubmit={handleAddRecordSubmit} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
                                        <input type="text" className="w-full p-3 rounded-xl border border-slate-200" value={newRecord.diagnosis} onChange={e => setNewRecord({ ...newRecord, diagnosis: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Treatment</label>
                                        <textarea className="w-full p-3 rounded-xl border border-slate-200 h-24" value={newRecord.treatment} onChange={e => setNewRecord({ ...newRecord, treatment: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Prescription</label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={handlePredictMedicines}
                                                disabled={isPredicting || !newRecord.diagnosis.trim()}
                                                className="self-end flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200"
                                            >
                                                {isPredicting ? (
                                                    <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span> Predicting...</span>
                                                ) : (
                                                    <span className="flex items-center gap-1">🪄 Auto-Predict Medicines</span>
                                                )}
                                            </button>
                                            <textarea
                                                className={`w-full p-3 rounded-xl border h-24 transition-all duration-300 ${isPredicting ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                                                value={newRecord.prescription}
                                                onChange={e => setNewRecord({ ...newRecord, prescription: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Next Visit (Auto-Schedule)</label>
                                        <select
                                            className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white"
                                            value={newRecord.follow_up_days}
                                            onChange={e => setNewRecord({ ...newRecord, follow_up_days: parseInt(e.target.value) })}
                                        >
                                            <option value={0}>No Follow-up Needed</option>
                                            <option value={3}>In 3 Days</option>
                                            <option value={7}>In 1 Week</option>
                                            <option value={14}>In 2 Weeks</option>
                                            <option value={30}>In 1 Month</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700">Save Record</button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    chatOpen && activeChatRecipient && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative">
                                <button onClick={() => setChatOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-50"><XCircle size={24} /></button>
                                <ChatBox
                                    recipientId={activeChatRecipient.id}
                                    recipientName={activeChatRecipient.full_name}
                                    currentUserId={user.id}
                                    onPrescriptionClick={() => openAddRecordModal(activeChatRecipient.id, activeChatRecipient.full_name)}
                                />
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}

export default function DoctorDashboard() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">Loading Doctor Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function StatCard({ icon, title, value, color, suffix = "" }: { icon: any, title: string, value: number, color: string, suffix?: string }) {
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className={`p-1 rounded-3xl bg-gradient-to-br ${color} shadow-xl shadow-sky-500/10`}
        >
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[1.4rem] h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} shadow-lg`}>
                        {icon}
                    </div>
                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest">{title}</span>
                </div>
                <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">{value}</span>
                    <span className="text-slate-400 font-bold text-sm">{suffix}</span>
                </div>
            </div>
        </motion.div>
    );
}

