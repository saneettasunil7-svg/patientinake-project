"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl, getWsBaseUrl } from '@/utils/apiConfig';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, Send, X, Star, Pill, Activity, FileText, CheckCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoSession() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const { user } = useAuth();

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerServiceRef = useRef<any>(null); // Type as any for now to avoid import issues
    const wsRef = useRef<WebSocket | null>(null);
    const initiateCallRef = useRef<((id?: string) => void) | null>(null);

    // State
    const [connectionStatus, setConnectionStatus] = useState('Initializing...');
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<{ sender: string, text: string, timestamp: string }[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Context & Meta
    const [isMounted, setIsMounted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenId, setTokenId] = useState<number | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // Prescription Modal for Video Page
    const [recordOpen, setRecordOpen] = useState(false);
    const [newRecord, setNewRecord] = useState({ diagnosis: '', treatment: '', prescription: '' });
    const [patientId, setPatientId] = useState<number | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isViewingRecord, setIsViewingRecord] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const addLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [msg, ...prev].slice(0, 8));
    };

    // Auto-hide controls
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial session fetch to set base remaining_seconds
    useEffect(() => {
        const fetchInitialState = async () => {
            if (sessionId) {
                try {
                    const res = await fetch(`${getApiBaseUrl()}/video/session/${sessionId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setTimeLeft(data.remaining_seconds);
                        setTokenId(data.token_id);
                        setPatientId(data.patient_id);
                    }
                } catch (e) { console.error('Failed to sync timer', e); }
            }
        };
        fetchInitialState();
    }, [sessionId]);

    // Local countdown
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if ((connectionStatus === 'Initializing...' || connectionStatus === 'Waiting for peer...') && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    const next = Math.max(0, prev - 1);
                    if (next === 0) {
                        if (user?.role === 'doctor') {
                            addLog('Call timed out. Patient did not join.');
                            handleEndCall();
                        }
                        clearInterval(timer);
                    }
                    return next;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [connectionStatus, timeLeft, user]);

    const resetControlsTimeout = () => {
        if (!isChatOpen) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    };

    useEffect(() => {
        if (isChatOpen) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
            resetControlsTimeout();
        }
    }, [isChatOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    const [showBackendAlert, setShowBackendAlert] = useState(false);
    const [showConnectionAlert, setShowConnectionAlert] = useState(false);

    useEffect(() => {
        if (!user || !sessionId) return;

        // Deterministic Peer IDs
        const myPeerId = user.role === 'patient' ? `pat-${sessionId}` : `doc-${sessionId}`;
        const targetPeerId = user.role === 'patient' ? `doc-${sessionId}` : `pat-${sessionId}`;
        setRemotePeerId(targetPeerId);

        let peerService: any = null;
        let ws: WebSocket | null = null;
        let localStream: MediaStream | null = null;
        let mediaInitialized = false;
        let peerInitialized = false;
        let wsConnected = false;
        let callInitiated = false; // Flag to prevent multiple call attempts

        const init = async () => {
            addLog('Starting video session initialization...');

            // 1. Capture Media First
            try {
                addLog('Requesting Media Access...');
                const { PeerService } = await import('@/utils/peerService');
                peerService = new PeerService(
                    myPeerId,
                    (stream) => {
                        addLog(`Received remote stream: V=${stream.getVideoTracks().length > 0}, A=${stream.getAudioTracks().length > 0}`);
                        setHasRemoteVideo(stream.getVideoTracks().length > 0);
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = stream;
                            remoteVideoRef.current.play().catch(e => addLog(`Auto-play failed: ${e.message}`));
                        }
                        setConnectionStatus('Connected');
                        setShowConnectionAlert(true);
                        setTimeout(() => setShowConnectionAlert(false), 5000);
                        setMessages(prev => [...prev, {
                            sender: 'System',
                            text: 'Call Connected. The other party has joined.',
                            timestamp: new Date().toISOString()
                        }]);
                    },
                    (data) => {
                        if (data.type === 'chat') {
                            setMessages(prev => [...prev, data]);
                            if (!isChatOpen) setIsChatOpen(true);
                        }
                    },
                    (msg) => addLog(msg),
                    (id) => {
                        addLog(`PeerJS Ready with ID: ${id}`);
                        peerInitialized = true;
                        // If WS is already connected, send join message
                        if (wsConnected) {
                            ws?.send(JSON.stringify({ type: 'join', userId: myPeerId }));
                        }
                    }
                );
                peerServiceRef.current = peerService; // Assign early for stream access

                localStream = await peerService.startLocalStream();
                if (localVideoRef.current && localStream) {
                    localVideoRef.current.srcObject = localStream;
                    localVideoRef.current.style.transform = 'scaleX(-1)';
                    localVideoRef.current.play().catch(e => console.error("Local play error", e));
                }
                const hasVideo = (localStream?.getVideoTracks().length ?? 0) > 0;
                addLog(hasVideo ? 'Camera & Mic Active' : 'Microphone Active (No Camera)');
                setConnectionStatus('Waiting for peer...');
                mediaInitialized = true;
            } catch (e: any) {
                addLog(`Media Error: ${e.message}`);
                if (e.message.includes('permission denied')) {
                    setConnectionStatus('Camera/Mic Permission Denied');
                } else {
                    setConnectionStatus('Media Capture Error');
                }
                setError(`Could not access camera/microphone: ${e.message}`);
                return; // Cannot proceed without media
            }

            // 2. Initialize PeerJS (after media is captured)
            addLog('Initializing PeerJS...');
            peerService.initialize();

            // 3. Setup WebSocket for signaling and presence
            const wsUrl = getWsBaseUrl(sessionId);
            addLog(`Connecting to WS: ${wsUrl}`);
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            const initiateCallAsDoctor = (remotePatientId?: string) => {
                if (callInitiated || !peerService.localStream) {
                    addLog(`Call already initiated or local stream not ready. Skipping call attempt.`);
                    return;
                }
                const finalTargetId = remotePatientId || targetPeerId;
                addLog(`Attempting to call: ${finalTargetId}`);
                callInitiated = true; // Set flag to prevent immediate re-attempts

                try {
                    peerService.callPeer(finalTargetId);
                    peerService.connectData(finalTargetId);

                    // Reset callInitiated flag if connection doesn't establish within a timeout
                    setTimeout(() => {
                        setConnectionStatus(prev => {
                            if (prev !== 'Connected') {
                                addLog('Call initiation stalled... allowing manual/auto retry.');
                                callInitiated = false; // Allow retry
                                return 'Connection Stalled';
                            }
                            return prev;
                        });
                    }, 8000);
                } catch (err: any) {
                    addLog(`Call Error: ${err.message}`);
                    callInitiated = false; // Allow retry on error
                }
            };
            initiateCallRef.current = initiateCallAsDoctor;

            ws.onopen = () => {
                addLog('Backend WS Connected');
                setShowBackendAlert(false);
                wsConnected = true;
                if (peerInitialized) {
                    ws?.send(JSON.stringify({ type: 'join', userId: myPeerId }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'end') {
                        addLog('Call ended by remote party.');
                        setConnectionStatus('Call Ended');
                        if (peerServiceRef.current) {
                            peerServiceRef.current.destroy();
                            peerServiceRef.current = null;
                        }
                        setTimeout(() => {
                            if (user?.role === 'patient') {
                                router.push('/patient/dashboard');
                            } else {
                                router.push('/doctor/dashboard');
                            }
                        }, 1500);
                    } else if (data.type === 'join' || data.type === 'presence') {
                        const remoteId: string = data.userId || '';
                        addLog(`Peer presence detected: ${remoteId}`);

                        // Doctor logic: if patient joins, call them
                        if (user?.role === 'doctor' && (remoteId.startsWith('pat-') || remoteId.startsWith('patient-'))) {
                            addLog(`Recognized Patient: ${remoteId}. Ensuring call established...`);
                            initiateCallAsDoctor(remoteId);
                        }
                        // Patient logic: if doctor joins, send presence back
                        else if (user?.role === 'patient' && (remoteId.startsWith('doc-') || remoteId.startsWith('doctor-'))) {
                            addLog(`Recognized Doctor: ${remoteId}. Sending presence back.`);
                            ws?.send(JSON.stringify({ type: 'presence', userId: myPeerId }));
                        }
                    }
                } catch (e) {
                    console.error("WS message parse error:", e);
                }
            };

            ws.onerror = (e) => {
                addLog(`WS Error: ${e}`);
                setShowBackendAlert(true);
            };

            ws.onclose = () => {
                addLog('Backend WS Disconnected');
                wsConnected = false;
                setShowBackendAlert(true);
            };

            // Polling for presence if patient joined first
            let presencePollInterval: NodeJS.Timeout | null = null;
            if (user?.role === 'patient') {
                addLog('Patient: Starting presence polling for doctor...');
                presencePollInterval = setInterval(() => {
                    if (wsConnected && peerInitialized && !callInitiated && connectionStatus !== 'Connected') {
                        addLog('Patient: Polling for doctor presence...');
                        ws?.send(JSON.stringify({ type: 'presence', userId: myPeerId }));
                    }
                }, 5000); // Poll every 5 seconds
            }

            return () => {
                addLog('Cleaning up video session...');
                if (presencePollInterval) clearInterval(presencePollInterval);
                if (peerService) {
                    peerService.destroy();
                    peerServiceRef.current = null;
                }
                if (ws) {
                    ws.close();
                    wsRef.current = null;
                }
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }
            };
        };

        init();

        // Cleanup function for the useEffect
        return () => {
            // The cleanup logic is handled within the `init` function's return.
            // This ensures all resources are properly released when the component unmounts
            // or dependencies change.
        };
    }, [sessionId, user]); // Dependencies for the main effect


    const toggleAudio = () => {
        if (peerServiceRef.current) {
            peerServiceRef.current.toggleAudio(!isAudioEnabled);
            setIsAudioEnabled(!isAudioEnabled);
        }
    };

    const toggleVideo = () => {
        if (peerServiceRef.current) {
            peerServiceRef.current.toggleVideo(!isVideoEnabled);
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !peerServiceRef.current || !user) return;

        const senderName = user.role === 'doctor' ? `Dr. ${user.email.split('@')[0]}` : user.email.split('@')[0];
        const msgData = {
            type: 'chat',
            sender: senderName,
            text: newMessage,
            timestamp: new Date().toISOString()
        };

        peerServiceRef.current.sendData(msgData);
        setMessages(prev => [...prev, msgData]);
        setNewMessage('');
    };

    const handleEndCall = async () => {
        // Stop local media stream
        if (peerServiceRef.current) {
            peerServiceRef.current.destroy();
            peerServiceRef.current = null;
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'end' }));
        }

        try {
            // Tell backend to mark session as ended and broadcast 'end' to patient
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
            alert("Missing session details. Please ensure the patient has joined.");
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
                    token_id: tokenId // Assuming the backend can handle this
                })
            });
            if (res.ok) {
                const recordData = await res.json();
                setRecordOpen(false);
                const msgData = {
                    type: 'chat',
                    sender: `Dr. ${user?.email.split('@')[0]}`,
                    text: `I have issued a new prescription for you. [REF:${recordData.id}]`,
                    timestamp: new Date().toISOString()
                };
                peerServiceRef.current?.sendData(msgData);
                setMessages(prev => [...prev, msgData]);
                alert('Prescription Issued');
            }
        } catch (e) { console.error(e); }
    };

    const handleViewPrescription = async (text: string) => {
        const match = text.match(/\[REF:(\d+)\]/);
        if (!match) return;

        const recordId = match[1];
        setLoadingRecord(true);
        setIsViewingRecord(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${getApiBaseUrl()}/medical-records/${recordId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedRecord(data);
            } else {
                setSelectedRecord(null);
            }
        } catch (e) {
            console.error("Failed to fetch record", e);
        } finally {
            setLoadingRecord(false);
        }
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

    return (
        <div className="min-h-screen bg-[#1a120b] flex flex-col items-center justify-center relative overflow-hidden"
            onMouseMove={resetControlsTimeout} onTouchStart={resetControlsTimeout}>

            {/* Feedback Modal */}
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
                                    {isSubmittingFeedback ? 'Matches...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-orange-900/10 pointer-events-none" />

            <div className="absolute top-20 left-6 z-20 bg-black/50 text-xs text-amber-100/80 p-2 rounded max-w-xs font-mono pointer-events-none">
                <p className="font-bold underline mb-1">Logs:</p>
                {logs.map((l, i) => (
                    <p key={i} className="opacity-70 truncate">{l}</p>
                ))}
            </div >

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`absolute top-6 left-6 z-20 flex items-center space-x-3 backdrop-blur-md px-4 py-2 rounded-full border border-amber-500/10 ${connectionStatus.includes('Error')
                    ? 'bg-red-900/80 border-red-500/50'
                    : 'bg-[#1a120b]/60'
                    }`}
            >
                <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                <div>
                    <p className="text-sm font-medium text-amber-100">{connectionStatus}</p>
                    <p className="text-xs text-amber-100/50">PeerJS Video</p>
                </div>
            </motion.div>

            <AnimatePresence>
                {showConnectionAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg border border-white/20 flex items-center space-x-2"
                    >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="font-bold">Call Connected!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative w-full h-full md:w-[90%] md:h-[85vh] md:rounded-2xl overflow-hidden bg-black shadow-2xl border border-amber-500/10 group">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {!hasRemoteVideo && connectionStatus === 'Connected' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1a120b]/80 backdrop-blur-md text-white">
                        <VideoOff size={48} className="text-amber-500 mb-4 opacity-50" />
                        <p className="text-lg font-bold">User has camera disabled</p>
                        <p className="text-xs text-amber-100/40">Sharing audio only</p>
                    </div>
                )}

                {connectionStatus !== 'Connected' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xl text-white">
                        <div className="animate-pulse flex flex-col items-center mb-6">
                            <Users className="w-24 h-24 mb-4 opacity-50 text-amber-500" />
                            <p className="text-xl font-semibold mb-2">
                                {user?.role === 'patient' ? 'Connecting to Doctor...' : connectionStatus}
                            </p>
                            <p className="text-sm opacity-70 max-w-xs text-center mb-4">
                                {user?.role === 'patient' ? 'Please wait while we establish a secure connection.' : 'Waiting for other party to join...'}
                            </p>
                            {(timeLeft > 0) && (
                                <div className="flex items-center space-x-2 bg-red-900/30 border border-red-500/20 px-4 py-2 rounded-full">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-red-200 font-bold uppercase tracking-wider">
                                        Timing out in {timeLeft} seconds
                                    </span>
                                </div>
                            )}

                            {connectionStatus === 'Connection Stalled' && user?.role === 'doctor' && (
                                <button
                                    onClick={() => initiateCallRef.current?.()}
                                    className="mt-6 px-6 py-3 bg-amber-500 text-white font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                                >
                                    <RefreshCcw size={20} />
                                    <span>Retry Connection</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
                    className="absolute top-4 right-4 w-32 md:w-64 aspect-[3/4] md:aspect-video bg-neutral-800 rounded-xl border border-amber-500/20 overflow-hidden shadow-2xl z-20 cursor-move"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                <div className="absolute top-6 left-6 z-20 pointer-events-none">
                    <p className="text-sm font-black text-amber-500 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">MediConnect Live</p>
                    <div className="mt-2 space-y-1">
                        {logs.map((log, i) => (
                            <p key={i} className="text-[10px] text-white/40 font-mono bg-black/20 px-2 py-0.5 rounded border border-white/5 backdrop-blur-sm max-w-[200px] truncate">
                                {log}
                            </p>
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 z-30"
                        >
                            <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-lg px-6 py-3 rounded-2xl border border-amber-500/20 shadow-xl pointer-events-auto">
                                <button onClick={toggleAudio} className={`p-4 rounded-full ${isAudioEnabled ? 'bg-amber-900/50' : 'bg-red-500'} text-white`} title={isAudioEnabled ? "Mute Mic" : "Unmute Mic"}>
                                    {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>
                                <button onClick={toggleVideo} className={`p-4 rounded-full ${isVideoEnabled ? 'bg-amber-900/50' : 'bg-red-500'} text-white`} title={isVideoEnabled ? "Stop Video" : "Start Video"}>
                                    {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                                </button>

                                <button onClick={handleEndCall} className="p-5 rounded-full bg-red-600 text-white hover:scale-105 transition shadow-lg shadow-red-900/40" title="End Call">
                                    <PhoneOff size={32} />
                                </button>

                                <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-4 rounded-full ${isChatOpen ? 'bg-amber-600' : 'bg-amber-900/50'} text-white`} title="Chat">
                                    <MessageSquare size={24} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isChatOpen && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="absolute top-0 right-0 h-full w-full md:w-80 bg-[#1a120b]/95 backdrop-blur-xl border-l border-amber-500/10 z-40 flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-amber-500/10">
                                <h3 className="text-amber-100 font-bold">Consultation Chat</h3>
                                <button onClick={() => setIsChatOpen(false)} className="md:hidden"><X className="text-amber-100" /></button>
                                <button onClick={() => setIsChatOpen(false)} className="hidden md:block hover:text-red-400 text-amber-100/50"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-amber-100/30 text-sm mt-10">
                                        <p>No messages yet.</p>
                                        <p>Patients can list symptoms here.</p>
                                    </div>
                                )}
                                {messages.map((msg, idx) => {
                                    const senderName = msg.sender || 'Unknown';
                                    const isMe = user?.email?.split('@')[0] === senderName.replace('Dr. ', '');
                                    const isDoctorMsg = senderName.startsWith('Dr.');

                                    return (
                                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${isMe
                                                ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white rounded-tr-none'
                                                : isDoctorMsg
                                                    ? 'bg-amber-900/40 border border-amber-500/20 text-amber-100 rounded-tl-none'
                                                    : 'bg-[#2a221b] border border-white/5 text-amber-100 rounded-tl-none'
                                                }`}>
                                                <span className="text-xs opacity-50 block mb-1 font-bold">{senderName}</span>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                                {msg.text.includes("issued a new prescription") && (
                                                    <button
                                                        onClick={() => handleViewPrescription(msg.text)}
                                                        className={`mt-2 p-2 w-full rounded-xl border flex items-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-amber-900/40 border-amber-500/20 hover:bg-amber-900/60'}`}
                                                    >
                                                        <Pill size={16} className="text-amber-400" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">View Prescription</span>
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-amber-100/30 mt-1 px-2">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-amber-500/10 bg-[#150f09]">
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        className="w-full bg-amber-900/10 text-amber-100 rounded-full py-3 pl-5 pr-12 outline-none border border-amber-500/10 focus:border-amber-500/40 focus:bg-amber-900/20 transition-all placeholder:text-amber-100/20"
                                        placeholder="Type symptoms or notes..."
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="absolute right-2 p-2 bg-amber-600 rounded-full text-white hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 transition-colors shadow-lg shadow-amber-900/20"
                                    >
                                        <Send size={16} />
                                    </button>
                                    {user?.role === 'doctor' && (
                                        <button
                                            type="button"
                                            onClick={() => setRecordOpen(true)}
                                            className="absolute right-12 p-2 text-amber-400 hover:text-amber-300 transition-colors"
                                            title="Issue Prescription"
                                        >
                                            <Pill size={20} />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                            <div className="mb-8">
                                <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30">
                                    <Pill className="text-amber-500" size={28} />
                                </div>
                                <h2 className="text-3xl font-black text-amber-500 tracking-tight">Issue Prescription</h2>
                                <p className="text-amber-100/60 font-medium">Record medical details for the current patient.</p>
                            </div>
                            <form onSubmit={handleAddRecordSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-amber-500/70 ml-1">Diagnosis</label>
                                    <input
                                        className="w-full bg-amber-900/10 border-2 border-amber-500/10 rounded-2xl p-4 text-amber-100 outline-none focus:border-amber-500/40 transition-all placeholder:text-amber-100/20 font-medium"
                                        placeholder="e.g., Seasonal Flu, Migraine..."
                                        value={newRecord.diagnosis}
                                        onChange={e => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-amber-500/70 ml-1">Treatment</label>
                                    <input
                                        className="w-full bg-amber-900/10 border-2 border-amber-500/10 rounded-2xl p-4 text-amber-100 outline-none focus:border-amber-500/40 transition-all placeholder:text-amber-100/20 font-medium"
                                        placeholder="e.g., Bed rest, hydration..."
                                        value={newRecord.treatment}
                                        onChange={e => setNewRecord({ ...newRecord, treatment: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-amber-500/70 ml-1">Prescription</label>
                                    <textarea
                                        className="w-full bg-amber-900/10 border-2 border-amber-500/10 rounded-2xl p-4 text-amber-100 outline-none focus:border-amber-500/40 transition-all h-32 resize-none placeholder:text-amber-100/20 font-medium"
                                        placeholder="e.g., Paracetamol 500mg, 1-0-1..."
                                        value={newRecord.prescription}
                                        onChange={e => setNewRecord({ ...newRecord, prescription: e.target.value })}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 uppercase tracking-widest text-sm"
                                >
                                    Save & Send to Patient
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Prescription Viewer Modal */}
            <AnimatePresence>
                {isViewingRecord && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#1a120b] border border-amber-500/30 rounded-[3rem] w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-amber-500/10 flex items-center justify-between bg-amber-500/5">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">
                                        <Pill size={20} />
                                    </div>
                                    <h3 className="font-black text-amber-500 uppercase tracking-tight">Prescription Details</h3>
                                </div>
                                <button onClick={() => setIsViewingRecord(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <X size={20} className="text-amber-100/30" />
                                </button>
                            </div>

                            <div className="p-8">
                                {loadingRecord ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <Activity className="animate-spin text-amber-500" size={32} />
                                        <p className="text-xs font-bold text-amber-500/50 uppercase tracking-widest">Retrieving Record...</p>
                                    </div>
                                ) : (selectedRecord ? (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.2em] mb-2 block">Diagnosis</label>
                                            <div className="p-4 bg-amber-900/10 rounded-2xl border border-amber-500/10 font-bold text-amber-100">
                                                {selectedRecord.diagnosis}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.2em] mb-2 block">Treatment Plan</label>
                                            <div className="p-4 bg-amber-900/10 rounded-2xl border border-amber-500/10 font-medium text-amber-100/70 text-sm leading-relaxed">
                                                {selectedRecord.treatment}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-amber-500/10 rounded-[2rem] border-2 border-amber-500/20 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
                                                <FileText size={48} />
                                            </div>
                                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 block">Medication / Prescription</label>
                                            <div className="font-black text-amber-100 text-lg leading-tight">
                                                {selectedRecord.prescription}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-center text-amber-100/30 font-medium font-mono">
                                            ISSUED: {new Date(selectedRecord.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-amber-100/30 font-medium">
                                        Prescription record not found.
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
