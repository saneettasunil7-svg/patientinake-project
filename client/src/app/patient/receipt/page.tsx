"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Mail, MessageCircle, Download, Activity } from 'lucide-react';
import { Suspense } from 'react';

function ReceiptPageContent() {
    const { user, token: authToken, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenId = searchParams.get('tokenId');
    const doctorId = searchParams.get('doctorId');

    const [receiptData, setReceiptData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchReceipt = async () => {
            if (!tokenId) return;
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${getApiBaseUrl()}/tokens/${tokenId}/receipt`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setReceiptData(data);
                } else {
                    console.error("Failed to fetch receipt");
                }
            } catch (err) {
                console.error("Error fetching receipt:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (user && tokenId) fetchReceipt();
        else if (!tokenId) setIsLoading(false);
    }, [tokenId, user]);

    if (authLoading || isLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-50">Loading Receipt...</div>;
    }

    if (!receiptData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Receipt Not Found</h2>
                <p className="text-slate-500 mb-6">We couldn't retrieve the details for this transaction.</p>
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const formattedDate = new Date(receiptData.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const shareText = `Payment Receipt from MediConnect\n\nPatient: ${receiptData.patient_name}\nDoctor: Dr. ${receiptData.doctor_name} (${receiptData.doctor_specialization})\nToken Number: ${receiptData.token_number}\nAmount Paid: ₹${receiptData.payment_amount}\nDate: ${formattedDate}\nStatus: ${receiptData.payment_status.toUpperCase()}`;

    const [isJoining, setIsJoining] = useState(false);

    const handleJoinCall = async () => {
        setIsJoining(true);
        try {
            const token = localStorage.getItem('token');
            const sessionResponse = await fetch(`${getApiBaseUrl()}/video/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ token_id: parseInt(tokenId!) })
            });
            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                router.push(`/video/${session.session_id}`);
            } else {
                alert('Wait for the doctor to start the call.');
            }
        } catch (e) {
            console.error(e);
            alert('Error joining call');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 flex flex-col items-center pt-8 px-4 relative overflow-hidden">
            {/* Background Details */}
            <div className="absolute top-0 w-full h-64 bg-indigo-600 rounded-b-[3rem] -z-10"></div>

            {/* Header */}
            <div className="w-full max-w-md flex justify-between items-center mb-6 text-white px-2">
                <button onClick={() => router.push(`/patient/doctor/${doctorId}`)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center space-x-2 font-bold text-lg">
                    <Activity size={20} />
                    <span>MediConnect</span>
                </div>
                <div className="w-9"></div> {/* Spacer */}
            </div>

            {/* Receipt Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative"
            >
                {/* Torn paper effect bottom (CSS trick with radial gradients) */}
                <div className="absolute bottom-0 left-0 w-full h-4 bg-repeat-x" style={{
                    backgroundImage: 'radial-gradient(circle at 10px 10px, transparent 10px, #fff 11px)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 -10px'
                }}></div>

                {/* Card Header component */}
                <div className="bg-emerald-50 p-6 text-center border-b border-emerald-100/50">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                        <CheckCircle size={32} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-800 mb-1">Payment Successful</h2>
                    <p className="text-emerald-600/80 text-sm font-medium">Thank you for your payment!</p>
                </div>

                <div className="p-8 pb-10 space-y-6">
                    {/* Amount */}
                    <div className="text-center pb-6 border-b border-slate-100 border-dashed">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Paid</p>
                        <h1 className="text-4xl font-black text-slate-900">₹{receiptData.payment_amount}</h1>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-4">
                        <ReceiptRow label="Transaction Date" value={formattedDate} />
                        <ReceiptRow label="Token Number" value={`#${receiptData.token_number}`} highlight />
                        <ReceiptRow label="Patient Name" value={receiptData.patient_name} />
                        <ReceiptRow label="Consulting Doctor" value={`Dr. ${receiptData.doctor_name}`} subValue={receiptData.doctor_specialization} />
                        <ReceiptRow label="Status" value={receiptData.payment_status.toUpperCase()} status={receiptData.payment_status === 'completed' ? 'success' : 'pending'} />
                    </div>
                </div>
            </motion.div>

            {/* Share Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-md mt-8 space-y-3"
            >
                <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-100 flex items-start gap-2 mb-6">
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                    <p>A copy of this receipt has been automatically sent to your registered email and phone number.</p>
                </div>

                <button
                    onClick={handleJoinCall}
                    disabled={isJoining}
                    className="w-full flex justify-center items-center py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                >
                    {isJoining ? 'Connecting...' : 'Join Video Call'}
                </button>

                <button
                    onClick={() => router.push(`/patient/doctor/${doctorId}`)}
                    className="w-full mt-4 py-4 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition-colors"
                >
                    Return to Dashboard
                </button>
            </motion.div>
        </div>
    );
}

// Helper component for receipt rows
function ReceiptRow({ label, value, subValue, highlight, status }: { label: string, value: string, subValue?: string, highlight?: boolean, status?: 'success' | 'pending' | 'failed' }) {
    return (
        <div className="flex justify-between items-end">
            <span className="text-slate-500 text-sm font-medium">{label}</span>
            <div className="text-right">
                <span className={`text-sm font-bold ${highlight ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded' : 'text-slate-900'} ${status === 'success' ? 'text-emerald-600' : ''}`}>
                    {value}
                </span>
                {subValue && <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>}
            </div>
        </div>
    );
}

export default function PatientReceiptPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50">Loading...</div>}>
            <ReceiptPageContent />
        </Suspense>
    );
}
