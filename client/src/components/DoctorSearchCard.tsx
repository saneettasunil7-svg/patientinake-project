"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { MapPin, ArrowRight, Mic, Square, Play, Trash2, Volume2, User } from 'lucide-react';

interface DoctorSearchCardProps {
    doctor: any;
    onSelect: (doctor: any, tokenStatus: any) => void;
    isSelected: boolean;
}

export default function DoctorSearchCard({ doctor, onSelect, isSelected }: DoctorSearchCardProps) {
    const router = useRouter();
    const [tokenStatus, setTokenStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showReasonInput, setShowReasonInput] = useState(false);
    const [reason, setReason] = useState('');

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const startRecording = async () => {
        // Start Web Speech API for transcription
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => (result as any)[0])
                    .map((result: any) => (result as any).transcript)
                    .join('');
                setReason(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsTranscribing(false);
            };

            recognition.onstart = () => setIsTranscribing(true);
            recognition.onend = () => setIsTranscribing(false);

            try {
                recognition.start();
                (window as any)._recognition = recognition;
            } catch (e) {
                console.error("Failed to start recognition", e);
            }
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Microphone access is blocked by the browser.');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error('Error starting recording:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if ((window as any)._recognition) {
            try { (window as any)._recognition.stop(); } catch (e) {}
        }

        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const clearRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
    };

    useEffect(() => {
        fetchMyTokenForDoctor();
        const interval = setInterval(fetchMyTokenForDoctor, 5000);
        return () => clearInterval(interval);
    }, [doctor.id]);

    const fetchMyTokenForDoctor = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/my-token/${doctor.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTokenStatus(data);
                if (isSelected) onSelect(doctor, data);
            } else {
                setTokenStatus(null);
                if (isSelected) onSelect(doctor, null);
                if (res.status === 401 && typeof window !== 'undefined') {
                    window.location.href = '/auth/login?session_expired=true';
                }
            }
        } catch { /* Silent */ }
    };

    const handleAction = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!doctor.is_available) return;

        if (tokenStatus) {
            router.push(`/patient/doctor/${doctor.id}`);
            return;
        }

        setShowReasonInput(true);
    };

    const requestToken = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getApiBaseUrl()}/tokens/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: doctor.id,
                    reason_for_visit: reason
                })
            });

            if (response.ok) {
                const tokenData = await response.json();
                if (audioBlob) {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'reason.webm');
                    await fetch(`${getApiBaseUrl()}/tokens/${tokenData.id}/voice-reason`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                }
                await fetchMyTokenForDoctor();
                setShowReasonInput(false);
                setReason('');
                clearRecording();
            } else {
                if (response.status === 401) {
                    alert('Session expired or not authenticated. Please log in again.');
                    if (typeof window !== 'undefined') window.location.href = '/auth/login?session_expired=true';
                    return;
                }
                const errData = await response.json().catch(() => ({}));
                setError(errData.detail || 'Failed to request token');
            }
        } catch (error: any) {
            setError('Network Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={() => onSelect(doctor, tokenStatus)}
            className={`flex flex-col md:flex-row bg-white rounded-xl overflow-hidden border transition-all hover:shadow-lg relative group
                ${isSelected ? 'border-sky-500 ring-1 ring-sky-500/50' : 'border-slate-100'}
            `}
        >
            {/* Availability Badge */}
            <div className="absolute top-4 right-4 z-10">
                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${doctor.is_available ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${doctor.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span>{doctor.is_available ? 'Online' : 'Offline'}</span>
                </div>
            </div>

            {/* Profile Image Section */}
            <div className="md:w-64 h-64 md:h-auto overflow-hidden bg-slate-50 relative shrink-0">
                {doctor.profile_photo ? (
                    <img
                        src={`${getApiBaseUrl()}${doctor.profile_photo}`}
                        alt={doctor.full_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                        <User size={80} strokeWidth={1} />
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2 pr-24">
                        <h3 className="text-2xl font-black text-slate-900 border-b-2 border-sky-500 w-fit pb-1 transition-colors line-clamp-2 break-words" title={doctor.full_name}>
                            {doctor.full_name?.startsWith('Dr.') ? doctor.full_name : `Dr. ${doctor.full_name}`}
                        </h3>
                    </div>

                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {doctor.designation || 'Senior Consultant'}
                    </p>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-2">
                            <span className="text-[11px] font-black text-slate-800 uppercase shrink-0 mt-0.5">Degrees:</span>
                            <span className="text-sm text-slate-600 font-medium">{doctor.qualifications || 'MBBS, MD'}</span>
                        </div>

                        <div className="flex items-start gap-2">
                            <span className="text-[11px] font-black text-slate-800 uppercase shrink-0 mt-0.5">Speciality:</span>
                            <span className="text-sm text-sky-600 font-bold leading-relaxed">
                                {doctor.specialization}
                                {doctor.sub_specialties ? `, ${doctor.sub_specialties}` : ''}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                            <MapPin size={14} className="text-sky-500" />
                            <span className="text-sm font-medium">Amrita Hospital, Kochi</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                        {tokenStatus && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-lg border border-sky-100">
                                <span className="text-[10px] font-black text-sky-600 uppercase">Token</span>
                                <span className="text-lg font-black text-slate-800 tracking-tighter">#{tokenStatus.token_number}</span>
                            </div>
                        )}
                        {error && <p className="text-xs text-red-500 font-bold max-w-[200px]">{error}</p>}
                    </div>

                    <button
                        onClick={handleAction}
                        disabled={!doctor.is_available || loading}
                        className={`group relative flex items-center gap-3 pl-6 pr-2 py-2 rounded-full font-black text-sm uppercase tracking-widest transition-all
                            ${!doctor.is_available
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white shadow-md'
                            }
                        `}
                    >
                        <span>{tokenStatus ? 'View Profile' : 'Book Appointment'}</span>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${!doctor.is_available ? 'bg-slate-200' : 'bg-slate-900 text-white group-hover:bg-white group-hover:text-slate-900'}`}>
                            <ArrowRight size={20} className="transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Reason Input Overlay */}
            {showReasonInput && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 flex flex-col justify-center items-center p-8 text-center animate-in fade-in duration-300">
                    <h4 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">Reason for Visit?</h4>

                    <div className="w-full max-w-md space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Fever, Annual Checkup..."
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-800 focus:border-sky-500 outline-none transition-all pr-14"
                                autoFocus
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); isRecording ? stopRecording() : startRecording(); }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-slate-100 text-slate-400 hover:bg-sky-100 hover:text-sky-600'}`}
                                >
                                    {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
                                </button>
                            </div>
                        </div>

                        {isRecording && (
                            <div className="flex items-center justify-center space-x-2 text-sky-500 font-black text-[10px] uppercase tracking-widest">
                                <span className="w-2 h-2 bg-sky-500 rounded-full animate-ping" />
                                <span>{isTranscribing ? 'Listening & Transcribing...' : 'Recording Voice Note...'}</span>
                            </div>
                        )}

                        {audioUrl && !isRecording && (
                            <div className="w-full flex items-center justify-between p-4 bg-sky-50 rounded-2xl border border-sky-100 animate-in slide-in-from-bottom-2">
                                <div className="flex items-center space-x-3 text-sky-600">
                                    <Volume2 size={24} />
                                    <span className="text-xs font-black uppercase tracking-widest text-left leading-tight">Voice Message<br />Ready</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); new Audio(audioUrl).play(); }} className="p-2 bg-white text-sky-600 rounded-xl hover:bg-sky-100 transition-colors shadow-sm">
                                        <Play size={18} fill="currentColor" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); clearRecording(); }} className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-50 transition-colors shadow-sm">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowReasonInput(false); clearRecording(); }}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={requestToken}
                                disabled={loading || (!reason.trim() && !audioBlob)}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Requesting...' : 'Confirm Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
