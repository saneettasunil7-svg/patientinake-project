"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, Clock, Pill, X, FileText, Activity } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    timestamp: string;
    is_read: boolean;
}

interface ChatBoxProps {
    recipientId: number;
    recipientName: string;
    currentUserId: number;
    onPrescriptionClick?: () => void;
}

export default function ChatBox({ recipientId, recipientName, currentUserId, onPrescriptionClick }: ChatBoxProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isViewingRecord, setIsViewingRecord] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, [recipientId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchHistory = async () => {
        if (!recipientId) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/chat/history/${recipientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (e) {
            console.error("Chat history error", e);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const token = localStorage.getItem('token');
        setIsLoading(true);

        try {
            const res = await fetch(`${getApiBaseUrl()}/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: newMessage,
                    receiver_id: recipientId
                })
            });

            if (res.ok) {
                setNewMessage('');
                fetchHistory();
            } else {
                const errData = await res.json().catch(() => ({ detail: 'Unknown response format' }));
                console.error("Chat send failed:", res.status, errData);
                alert(`Failed to send message: ${errData.detail || res.statusText}`);
            }
        } catch (e) {
            console.error("Failed to send message", e);
            alert(`Network error: ${e instanceof Error ? e.message : 'Unknown'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewPrescription = async (content: string) => {
        const match = content.match(/\[REF:(\d+)\]/);
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

    return (
        <div className="flex flex-col h-[500px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between relative z-10 text-slate-800">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Chat with {recipientName}</h3>
                        <p className="text-[10px] text-emerald-500 font-bold flex items-center uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Secure Connection
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">Hospital Details Only</p>
                    </div>
                    <MessageCircle size={18} className="text-slate-400" />
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/20 scroll-smooth relative z-10"
            >
                {/* Warning Banner inside chat */}
                <div className="p-3 bg-slate-800/5 rounded-2xl border border-slate-200/50 mb-4">
                    <p className="text-[10px] text-slate-500 text-center font-medium italic">
                        Notice: This chat is for discussing hospital coordinates and basic details only.
                    </p>
                </div>

                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 opacity-80">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <MessageCircle size={32} strokeWidth={1.5} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Messages</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md ${msg.sender_id === currentUserId
                                ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium'
                                }`}>
                                <p className="leading-relaxed">{msg.content}</p>
                                {msg.content.includes("issued a new prescription") && (
                                    <button
                                        onClick={() => handleViewPrescription(msg.content)}
                                        className={`mt-2 p-2 w-full rounded-xl border flex items-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${msg.sender_id === currentUserId ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-sky-50 border-sky-100 hover:bg-sky-100'}`}
                                    >
                                        <Pill size={16} className={msg.sender_id === currentUserId ? 'text-white' : 'text-sky-600'} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">View Prescription</span>
                                    </button>
                                )}
                                <div className={`text-[9px] mt-1.5 flex items-center font-bold uppercase tracking-tighter ${msg.sender_id === currentUserId ? 'text-sky-100 opacity-80' : 'text-slate-400 opacity-60'
                                    }`}>
                                    <Clock size={9} className="mr-1" />
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white border-t border-slate-100 flex items-center space-x-3 relative z-10"
            >
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Discuss hospital details..."
                        className="w-full p-3.5 bg-slate-100/50 border border-slate-200/50 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all placeholder:text-slate-400"
                    />
                    {user?.role === 'doctor' && onPrescriptionClick && (
                        <button
                            type="button"
                            onClick={onPrescriptionClick}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-sky-600 hover:bg-sky-100 rounded-xl transition-colors"
                            title="Create Prescription"
                        >
                            <Pill size={20} />
                        </button>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !newMessage.trim()}
                    className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-sky-500/20 disabled:shadow-none"
                >
                    <Send size={20} />
                </button>
            </form>
            {/* Prescription Viewer Modal */}
            <AnimatePresence>
                {isViewingRecord && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                                        <Pill size={20} />
                                    </div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Prescription Details</h3>
                                </div>
                                <button onClick={() => setIsViewingRecord(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-8">
                                {loadingRecord ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <Activity className="animate-spin text-sky-500" size={32} />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving Record...</p>
                                    </div>
                                ) : selectedRecord ? (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Diagnosis</label>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800">
                                                {selectedRecord.diagnosis}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Treatment Plan</label>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium text-slate-600 text-sm leading-relaxed">
                                                {selectedRecord.treatment}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-sky-50 rounded-[2rem] border-2 border-sky-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 text-sky-600">
                                                <FileText size={48} />
                                            </div>
                                            <label className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] mb-2 block">Medication / Prescription</label>
                                            <div className="font-black text-slate-900 text-lg leading-tight">
                                                {selectedRecord.prescription}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-center text-slate-400 font-medium">
                                            Issued on {new Date(selectedRecord.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 font-medium">
                                        This prescription record could not be found or was removed.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>

    );
}
