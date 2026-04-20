"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Ambulance, MapPin, Phone, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/apiConfig';

interface AgencyResponse {
    id: number;
    name: string;
    license_number: string;
    phone_number?: string;
    distance_km: number;
    available_units_count: number;
}

interface BookingResponse {
    id: number;
    status: string;
    unit_id?: number | null;
    timestamp: string;
    agency_phone?: string | null;
}

const EMERGENCY_NUMBERS = [
    { country: 'General (India)', number: '108' },
    { country: 'General (Global)', number: '911' },
    { country: 'General (UK)', number: '112' }
];

interface EmergencyAmbulanceModuleProps {
    onClose?: () => void;
}

export default function EmergencyAmbulanceModule({ onClose }: EmergencyAmbulanceModuleProps) {
    const { user, token, isLoading } = useAuth();

    const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'list' | 'booking' | 'booked' | 'failed'>('idle');
    const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(null);
    const [agencies, setAgencies] = useState<AgencyResponse[]>([]);
    const [booking, setBooking] = useState<BookingResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Preload audio
    useEffect(() => {
        audioRef.current = new Audio('/sounds/emergency_alert.mp3');
        audioRef.current.preload = 'auto';

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const playAlertSound = () => {
        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => {
                    playFallbackAlert();
                });
            } else {
                playFallbackAlert();
            }
        } catch (e) {
            playFallbackAlert();
        }
    };

    const playFallbackAlert = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.3);
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.6);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.6);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.9);
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.9);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.log("Audio completely blocked", e);
        }
    };

    const handleEmergencyRequest = () => {
        if (!user && !isLoading) {
            setErrorMessage("You must be logged in to book an ambulance.");
            setStatus('failed');
            return;
        }

        playAlertSound();
        setStatus('locating');

        if (!navigator.geolocation) {
            handleFailure("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                setCoordinates(position.coords);
                setStatus('searching');
                try {
                    const res = await fetch(`${getApiBaseUrl()}/ambulance/nearby`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            radius_km: 50.0
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setAgencies(data);
                        setStatus('list');
                    } else {
                        handleFailure("Failed to fetch nearby agencies.");
                    }
                } catch (err) {
                    handleFailure("Network error finding agencies.");
                }
            },
            (error) => {
                let msg = "Failed to get location.";
                if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied.";
                else if (error.code === error.POSITION_UNAVAILABLE) msg = "Location information unavailable.";
                else if (error.code === error.TIMEOUT) msg = "Location request timed out.";
                handleFailure(msg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleFailure = (msg: string) => {
        setErrorMessage(msg);
        setStatus('failed');
    };

    const handleBook = async (agencyId: number) => {
        if (!coordinates) return;
        setStatus('booking');
        try {
            const res = await fetch(`${getApiBaseUrl()}/ambulance/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    agency_id: agencyId,
                    patient_lat: coordinates.latitude,
                    patient_lng: coordinates.longitude,
                    status: 'Pending'
                })
            });
            if (res.ok) {
                const data = await res.json();
                setBooking(data);
                setStatus('booked');
            } else {
                handleFailure("Failed to book ambulance.");
            }
        } catch (err) {
            handleFailure("Network error during booking.");
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full mx-auto shadow-2xl border border-red-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full pointer-events-none -z-10" />
            <div className={`absolute inset-0 pointer-events-none z-0 rounded-3xl ${status === 'idle' ? 'animate-pulse text-red-500/10' : ''}`} style={{ boxShadow: status === 'idle' ? 'inset 0 0 50px -10px currentColor' : 'none' }}></div>

            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    animate={
                        status === 'idle'
                            ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                            : status === 'locating' || status === 'searching'
                                ? { rotate: 360 }
                                : {}
                    }
                    transition={
                        status === 'idle'
                            ? { repeat: Infinity, duration: 2 }
                            : status === 'locating' || status === 'searching'
                                ? { repeat: Infinity, duration: 1, ease: 'linear' }
                                : {}
                    }
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${status === 'failed' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}
                >
                    {status === 'failed' ? <AlertTriangle size={36} /> : <Ambulance size={36} />}
                </motion.div>

                <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center mb-2">
                    {status === 'idle' && "Need An Ambulance?"}
                    {status === 'locating' && "Pinpointing Location..."}
                    {status === 'searching' && "Finding Nearby Agencies..."}
                    {status === 'list' && "Nearby Ambulances"}
                    {status === 'booking' && "Confirming Dispatch..."}
                    {status === 'booked' && "Ambulance Dispatched!"}
                    {status === 'failed' && "Emergency Fallback"}
                </h2>

                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full flex flex-col items-center mt-4"
                        >
                            <p className="text-slate-500 text-center mb-8 font-medium">
                                Press the button below to instantly request the nearest available ambulance to your GPS location.
                            </p>
                            <button
                                onClick={handleEmergencyRequest}
                                className="w-full py-5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-lg shadow-red-500/40 relative overflow-hidden group"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <AlertTriangle size={24} /> Locate Nearby Units
                                </span>
                            </button>
                        </motion.div>
                    )}

                    {(status === 'locating' || status === 'searching' || status === 'booking') && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full mt-6 space-y-4"
                        >
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-red-500 rounded-full"
                                    initial={{ width: "10%" }}
                                    animate={{ width: status === 'locating' ? "30%" : status === 'searching' ? "60%" : "90%" }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                            <div className="flex items-center justify-center gap-2 text-slate-500 font-medium text-sm">
                                {status === 'locating' ? <MapPin size={16} className="animate-bounce" /> : <Ambulance size={16} className="animate-bounce" />}
                                <span>{status === 'locating' ? "Acquiring GPS..." : status === 'searching' ? "Querying agencies..." : "Booking..."}</span>
                            </div>
                        </motion.div>
                    )}

                    {status === 'list' && (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mt-4 space-y-3 max-h-64 overflow-y-auto pr-2">
                            {agencies.length === 0 ? (
                                <p className="text-center text-slate-500">No agencies found nearby.</p>
                            ) : (
                                agencies.map(ag => (
                                    <div key={ag.id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-slate-800 leading-tight">{ag.name}</h3>
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full whitespace-nowrap">
                                                {ag.distance_km ? ag.distance_km.toFixed(1) : '?'} km
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-sm border py-1 px-2 rounded font-medium text-slate-600 bg-slate-50">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ag.available_units_count > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {ag.available_units_count} Units Free
                                                {/* Estimated Arrival = Dist * 2 mins roughly */}
                                                <span className="ml-2">({Math.round((ag.distance_km || 0) * 2)}m ETA)</span>
                                            </div>
                                            {ag.phone_number && (
                                                <div className="flex items-center text-xs text-slate-500 font-medium mb-1">
                                                    <Phone size={12} className="mr-1" />
                                                    <a href={`tel:${ag.phone_number}`} className="hover:text-sky-600 transition-colors">{ag.phone_number}</a>
                                                </div>
                                            )}
                                            <button
                                                disabled={ag.available_units_count === 0}
                                                onClick={() => handleBook(ag.id)}
                                                className={`px-4 py-2 ${ag.available_units_count > 0 ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/30' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} rounded-lg font-bold transition-all`}
                                            >
                                                Book
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                            <button onClick={() => setStatus('idle')} className="w-full text-center text-slate-500 mt-2 text-sm underline hover:text-slate-800">Cancel</button>
                        </motion.div>
                    )}

                    {status === 'booked' && booking && (
                        <motion.div
                            key="booked"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full mt-4"
                        >
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6 text-center">
                                <p className="text-red-800 text-sm font-bold uppercase tracking-widest mb-1">Emergency Booking #{booking.id}</p>
                                <p className="text-2xl font-black text-red-600 mb-2">{booking.status === 'Active' ? 'Assigned to Unit' : 'Pending Dispatch'}</p>
                                <div className="flex items-center justify-center gap-2 text-slate-600 mb-4 bg-white py-2 rounded-lg font-medium">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    Please stay calm and wait.
                                </div>
                                <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1 mb-4">
                                    <ShieldCheck size={14} className="text-green-600" /> Authorized Request
                                </p>

                                {booking.agency_phone && (
                                    <a
                                        href={`tel:${booking.agency_phone}`}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-4 rounded-xl font-bold mt-2 shadow-lg hover:bg-slate-800 transition-colors"
                                    >
                                        <Phone size={18} className="text-green-400" /> Call Dispatch: {booking.agency_phone}
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {status === 'failed' && (
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full mt-4"
                        >
                            <div className="bg-orange-50 text-orange-800 p-4 rounded-xl mb-6 text-center text-sm font-medium border border-orange-200">
                                {errorMessage}
                                <br />
                                <span className="font-bold mt-2 block">Please use national emergency numbers immediately.</span>
                            </div>
                            <div className="space-y-3">
                                {EMERGENCY_NUMBERS.map((em, idx) => (
                                    <a
                                        key={idx}
                                        href={`tel:${em.number}`}
                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-between px-6 group"
                                    >
                                        <span className="text-slate-300 group-hover:text-white transition-colors">{em.country}</span>
                                        <div className="flex items-center gap-2 text-red-400 group-hover:text-red-300 transition-colors">
                                            <Phone size={18} />
                                            <span className="text-xl font-black">{em.number}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                            <button
                                onClick={() => setStatus('idle')}
                                className="w-full mt-6 py-3 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors border border-slate-200 rounded-xl hover:bg-slate-50"
                            >
                                Try Automatic Request Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full z-20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            )}
        </div>
    );
}
