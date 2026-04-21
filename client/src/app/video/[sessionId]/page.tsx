"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { Pill, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function VideoSession() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const { user } = useAuth();

    // Context & Meta
    const [isMounted, setIsMounted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [tokenId, setTokenId] = useState<number | null>(null);
    const [patientId, setPatientId] = useState<number | null>(null);

    // Feedback
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // Prescription Modal for Doctor Overlaid on Jitsi
    const [recordOpen, setRecordOpen] = useState(false);
    const [newRecord, setNewRecord] = useState({ diagnosis: '', treatment: '', prescription: '' });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Initial session fetch to get IDs for prescriptions and records
    useEffect(() => {
        const fetchInitialState = async () => {
            if (sessionId) {
                try {
                    const res = await fetch(`${getApiBaseUrl()}/video/session/${sessionId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setTokenId(data.token_id);
                        setPatientId(data.patient_id);
                    }
                } catch (e) { console.error('Failed to sync session data', e); }
            }
        };
        fetchInitialState();
    }, [sessionId]);

    const handleEndCall = async () => {
        try {
            // Tell backend to mark session as ended
            await fetch(`${getApiBaseUrl()}/video/session/${sessionId}/end`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (e) {
            console.error('Failed to end session on server', e);
        }

        if (user?.role === 'patient') {
            setShowFeedback(true);
        } else {
            // Pass callEnded=true and tokenId so dashboard auto-opens the prescription modal
            router.push(`/doctor/dashboard?callEnded=true&tokenId=${tokenId}`);
        }
    };

    const handleAddRecordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!tokenId || !patientId) {
            alert("Missing session details. Please wait a moment.");
            return;
        }
        try {
            const res = await fetch(`${getApiBaseUrl()}/medical-records/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    patient_id: patientId,
                    appointment_id: null,
                    diagnosis: newRecord.diagnosis,
                    treatment: newRecord.treatment,
                    prescription: newRecord.prescription,
                    token_id: tokenId
                })
            });
            if (res.ok) {
                setRecordOpen(false);
                alert("Prescription Saved Successfully!");
            }
        } catch (e) { console.error(e); }
    };

    const submitFeedback = async (skip = false) => {
        if (skip) {
            router.push('/patient/dashboard');
            return;
        }

        setIsSubmittingFeedback(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`${getApiBaseUrl()}/feedback/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: 1, // Placeholder
                    session_id: sessionId,
                    rating,
                    comment
                })
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmittingFeedback(false);
            router.push('/patient/dashboard');
        }
    };

    if (!isMounted) return null;

    const displayName = user?.role === 'doctor' ? `Dr. ${user?.email.split('@')[0]}` : user?.email.split('@')[0];

    return (
        <div className="w-full h-screen bg-[#1a120b] relative">
            {/* Feedback Modal (Only for patients when call ends) */}
            <AnimatePresence>
                {showFeedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                    >
                        <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
                            <h2 className="text-3xl font-black mb-2 tracking-tight">Call Ended</h2>
                            <p className="text-slate-500 mb-8 font-medium">How was your consultation?</p>

                            <div className="flex justify-center space-x-2 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`p-2 transition-all hover:scale-110 active:scale-95 ${rating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-slate-200'}`}
                                    >
                                        <Star size={40} fill={rating >= star ? "currentColor" : "none"} strokeWidth={rating >= star ? 0 : 2} />
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Any additional comments? (Optional)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none h-32 text-sm font-medium"
                            />

                            <div className="flex space-x-4">
                                <button
                                    onClick={() => submitFeedback(true)}
                                    className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={() => submitFeedback(false)}
                                    disabled={rating === 0 || isSubmittingFeedback}
                                    className="flex-1 py-3.5 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-200"
                                >
                                    {isSubmittingFeedback ? 'Matching...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Doctor Controls Overlay */}
            {user?.role === 'doctor' && !showFeedback && (
                <div className="absolute top-4 left-4 z-50">
                    <button
                        onClick={() => setRecordOpen(true)}
                        className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl transition font-bold"
                    >
                        <Pill size={20} />
                        <span>Quick Prescription</span>
                    </button>
                </div>
            )}

            {/* Jitsi SDK Integration */}
            <div className="w-full h-full relative z-10">
                <JitsiMeeting
                    domain="meet.ffmuc.net"
                    roomName={`mediconnect-session-${sessionId}`}
                    configOverwrite={{
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        disableModeratorIndicator: true,
                        enableWelcomePage: false,
                        prejoinPageEnabled: false,
                    }}
                    interfaceConfigOverwrite={{
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                        SHOW_CHROME_EXTENSION_BANNER: false,
                    }}
                    userInfo={{
                        displayName: displayName || 'Anonymous User',
                        email: user?.email || 'guest@example.com',
                    }}
                    onApiReady={(externalApi) => {
                        // When user clicks the red hangup button inside Jitsi
                        externalApi.addListener('videoConferenceLeft', () => {
                            handleEndCall();
                        });
                    }}
                    getIFrameRef={(iframeRef) => {
                        iframeRef.style.height = '100%';
                        iframeRef.style.width = '100%';
                    }}
                />
            </div>

            {/* Prescription Modal */}
            <AnimatePresence>
                {recordOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#1a120b] border border-amber-500/30 p-8 rounded-[3rem] w-full max-w-lg shadow-2xl relative"
                        >
                            <button onClick={() => setRecordOpen(false)} className="absolute top-6 right-6 text-amber-100/30 hover:text-amber-100">
                                <X size={24} />
                            </button>
                            <h2 className="text-2xl font-black text-amber-500 mb-6 flexItems-center">
                                <Pill className="inline text-amber-400 mr-2" />
                                Add Medical Record
                            </h2>
                            <form onSubmit={handleAddRecordSubmit} className="space-y-4">
                                <div>
                                    <label className="text-amber-100/70 text-xs font-bold uppercase tracking-wider mb-2 block">Diagnosis</label>
                                    <input
                                        required
                                        type="text"
                                        value={newRecord.diagnosis}
                                        onChange={e => setNewRecord(r => ({ ...r, diagnosis: e.target.value }))}
                                        className="w-full bg-black/20 border border-amber-500/20 text-white rounded-xl p-3 focus:outline-none focus:border-amber-500"
                                        placeholder="E.g., Mild Flu"
                                    />
                                </div>
                                <div>
                                    <label className="text-amber-100/70 text-xs font-bold uppercase tracking-wider mb-2 block">Treatment Plan</label>
                                    <textarea
                                        required
                                        value={newRecord.treatment}
                                        onChange={e => setNewRecord(r => ({ ...r, treatment: e.target.value }))}
                                        className="w-full bg-black/20 border border-amber-500/20 text-white rounded-xl p-3 focus:outline-none focus:border-amber-500 min-h-[100px]"
                                        placeholder="Rest, hydration..."
                                    />
                                </div>
                                <div>
                                    <label className="text-amber-100/70 text-xs font-bold uppercase tracking-wider mb-2 block">Prescription</label>
                                    <textarea
                                        value={newRecord.prescription}
                                        onChange={e => setNewRecord(r => ({ ...r, prescription: e.target.value }))}
                                        className="w-full bg-black/20 border border-amber-500/20 text-white rounded-xl p-3 focus:outline-none focus:border-amber-500 min-h-[100px]"
                                        placeholder="Paracetamol 500mg, twice a day..."
                                    />
                                </div>
                                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-full mt-4 transition shadow-lg shadow-amber-900/50">
                                    Save & Issue Prescription
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
