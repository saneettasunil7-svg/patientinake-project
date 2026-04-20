"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { Bell, CheckCheck, Pill, Info, X, AlertTriangle } from 'lucide-react';

interface Notification {
    id: number;
    title: string;
    message: string;
    notif_type: string;
    is_read: boolean;
    created_at: string;
}

// Generate a gentle chime sound using Web Audio API
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Play a short, pleasant two-tone chime
        const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(880, now, 0.4, 0.3);       // A5 - first ping
        playTone(1108, now + 0.15, 0.5, 0.2); // C#6 - second ping
        playTone(1319, now + 0.3, 0.6, 0.15); // E6 - third ping (chord)

        // Auto close the context after sound plays
        setTimeout(() => ctx.close(), 2000);
    } catch (e) {
        // Audio not supported in this environment, silently ignore
    }
}

// Generate a harsh alarm sound for prescriptions (3 rapid beeps)
function playPrescriptionAlarm() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;

        const playBeep = (time: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square'; // Harsher square wave for alarm
            osc.frequency.setValueAtTime(1174.66, time); // D6
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
            gain.gain.linearRampToValueAtTime(0, time + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.2);
        };

        playBeep(now);
        playBeep(now + 0.25);
        playBeep(now + 0.5);

        setTimeout(() => ctx.close(), 1500);
    } catch (e) { /* silent */ }
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<Notification | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevUnreadRef = useRef<number>(0);
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchUnreadCount = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/notifications/my/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const newCount = data.count;

                // ✅ Fetch the new notification for toast display + sound logic
                if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
                    fetchLatestForToast();
                }
                prevUnreadRef.current = newCount;
                setUnreadCount(newCount);
            }
        } catch { /* silent */ }
    }, []);

    const fetchLatestForToast = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/notifications/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data: Notification[] = await res.json();
                const latest = data.find(n => !n.is_read);
                if (latest) {
                    setToast(latest);

                    // 🚨 Play specific sound based on notification type
                    if (latest.notif_type === 'prescription' || latest.title.includes('Prescription')) {
                        playPrescriptionAlarm();
                    } else {
                        playNotificationSound();
                    }

                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = setTimeout(() => setToast(null), 6000);
                }
            }
        } catch { /* silent */ }
    };

    const fetchNotifications = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/notifications/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
            }
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await fetch(`${getApiBaseUrl()}/notifications/mark-all-read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            prevUnreadRef.current = 0;
        } catch { /* silent */ }
    };

    const markRead = async (id: number) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await fetch(`${getApiBaseUrl()}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => {
                const next = Math.max(0, prev - 1);
                prevUnreadRef.current = next;
                return next;
            });
        } catch { /* silent */ }
    };

    // Poll every 8 seconds for new notifications
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 8000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Fetch full list when dropdown opens
    useEffect(() => {
        if (open) fetchNotifications();
    }, [open]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const getIcon = (type: string) => {
        if (type === 'prescription') return <Pill size={14} className="text-emerald-500 mt-0.5 shrink-0" />;
        if (type === 'emergency') return <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />;
        return <Info size={14} className="text-sky-500 mt-0.5 shrink-0" />;
    };

    const formatTime = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
        } catch { return iso; }
    };

    return (
        <>
            {/* Toast Notification Popup */}
            {toast && (
                <div className="fixed top-5 right-5 z-[200] max-w-xs animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className="bg-white border border-sky-200 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell size={14} className="text-white" />
                                <span className="text-white text-xs font-black uppercase tracking-wider">New Notification</span>
                            </div>
                            <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="font-bold text-slate-800 text-sm">{toast.title}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">{toast.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative" ref={dropdownRef}>
                {/* Bell Button */}
                <button
                    onClick={() => setOpen(prev => !prev)}
                    className="relative p-2 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-600 transition-all border border-slate-200"
                    title="Notifications"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Dropdown Panel */}
                {open && (
                    <div className="absolute right-0 top-12 z-50 w-96 max-h-[480px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-sky-50 to-white border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Bell size={16} className="text-sky-600" />
                                <span className="font-black text-slate-800 tracking-tight">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                                <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Bell size={36} className="text-slate-200" />
                                    <p className="text-slate-400 text-sm font-medium">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => { if (!notif.is_read) markRead(notif.id); }}
                                        className={`flex items-start gap-3 px-5 py-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50
                                            ${!notif.is_read ? 'bg-sky-50/60' : 'bg-white'}`}
                                    >
                                        {/* Left dot indicator */}
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.is_read ? 'bg-sky-500' : 'bg-transparent'}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 mb-1">
                                                {getIcon(notif.notif_type)}
                                                <p className={`text-sm font-bold text-slate-800 leading-tight ${!notif.is_read ? '' : 'font-medium'}`}>
                                                    {notif.title}
                                                </p>
                                            </div>
                                            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                                                {formatTime(notif.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
