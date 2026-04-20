"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChatMsg {
    id: number;
    from: "bot" | "user";
    text: string;
}

const BOT_RULES: { keywords: string[]; response: string; redirectTo?: string }[] = [
    {
        keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
        response: "Hello! Welcome to City General Hospital 👋 How can I help you today? You can ask about our departments, timings, appointments, or emergency services.",
    },
    {
        keywords: ["hour", "timing", "open", "schedule", "time", "working"],
        response: "🕐 Our OPD is open Monday–Saturday from 8:00 AM to 8:00 PM. Emergency services are available 24/7, 365 days a year. For specific department timings, please call our helpline at +91 98765 43210.",
    },
    {
        keywords: ["appointment", "book", "consult", "visit", "schedule", "meet"],
        response: "📅 You can book an appointment by clicking the **'BOOK AN APPOINTMENT'** tab on the right side of the screen, or by calling +91 98765 43210. Our coordinators are available Mon–Sat, 8 AM – 6 PM.",
    },
    {
        keywords: ["emergency", "ambulance", "urgent", "critical", "accident", "icu"],
        response: "🚨 For emergencies, call our 24/7 Emergency line: **+91 98765 11111**. Our trauma and emergency department is always open and fully staffed. You can also use the Emergency module in your patient dashboard.",
    },
    {
        keywords: ["doctor", "specialist", "physician", "surgeon"],
        response: "👨‍⚕️ We have 500+ experienced doctors across 50+ specialties. You can search for a specific doctor after logging in, or call our appointment desk at +91 98765 43210 to get matched with the right specialist.",
    },
    {
        keywords: ["department", "speciality", "specialty", "cardio", "ortho", "neuro", "cancer", "oncology", "gastro", "pediatric", "gynec"],
        response: "🏥 Our Centers of Excellence include: Cardiology, Orthopaedics, Neurology, Oncology, Gastroenterology, Paediatrics, Gynaecology, Nephrology, and more. Visit our Specialities page or call us for details.",
    },
    {
        keywords: ["location", "address", "where", "map", "direction", "reach", "find us"],
        response: "📍 City General Hospital\n123 Medical Avenue, Health District\nYour City – 500001\n\nLandmark: Near Central Station. We have free parking available.",
    },
    {
        keywords: ["contact", "phone", "number", "call", "helpline", "email"],
        response: "📞 Contact us:\n• Main: +91 98765 43210\n• Emergency: +91 98765 11111\n• Appointment Desk: +91 98765 22200\n• Email: info@citygeneralhospital.com",
    },
    {
        keywords: ["insurance", "cashless", "tpa", "coverage"],
        response: "💳 We are empanelled with 50+ insurance providers including Star Health, United India, New India Assurance, and all major TPA networks. For cashless treatment, contact our Insurance Desk on arrival.",
    },
    {
        keywords: ["price", "cost", "fee", "charge", "rate", "consultation"],
        response: "💰 Consultation fees vary by department and doctor seniority. General OPD starts from ₹300. Specialist consultations range from ₹500–₹1500. Please call +91 98765 43210 for accurate pricing.",
    },
    {
        keywords: ["thank", "thanks", "okay", "ok", "great", "bye", "goodbye"],
        response: "😊 You're welcome! Stay healthy and take care. Feel free to reach out anytime. We're here to help! 💙",
    },
    {
        keywords: ["registration", "register", "signup", "sign up", "create account", "new patient"],
        response: "Registering is easy! I'm taking you to the registration page now... 📝",
        redirectTo: "/?register=true"
    },
    {
        keywords: ["login", "sign in", "signin", "log in", "existing patient"],
        response: "Sure thing! Redirecting you to the login page... 🔐",
        redirectTo: "/auth/login"
    },
    {
        keywords: ["emergency", "ambulance", "urgent", "critical", "accident", "icu", "sos"],
        response: "🚨 EMERGENCY ALERT: I am redirecting you to our Emergency SOS page immediately. Please stay calm.",
        redirectTo: "/patient/emergency-call"
    },
    {
        keywords: ["dashboard", "my profile", "my account"],
        response: "Taking you to your dashboard... 📊",
        redirectTo: "/patient/dashboard"
    }
];

interface BotResult {
    text: string;
    redirectTo?: string;
}

const DEFAULT_RESPONSE =
    "I didn't quite catch that. You can ask me about:\n• 📅 Booking an appointment\n• 🏥 Our departments & specialties\n• 🕐 Working hours\n• 📞 Contact information\n• 🚨 Emergency services";

function getBotResponse(input: string): BotResult {
    const lower = input.toLowerCase();
    for (const rule of BOT_RULES) {
        if (rule.keywords.some((kw) => lower.includes(kw))) {
            return { text: rule.response, redirectTo: rule.redirectTo };
        }
    }
    return { text: DEFAULT_RESPONSE };
}


export default function PublicChatWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            id: 1,
            from: "bot",
            text: "👋 Hello! I'm the City General Hospital virtual assistant. How can I help you today?\n\nYou can ask about appointments, departments, timings, or emergency services.",
        },
    ]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, typing]);

    const sendMessage = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        const userMsg: ChatMsg = { id: Date.now(), from: "user", text: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setTyping(true);

        setTimeout(() => {
            const { text, redirectTo } = getBotResponse(trimmed);
            setTyping(false);
            setMessages((prev) => [...prev, { id: Date.now() + 1, from: "bot", text }]);

            if (redirectTo) {
                setTimeout(() => {
                    router.push(redirectTo);
                }, 1500);
            }
        }, 800 + Math.random() * 400);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating button */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
                <AnimatePresence>
                    {!open && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="bg-white text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-full shadow-lg border border-slate-100"
                        >
                            Chat With Us
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpen((v) => !v)}
                    className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #e91e63 0%, #c2185b 100%)" }}
                    aria-label="Chat with us"
                >
                    <span className="absolute inset-0 bg-white/10 rounded-full animate-ping opacity-30" />
                    {open ? <X size={24} /> : <MessageCircle size={24} />}
                </motion.button>
            </div>

            {/* Chat window */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 30, originX: 1, originY: 1 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 30 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-24 right-6 z-[9998] w-[340px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ height: 480 }}
                    >
                        {/* Header */}
                        <div
                            className="px-4 py-3 flex items-center justify-between text-white"
                            style={{ background: "linear-gradient(135deg, #e91e63 0%, #c2185b 100%)" }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                    <Bot size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm leading-none">City Hospital Assistant</p>
                                    <p className="text-[10px] text-pink-100 mt-0.5 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
                                        Online
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-2 ${msg.from === "user" ? "flex-row-reverse" : "flex-row"}`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.from === "bot"
                                            ? "text-white"
                                            : "bg-sky-100 text-sky-600"
                                            }`}
                                        style={msg.from === "bot" ? { background: "linear-gradient(135deg,#e91e63,#c2185b)" } : {}}
                                    >
                                        {msg.from === "bot" ? <Bot size={14} /> : <User size={14} />}
                                    </div>
                                    <div
                                        className={`max-w-[78%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${msg.from === "bot"
                                            ? "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                                            : "text-white rounded-br-none"
                                            }`}
                                        style={msg.from === "user" ? { background: "linear-gradient(135deg,#0284c7,#0369a1)" } : {}}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {typing && (
                                <div className="flex items-end gap-2">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                        style={{ background: "linear-gradient(135deg,#e91e63,#c2185b)" }}
                                    >
                                        <Bot size={14} />
                                    </div>
                                    <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Type here..."
                                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim()}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                                style={{ background: "linear-gradient(135deg,#e91e63,#c2185b)" }}
                            >
                                <Send size={15} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
