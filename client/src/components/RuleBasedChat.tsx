import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    text: string;
    sender: 'bot' | 'user';
    options?: { label: string; value: string; action?: () => void }[];
}

interface RuleBasedChatProps {
    onBookAppointment?: () => void;
    onEmergency?: () => void;
}

export default function RuleBasedChat({ onBookAppointment, onEmergency }: RuleBasedChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        addBotMessage("Hello! I'm your virtual health assistant. How can I help you today?", [
            { label: "Check Symptoms", value: "symptoms" },
            { label: "Book Appointment", value: "book", action: onBookAppointment },
            { label: "Emergency Help", value: "emergency", action: onEmergency }
        ]);
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const addBotMessage = (text: string, options?: Message['options']) => {
        setTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text,
                sender: 'bot',
                options
            }]);
            setTyping(false);
        }, 600);
    };

    const handleOptionClick = (option: { label: string; value: string; action?: () => void }) => {
        // Add user response
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: option.label,
            sender: 'user'
        }]);

        if (option.action) {
            option.action();
            return;
        }

        // Handle Logic
        processResponse(option.value);
    };

    const processResponse = (value: string) => {
        switch (value) {
            case 'symptoms':
                addBotMessage("I see. What is the primary symptom you are experiencing?", [
                    { label: "Headache / Migraine", value: "headache" },
                    { label: "Fever / Flu", value: "fever" },
                    { label: "Stomach Pain", value: "stomach" },
                    { label: "Joint / Bone Pain", value: "joint" },
                    { label: "Other", value: "other" }
                ]);
                break;

            case 'headache':
            case 'fever':
                addBotMessage("Based on your symptoms, I recommend seeing a General Physician or Neurologist. Would you like to check the available doctors?", [
                    { label: "View General Physicians", value: "view_gen", action: onBookAppointment }, // Can lead to filtering in future
                    { label: "Check Other Symptoms", value: "symptoms" }
                ]);
                break;

            case 'stomach':
                addBotMessage("Digestive issues are best handled by a Gastroenterologist or General Physician. Ensure you stay hydrated.", [
                    { label: "Book Appointment", value: "book", action: onBookAppointment },
                    { label: "Back to Start", value: "restart" }
                ]);
                break;

            case 'joint':
                addBotMessage("For joint or bone pain, an Orthopedic specialist would be best.", [
                    { label: "Book Appointment", value: "book", action: onBookAppointment },
                    { label: "Back to Start", value: "restart" }
                ]);
                break;

            case 'other':
                addBotMessage("If your symptoms are severe or life-threatening, please use the Emergency SOS button immediately.", [
                    { label: "Emergency SOS", value: "sos", action: onEmergency },
                    { label: "Consult General Doctor", value: "book", action: onBookAppointment }
                ]);
                break;

            case 'restart':
                setMessages([]);
                addBotMessage("Hello! I'm your virtual health assistant. How can I help you today?", [
                    { label: "Check Symptoms", value: "symptoms" },
                    { label: "Book Appointment", value: "book", action: onBookAppointment },
                    { label: "Emergency Help", value: "emergency", action: onEmergency }
                ]);
                break;

            default:
                addBotMessage("I'm not sure I understood. Let's start over.", [
                    { label: "Start Over", value: "restart" }
                ]);
        }
    };

    const handleReset = () => {
        setMessages([]);
        addBotMessage("Hello! I'm your virtual health assistant. How can I help you today?", [
            { label: "Check Symptoms", value: "symptoms" },
            { label: "Book Appointment", value: "book", action: onBookAppointment },
            { label: "Emergency Help", value: "emergency", action: onEmergency }
        ]);
    };

    return (
        <div className="flex flex-col h-[400px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/50">
                        <Bot className="text-sky-400" size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Health Assistant</h3>
                        <div className="flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-slate-400">Online</span>
                        </div>
                    </div>
                </div>
                <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white transition-colors" title="Reset Chat">
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] space-y-2`}>
                                <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'user'
                                        ? 'bg-sky-600 text-white rounded-tr-sm'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                                    }`}>
                                    {msg.text}
                                </div>

                                {msg.options && (
                                    <div className="flex flex-wrap gap-2">
                                        {msg.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionClick(opt)}
                                                className="px-3 py-1.5 bg-white border border-sky-200 text-sky-600 rounded-lg text-xs font-bold hover:bg-sky-50 hover:border-sky-300 transition-all shadow-sm"
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {typing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">This is an automated assistant. For medical emergencies, call emergency services.</p>
            </div>
        </div>
    );
}
