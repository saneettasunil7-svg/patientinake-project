"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, MessageSquare, LogOut, Video, Clock, CheckCircle, AlertCircle, RefreshCcw, Stethoscope, Pill, LayoutGrid, List, Shield, FileText, Ambulance, Phone, Download } from 'lucide-react';
import DoctorTokenCard from '@/components/DoctorTokenCard';
import RuleBasedChat from '@/components/RuleBasedChat';
import NotificationBell from '@/components/NotificationBell';
import NearbyFacilities from '@/components/NearbyFacilities';
import EmergencyAmbulanceModule from '@/components/EmergencyAmbulanceModule';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function PatientDashboard() {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    // const [tokenStatus, setTokenStatus] = useState<any>(null); // REMOVED: Managed locally by DoctorTokenCard
    const [doctors, setDoctors] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>(['All']);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedDept, setSelectedDept] = useState<string>('All');
    const [error, setError] = useState<string | null>(null);
    const [loadingDocs, setLoadingDocs] = useState(true);

    // Sidebar Selection State
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [selectedTokenStatus, setSelectedTokenStatus] = useState<any>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('doctors'); // doctors, appointments, prescriptions, documents
    const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Appointments State
    const [appointments, setAppointments] = useState<any[]>([]);
    const [booking, setBooking] = useState(false);
    const [newAppt, setNewAppt] = useState({ doctor_id: '', date: '', notes: '' });

    // Documents State
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Emergency State
    const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
    const [emergencyStatus, setEmergencyStatus] = useState<any>(null);
    const [ambulanceCalled, setAmbulanceCalled] = useState(false);

    // Policies State
    const [policies, setPolicies] = useState<any[]>([]);
    const [loadingPolicies, setLoadingPolicies] = useState(false);

    // Patient Profile State
    const [patientProfile, setPatientProfile] = useState<any>(null);
    const [profileForm, setProfileForm] = useState({
        full_name: '', phone_number: '', gender: '', blood_group: '', date_of_birth: '', medical_history_summary: ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSaveMsg, setProfileSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);


    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/auth/login');
        } else if (user && user.role !== 'patient') {
            router.push('/auth/login');
        } else if (user) {
            fetchDoctorsAndStatus();
        }
    }, [user, isLoading, router]);


    // Poll for Doctor Availability (every 30s)
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            refreshDoctors();
        }, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // REMOVED: Global token polling
    /* 
    // Poll for status changes (Waiting -> In Progress)
    useEffect(() => {
        if (!tokenStatus || tokenStatus.status !== 'waiting') return;

        const interval = setInterval(() => {
            checkTokenStatus();
        }, 1000); // Check every 1 second


        return () => clearInterval(interval);
    }, [tokenStatus?.status]);
    */

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([refreshDoctors(), checkTokenStatus()]);
        if (activeTab === 'prescriptions') await fetchMedicalRecords();
        if (activeTab === 'documents') await fetchDocuments();
        if (activeTab === 'appointments') await fetchAppointments();
        setIsRefreshing(false);
    };

    const refreshDoctors = async () => {
        const token = localStorage.getItem('token');
        const apiUrl = `${getApiBaseUrl()}/doctors/`;
        console.log(`DEBUG: Fetching doctors from: ${apiUrl}`);
        try {
            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const docs = await res.json();
                setDoctors(docs);
                setFetchError(null);
                
                // Extract unique specializations for the filter chips
                const formattedDepts: string[] = docs
                    .map((d: any) => d.specialization as string)
                    .filter((s: string | null | undefined) => s && s !== 'General Practice');
                
                const uniqueDepts = Array.from(new Set(formattedDepts));
                setDepartments(['All', ...uniqueDepts]);
            } else {
                const errorText = await res.text();
                console.error(`Failed to fetch doctors: ${res.status}`, errorText);
                setFetchError(`Server returned ${res.status}: ${errorText || 'Check if BACKEND_URL environment variable is set on Vercel Dashboard.'}`);
            }
        } catch (e: any) {
            console.error("Failed to fetch doctors:", e);
            setFetchError(`Network Error: ${e.message}. Please check your internet or if the Render backend is active.`);
        } finally {
            setLoadingDocs(false);
        }
    };

    const fetchMedicalRecords = async () => {
        const token = localStorage.getItem('token');
        setLoadingRecords(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/medical-records/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMedicalRecords(data);
            }
        } catch (error) {
            console.error('Error fetching medical records:', error);
        } finally {
            setLoadingRecords(false);
        }
    };

    const fetchDocuments = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const token = localStorage.getItem('token');
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                alert('File uploaded successfully!');
                fetchDocuments();
            } else {
                alert('Upload failed.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload error.');
        } finally {
            setUploading(false);
        }
    };

    const fetchDoctorsAndStatus = async () => {
        const token = localStorage.getItem('token');
        try {
            // Fetch Doctors
            await refreshDoctors();

            // REMOVED: Auto-fetch of token status to prevent global token display
            // await checkTokenStatus(); 
        } catch (e: any) {
            console.error("Failed to fetch doctors:", e);
            setFetchError(`Network Error: ${e.message}. Please check your internet or if the Render backend is active.`);
        } finally {
            setLoadingDocs(false);
        }
    };

    const checkBackendConnection = async () => {
        try {
            await fetch(`${getApiBaseUrl()}/`, { method: 'HEAD' });
        } catch (e) {
            console.error("Backend connection check failed:", e);
            // We NO LONGER redirect to login automatically to prevent accidental logouts
            // during network jitter or deployments.
            setError("Cannot reach the health services. Please check your internet connection.");
        }
    };

    useEffect(() => {
        checkBackendConnection();
    }, []);

    /*
    const checkTokenStatus = async () => {
        const token = localStorage.getItem('token');
        try {
            // Optimized fetching: Get MY active token directly
            const res = await fetch(`${getApiBaseUrl()}/tokens/my-active/token`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setTokenStatus(data);
            } else {
                setTokenStatus(null);
            }
        } catch (error: any) {
            console.error('Error checking token:', error);
            setTokenStatus(null);
        }
    };
    */
    const checkTokenStatus = async () => { }; // Keeping as no-op if referenced elsewhere temporarily


    const fetchAppointments = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/appointments/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAppointments(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchPolicies = async () => {
        const token = localStorage.getItem('token');
        setLoadingPolicies(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/policies/public`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPolicies(data);
            }
        } catch (error) {
            console.error('Error fetching policies:', error);
        } finally {
            setLoadingPolicies(false);
        }
    };

    const fetchPatientProfile = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPatientProfile(data);
                setProfileForm({
                    full_name: data.full_name || '',
                    phone_number: data.phone_number || '',
                    gender: data.gender || '',
                    blood_group: data.blood_group || '',
                    date_of_birth: data.date_of_birth || '',
                    medical_history_summary: data.medical_history_summary || '',
                });
            }
        } catch (e) { console.error('Profile fetch error', e); }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileSaveMsg(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/profile/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(profileForm)
            });
            if (res.ok) {
                setProfileSaveMsg({ ok: true, text: 'Profile updated successfully!' });
                await fetchPatientProfile(); // Re-fetch to auto-reflect changes
            } else {
                const err = await res.json();
                setProfileSaveMsg({ ok: false, text: err.detail || 'Update failed.' });
            }
        } catch (e) {
            setProfileSaveMsg({ ok: false, text: 'Network error. Please try again.' });
        } finally {
            setIsSavingProfile(false);
            setTimeout(() => setProfileSaveMsg(null), 4000);
        }
    };

    const handleDownloadPrescription = (rec: any) => {
        const content = `
MEDICAL PRESCRIPTION
-------------------
Date: ${new Date(rec.created_at).toLocaleDateString()}
Record ID: ${rec.id}

DIAGNOSIS:
${rec.diagnosis}

TREATMENT PLAN:
${rec.treatment}

PRESCRIPTION:
${rec.prescription}

Follow-up: ${rec.follow_up_days || 0} days
-------------------
Generated by City Hospital Telemedicine System
        `;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Prescription_${rec.id}_${rec.diagnosis.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleBookAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setBooking(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/appointments/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: parseInt(newAppt.doctor_id),
                    appointment_date: newAppt.date,
                    notes: newAppt.notes
                })
            });
            if (res.ok) {
                // Appointment booked successfully — reset form and refresh list.
                // Do NOT auto-join a video call; the patient should wait for their scheduled time.
                setNewAppt({ doctor_id: '', date: '', notes: '' });
                await fetchAppointments();
                alert('Appointment booked successfully! You will be notified when your doctor is ready.');
            } else {
                const errText = await res.text();
                alert(`Booking failed (${res.status}): ${errText}`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Booking network error: ${e.message}`);
        }
        setBooking(false);
    };

    const handleEmergencyCall = async () => {
        // Instant triggering - removing confirmation for emergency speed

        const token = localStorage.getItem('token');
        setIsEmergencyLoading(true);
        setError(null);

        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/emergency`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: "Patient-initiated SOS" })
            });

            if (res.ok) {
                // Hard redirect to ensure immediate transition without React state interference
                window.location.href = '/patient/emergency-call';
            } else {
                const err = await res.json();
                setError(err.detail || "Failed to initiate emergency call");
            }
        } catch (error) {
            console.error('Emergency call error:', error);
            setError("Network Error: Backend not reachable");
        } finally {
            setIsEmergencyLoading(false);
        }
    };

    const handleAmbulanceCall = () => {
        setAmbulanceCalled(true);
    };

    // Sound effect ref
    const notificationSound = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        notificationSound.current = new Audio('/sounds/notification.mp3'); // We might need to create this file or use a CDN
    }, []);

    useEffect(() => {
        if (selectedTokenStatus?.status === 'in_progress' || (selectedTokenStatus?.status === 'called' && selectedTokenStatus?.is_emergency)) {
            // Show Alert/Notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Doctor is Ready!", { body: selectedTokenStatus.is_emergency ? "EMERGENCY: Doctor is calling you now!" : "Your doctor has started the consultation. Click 'Join Video Call' now." });
            } else if ("Notification" in window && Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Doctor is Ready!", { body: selectedTokenStatus.is_emergency ? "EMERGENCY: Doctor is calling you now!" : "Your doctor has started the consultation. Click 'Join Video Call' now." });
                    }
                });
            }
        }
    }, [selectedTokenStatus?.status]);

    /*
    const requestToken = async (doctorId: number) => {
        const token = localStorage.getItem('token');
        setError(null);
        try {
            const response = await fetch(`${getApiBaseUrl()}/tokens/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ doctor_id: doctorId })
            });

            if (response.ok) {
                await checkTokenStatus();
            } else {
                const err = await response.json();
                setError(err.detail || 'Failed to request token');
            }
        } catch (error: any) {
            console.error('Error requesting token:', error);
            setError('Network Error: Check backend connection.');
        }
    };
    */
    const requestToken = async (id: number) => { };

    const joinVideoCall = async () => {
        if (!selectedTokenStatus) return; // Use selectedTokenStatus
        const token = localStorage.getItem('token');
        setError(null);
        // Navigate to video page where PeerService handles the rest
        // We use the token ID as the session ID or retrieve a session from backend
        try {
            const sessionResponse = await fetch(`${getApiBaseUrl()}/video/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token_id: selectedTokenStatus.id })
            });

            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                router.push(`/video/${session.session_id}`);
            } else {
                const err = await sessionResponse.json();
                console.error('Failed to create/join session:', err);
                throw new Error(err.detail || 'Failed to join session');
            }
        } catch (error: any) {
            console.error('Error joining video call:', error);
            setError('Network Error: backend not reachable.');
        }
    };

    const cancelToken = async () => {
        if (!selectedTokenStatus) return; // Use selectedTokenStatus
        const token = localStorage.getItem('token');
        if (!confirm('Are you sure you want to cancel this request?')) return;

        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/${selectedTokenStatus.id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Refresh logic would need to trigger update in child component, or just refresh window
                window.location.reload();
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to cancel');
            }
        } catch (e) {
            console.error('Error cancelling token:', e);
            setError('Network Error checking token');
        }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">Loading...</div>;
    if (!user || user.role !== 'patient') return null;

    const filteredDoctors = doctors.filter(doc => {
        const docSpec = (doc.specialization || '').toLowerCase().trim();
        const searchSpec = selectedDept.toLowerCase().trim();

        const matchesDept = selectedDept === 'All' || docSpec === searchSpec;
        const matchesSearch = searchTerm === '' ||
            doc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-800">
            {/* Premium Background Layer */}
            <div 
                className="fixed inset-0 z-0 opacity-[0.35] pointer-events-none mix-blend-multiply"
                style={{ 
                    backgroundImage: 'url("/hospital-bg.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            
            <div className="relative z-10">

            <nav className="relative z-20 border-b border-slate-100 bg-white sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                                <Activity size={24} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900">Medi<span className="text-blue-600">Connect</span></span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleAmbulanceCall}
                                className="hidden sm:flex items-center space-x-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                            >
                                <Ambulance size={18} />
                                <span>Call Ambulance</span>
                            </button>
                            <button
                                onClick={handleEmergencyCall}
                                disabled={isEmergencyLoading}
                                className="hidden sm:flex items-center space-x-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <AlertCircle size={18} />
                                <span>SOS Emergency</span>
                            </button>
                            <NotificationBell />
                            <div className="hidden md:flex items-center space-x-3 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="font-medium">{user.email}</span>
                            </div>
                            <button
                                onClick={() => logout('/')}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Ambulance Confirmation Modal */}
            <AnimatePresence>
                {ambulanceCalled && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <EmergencyAmbulanceModule onClose={() => setAmbulanceCalled(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold mb-2 text-slate-900">Patient Dashboard</h1>
                            <p className="text-slate-500">Find a specialized specialist for your needs</p>
                        </div>
                        <button
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className={`p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm ${isRefreshing ? 'animate-spin opacity-50' : 'hover:scale-105'}`}
                            title="Refresh Data"
                        >
                            <RefreshCcw size={20} className={isRefreshing ? 'animate-spin text-sky-500' : 'text-sky-500'} />
                        </button>
                    </div>
                </motion.div>

                {/* Connection Error Banner */}
                {error && error.includes('backend') && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top duration-500">
                        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
                            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Backend Connection Required</h3>
                                        <p className="text-sm text-slate-500 font-medium">Please verify your secure connection to the medical server.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                    <a
                                        href={`${getApiBaseUrl()}/docs`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all text-center w-full sm:w-auto"
                                    >
                                        Accept Certificate
                                    </a>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all text-center w-full sm:w-auto"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && !error.includes('backend') && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center space-x-3"
                    >
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </motion.div>
                )}

                {/* Main Tab Navigation */}
                <div className="flex space-x-1 mb-8 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
                    {['doctors', 'appointments', 'documents', 'prescriptions', 'profile', 'facilities', 'policies'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                if (tab === 'documents') {
                                    router.push('/patient/documents');
                                    return;
                                }
                                setActiveTab(tab);
                                if (tab === 'prescriptions') fetchMedicalRecords();
                                if (tab === 'appointments') fetchAppointments();
                                if (tab === 'policies') fetchPolicies();
                                if (tab === 'profile') fetchPatientProfile();
                            }}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab
                                ? 'bg-white text-sky-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Content Area based on Tab */}
                    <div className="lg:col-span-2 space-y-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'doctors' && (
                                <motion.div
                                    key="doctors"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="pt-4"
                                >
                                    {fetchError && (
                                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 animate-in fade-in slide-in-from-top-4">
                                            <AlertCircle size={20} />
                                            <div className="text-sm font-medium">
                                                <p className="font-bold">Connection Issue</p>
                                                <p className="opacity-80">{fetchError}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col space-y-6 mb-8">
                                        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {departments.map(dept => (
                                                <button
                                                    key={dept}
                                                    onClick={() => setSelectedDept(dept)}
                                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${selectedDept === dept
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {dept}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {loadingDocs ? (
                                        <div className="text-center py-20">
                                            <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-slate-500 font-medium">Loading doctors...</p>
                                        </div>
                                    ) : filteredDoctors.length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                            <Search className="mx-auto text-slate-200 mb-4" size={48} />
                                            <p className="text-slate-500 font-bold">No doctors found matching your criteria.</p>
                                            <button
                                                onClick={() => { setSearchTerm(''); setSelectedDept('All'); }}
                                                className="mt-4 text-sky-600 font-bold hover:underline"
                                            >
                                                Clear all filters
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {filteredDoctors.sort((a, b) => (b.is_available === a.is_available) ? 0 : b.is_available ? 1 : -1).map((doc) => (
                                                <DoctorTokenCard
                                                    key={doc.id}
                                                    doctor={doc}
                                                    isSelected={selectedDoctor?.id === doc.id}
                                                    onSelect={(doctor, status) => {
                                                        setSelectedDoctor(doctor);
                                                        setSelectedTokenStatus(status);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'prescriptions' && (
                                <motion.div
                                    key="prescriptions"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {loadingRecords ? (
                                        <div className="text-center py-12">Loading Records...</div>
                                    ) : medicalRecords.length === 0 ? (
                                        <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 shadow-sm">
                                            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                                            <p className="text-slate-500 font-medium">No medical records found.</p>
                                            <p className="text-slate-400 text-sm mt-2">Your doctor's prescriptions and notes will appear here.</p>
                                        </div>
                                    ) : (
                                        medicalRecords.map((rec: any) => (
                                            <div key={rec.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">{rec.diagnosis}</h3>
                                                        <p className="text-sm text-slate-500">{new Date(rec.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Record #{rec.id}</span>
                                                    <button
                                                        onClick={() => handleDownloadPrescription(rec)}
                                                        className="ml-2 p-2 bg-white text-sky-600 border border-sky-100 rounded-xl hover:bg-sky-50 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
                                                        title="Download Prescription"
                                                    >
                                                        <Download size={14} />
                                                        <span className="hidden sm:inline">Download</span>
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Treatment</span>
                                                        <p className="text-slate-700">{rec.treatment}</p>
                                                    </div>
                                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prescription</span>
                                                        <p className="text-slate-700 font-medium">{rec.prescription}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}


                            {activeTab === 'profile' && (
                                <motion.div
                                    key="profile"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                        {/* Profile Header */}
                                        <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-8 flex items-center gap-5">
                                            <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-3xl font-black shadow-inner">
                                                {(profileForm.full_name || user?.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-white">{profileForm.full_name || 'Your Profile'}</h2>
                                                <p className="text-sky-100 text-sm">{user?.email}</p>
                                                {profileForm.blood_group && (
                                                    <span className="inline-block mt-2 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                                                        🩸 {profileForm.blood_group}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Profile Form */}
                                        <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
                                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Registration Details</h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                                        value={profileForm.full_name}
                                                        onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                                                        placeholder="Your full name"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                                        value={profileForm.phone_number}
                                                        onChange={e => setProfileForm(f => ({ ...f, phone_number: e.target.value }))}
                                                        placeholder="+91 98765 43210"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                                                    <input
                                                        type="date"
                                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                                        value={profileForm.date_of_birth}
                                                        onChange={e => setProfileForm(f => ({ ...f, date_of_birth: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                                                    <select
                                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                                        value={profileForm.gender}
                                                        onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}
                                                    >
                                                        <option value="">Select Gender</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                        <option value="Prefer not to say">Prefer not to say</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
                                                    <select
                                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                                        value={profileForm.blood_group}
                                                        onChange={e => setProfileForm(f => ({ ...f, blood_group: e.target.value }))}
                                                    >
                                                        <option value="">Select Blood Group</option>
                                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                                            <option key={bg} value={bg}>{bg}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical History / Allergies</label>
                                                <textarea
                                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none h-28"
                                                    value={profileForm.medical_history_summary}
                                                    onChange={e => setProfileForm(f => ({ ...f, medical_history_summary: e.target.value }))}
                                                    placeholder="e.g., Diabetic, allergic to penicillin, hypertension..."
                                                />
                                            </div>

                                            {profileSaveMsg && (
                                                <div className={`p-3 rounded-xl text-sm font-bold ${profileSaveMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                    {profileSaveMsg.ok ? '✅ ' : '❌ '}{profileSaveMsg.text}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isSavingProfile}
                                                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-xl shadow-lg shadow-sky-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSavingProfile ? 'Saving...' : 'Save Profile'}
                                            </button>
                                        </form>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'appointments' && (
                                <motion.div
                                    key="appointments"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Book New Appointment</h3>
                                        <form onSubmit={handleBookAppointment} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <select
                                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full"
                                                    value={newAppt.doctor_id}
                                                    onChange={e => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Select Doctor</option>
                                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.specialization})</option>)}
                                                </select>
                                                <input
                                                    type="datetime-local"
                                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full"
                                                    value={newAppt.date}
                                                    onChange={e => setNewAppt({ ...newAppt, date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <textarea
                                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none h-24"
                                                placeholder="Briefly describe your symptoms..."
                                                value={newAppt.notes}
                                                onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })}
                                            />
                                            <button
                                                type="submit"
                                                disabled={booking}
                                                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all shadow-md w-full md:w-auto ml-auto block"
                                            >
                                                {booking ? 'Booking...' : 'Book Appointment'}
                                            </button>
                                        </form>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-slate-800">Your Appointments</h3>
                                        {appointments.length === 0 ? (
                                            <p className="text-slate-400">No appointments scheduled.</p>
                                        ) : (
                                            appointments.map((apt: any) => (
                                                <div key={apt.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-sky-200 transition-colors">
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <Stethoscope size={16} className="text-sky-500" />
                                                            <p className="font-bold text-slate-800">Dr. {apt.doctor_name || 'Generic Provider'}</p>
                                                        </div>
                                                        <p className="text-xs text-sky-600 font-medium ml-6">{apt.doctor_specialization || 'General Practice'}</p>
                                                        <div className="mt-2 space-y-1">
                                                            <p className="text-sm text-slate-500 flex items-center space-x-2">
                                                                <Calendar size={14} />
                                                                <span>{new Date(apt.appointment_date).toLocaleString()}</span>
                                                            </p>
                                                            {apt.notes && (
                                                                <p className="text-xs text-slate-400 max-w-md italic ml-6 border-l-2 border-slate-100 pl-2">"{apt.notes}"</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col space-y-2">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                            {apt.status}
                                                        </span>
                                                        {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                                            <Link
                                                                href={`/patient/appointments/reschedule/${apt.id}`}
                                                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-colors text-center"
                                                            >
                                                                Reschedule
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'policies' && (
                                <motion.div
                                    key="policies"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-xl font-bold text-slate-800 mb-6">Clinic Policies & Guidelines</h3>
                                    {loadingPolicies ? (
                                        <div className="text-center py-12">Loading Policies...</div>
                                    ) : policies.length === 0 ? (
                                        <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 shadow-sm">
                                            <Shield className="mx-auto text-slate-300 mb-4" size={48} />
                                            <p className="text-slate-500 font-medium">No policies found.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-6">
                                            {policies.map((policy: any) => (
                                                <div key={policy.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-center space-x-4 mb-6">
                                                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-slate-900">{policy.title}</h4>
                                                            <p className="text-xs text-slate-400">Last updated: {new Date(policy.last_updated).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="prose prose-slate max-w-none">
                                                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{policy.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'facilities' && (
                                <motion.div
                                    key="facilities"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <NearbyFacilities />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Status Panel - Always Visible */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-3xl p-8 h-fit lg:sticky lg:top-24 border border-slate-200 shadow-lg shadow-slate-200/50"
                    >
                        <h3 className="text-xl font-bold mb-6 flex items-center text-slate-800">
                            <Clock className="mr-2 text-sky-500" size={20} />
                            Mediconnect Agent
                        </h3>

                        {!selectedDoctor ? (
                            <RuleBasedChat
                                onBookAppointment={() => setActiveTab('appointments')}
                                onEmergency={handleEmergencyCall}
                            />
                        ) : !selectedTokenStatus ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-slate-50 mx-auto flex items-center justify-center mb-4 text-sky-600 font-bold text-2xl border border-sky-100">
                                    {selectedDoctor.full_name?.charAt(0)}
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">{selectedDoctor.full_name}</h4>
                                <p className="text-sky-600 font-medium text-sm mb-4">{selectedDoctor.specialization}</p>
                                <p className="text-slate-500 text-sm">No active token for this doctor.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                                    <span className="block text-sm text-slate-400 uppercase tracking-widest mb-2 relative z-10">Token Number</span>
                                    <span className="block text-5xl font-bold text-slate-800 relative z-10">#{selectedTokenStatus.token_number}</span>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-slate-500 text-sm font-medium">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${selectedTokenStatus.status === 'in_progress' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                        {selectedTokenStatus.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Show which doctor the token is for */}
                                <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-center">
                                    <span className="block text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">Doctor</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedDoctor.full_name}
                                    </span>
                                </div>

                                {selectedTokenStatus.status === 'in_progress' ? (
                                    <button
                                        onClick={joinVideoCall}
                                        className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/25 animate-pulse hover:scale-[1.02] transition-transform flex items-center justify-center space-x-2"
                                    >
                                        <Video size={20} />
                                        <span>Join Video Call</span>
                                    </button>
                                ) : (
                                    <div className="text-center text-sm text-slate-400 animate-pulse bg-slate-50 p-3 rounded-lg">
                                        Waiting for doctor to initiate call...
                                    </div>
                                )}

                                <button
                                    onClick={cancelToken}
                                    className="w-full py-3 rounded-xl bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all text-sm font-medium"
                                >
                                    Cancel Request
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    </div>
    );
}
