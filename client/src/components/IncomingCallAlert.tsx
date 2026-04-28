"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { Video, Phone, PhoneOff, X } from 'lucide-react';

export default function IncomingCallAlert() {
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [showMissedCall, setShowMissedCall] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Poll for incoming calls every 10 seconds
        const interval = setInterval(checkIncomingCall, 10000);
        return () => clearInterval(interval);
    }, []);

    // Timer logic when an incoming call is active
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (incomingCall) {
            // Set the initial timeLeft from the server's remaining_seconds
            setTimeLeft(incomingCall.remaining_seconds);

            timer = setInterval(() => {
                setTimeLeft(prev => {
                    const next = Math.max(0, prev - 1);
                    if (next === 0) {
                        handleTimeout();
                        clearInterval(timer);
                    }
                    return next;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [incomingCall]);

    const handleTimeout = () => {
        setIncomingCall(null);
        setShowMissedCall(true);
    };

    const checkIncomingCall = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role !== 'patient') {
                    // console.log("[IncomingCallAlert] Role is not patient, skipping poll.");
                    return;
                }
            } catch (e) { return; }
        }

        try {
            const res = await fetch(`${getApiBaseUrl()}/video/incoming-call`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (!incomingCall || incomingCall.session_id !== data.session_id) {
                    setIncomingCall(data);
                    setShowMissedCall(false);
                }
            } else {
                if (incomingCall) {
                    setIncomingCall(null);
                }
            }
        } catch {
            // Network error (e.g. backend restarting) - silently ignore
        }
    };

    const handleAccept = () => {
        if (incomingCall) {
            const sessionId = incomingCall.session_id;
            setIncomingCall(null); // Clear state locally as we navigate away
            router.push(`/video/${sessionId}`);
        }
    };

    const handleDecline = () => {
        setIncomingCall(null);
    };

    if (showMissedCall) {
        return (
            <div className="fixed top-20 right-6 z-[110] bg-white border-2 border-red-100 p-1 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-right duration-500 max-w-xs w-full overflow-hidden">
                <div className="bg-red-50 p-4 rounded-[1.4rem] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                            <PhoneOff size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 tracking-tight">Missed Call</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Doctor unreachable</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowMissedCall(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-100 text-red-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        );
    }

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            {/* Pulsing Background Ring */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                <div className="w-96 h-96 bg-sky-500/20 rounded-full animate-ping opacity-75"></div>
                <div className="absolute w-[30rem] h-[30rem] bg-sky-500/10 rounded-full animate-pulse opacity-50"></div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden border border-white/20 z-10 mx-4">
                <div className="flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-sky-500/40 animate-bounce">
                            <Video size={40} strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white w-10 h-10 rounded-full border-4 border-white flex items-center justify-center font-bold text-sm shadow-md animate-pulse">
                            {timeLeft}s
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Incoming Video Call</h3>
                    <p className="text-slate-500 mb-8 font-medium">Your doctor is ready for your consultation.</p>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                            onClick={handleDecline}
                            className="py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <PhoneOff size={24} className="text-slate-500" />
                            <span className="text-sm">Decline</span>
                        </button>
                        <button
                            onClick={handleAccept}
                            className="py-4 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 animate-pulse"
                        >
                            <Phone size={24} />
                            <span className="text-sm">Answer Now</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
