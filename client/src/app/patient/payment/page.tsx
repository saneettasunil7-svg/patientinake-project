"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Plus, ShieldCheck, CheckCircle, Landmark, Info } from 'lucide-react';
import { Suspense } from 'react';

function PaymentPageContent() {
    const { user, token: authToken, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenId = searchParams.get('tokenId');
    const doctorId = searchParams.get('doctorId');

    const [showSuccess, setShowSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<string>('gpay');

    // Doctor Details State
    const [doctorDetails, setDoctorDetails] = useState<any>(null);
    const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);

    const [cardForm, setCardForm] = useState({
        number: '',
        expiry: '',
        cvv: '',
        name: ''
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    // Fetch Doctor Details
    useEffect(() => {
        const fetchDoctorDetails = async () => {
            if (!doctorId) return;
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${getApiBaseUrl()}/doctors/${doctorId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setDoctorDetails(data);
                } else {
                    console.error("Failed to fetch doctor details");
                }
            } catch (err) {
                console.error("Error fetching doctor details:", err);
            } finally {
                setIsLoadingDoctor(false);
            }
        };

        if (user && doctorId) fetchDoctorDetails();
        else if (!doctorId) setIsLoadingDoctor(false);
    }, [doctorId, user]);

    const handlePayment = async () => {
        setIsProcessing(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/${tokenId}/pay`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setShowSuccess(true);
            } else {
                alert(`Payment failed (Status: ${res.status}). Please try again.`);
            }
        } catch (error) {
            alert("Network error occurred during payment.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-white">Loading...</div>;

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-6"
                >
                    <CheckCircle size={48} />
                </motion.div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">Payment Successful!</h1>
                <p className="text-slate-500 mb-8 max-w-xs">Your payment of ₹300 has been processed securely. Your token is now fully activated.</p>
                <button 
                    onClick={() => router.push(`/patient/doctor/${doctorId}`)}
                    className="w-full max-w-xs py-4 bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:bg-purple-800 transition-all"
                >
                    Go to Consultation
                </button>
            </div>
        );
    }

    // Helper for Radio Button UI
    const RadioCircle = ({ selected }: { selected: boolean }) => (
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'border-purple-600' : 'border-slate-200'}`}>
            {selected && <div className="w-3.5 h-3.5 bg-purple-600 rounded-full" />}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-6 py-5 flex items-center shadow-sm">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 mr-4 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-black flex-1 text-slate-900 tracking-tight">Payment Options</h1>
                <div className="flex items-center text-xs font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    <span className="uppercase tracking-wider">Amount to Pay : ₹300</span>
                    <ChevronDown size={14} className="ml-1" />
                </div>
            </header>

            <main className="max-w-md mx-auto mt-6 px-0 space-y-8">

                {/* PREFERRED PAYMENT */}
                <section>
                    <div className="px-6 pb-3 text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase">Preferred Payment</div>
                    <div className="bg-white px-6 py-5 cursor-pointer hover:bg-slate-50/50 border-y border-slate-100 transition-all relative overflow-hidden group"
                        onClick={() => setSelectedMethod('card_rupay')}>
                        {selectedMethod === 'card_rupay' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-5">
                                <div className="w-14 h-9 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm p-1">
                                    <div className="w-full h-full relative">
                                        <div className="absolute inset-x-0 top-1 text-center text-[10px] font-black italic text-blue-900 leading-none">RuPay</div>
                                        <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-blue-600 opacity-20" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold text-slate-900 tracking-tight">XXXX-XXXX-XXXX-9040</p>
                                    <p className="text-slate-400 text-xs mt-0.5 font-medium italic">SBI | name | Expires04/2029</p>
                                </div>
                            </div>
                            <RadioCircle selected={selectedMethod === 'card_rupay'} />
                        </div>
                    </div>
                </section>

                {/* UPI/BHIM */}
                <section>
                    <div className="px-6 pb-3 text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase">UPI/BHIM</div>

                    <div className="bg-white px-6 py-5 cursor-pointer hover:bg-slate-50/50 border-y border-slate-100 transition-all relative overflow-hidden group"
                        onClick={() => setSelectedMethod('gpay')}>
                        {selectedMethod === 'gpay' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-5">
                                <div className="w-14 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold text-slate-900">Google Pay</p>
                                    {doctorDetails?.upi_id && selectedMethod === 'gpay' && (
                                        <p className="text-purple-600 text-[10px] mt-1.5 font-black bg-purple-50 inline-block px-2.5 py-1 rounded-md border border-purple-100 uppercase tracking-widest">
                                            Pay to: {doctorDetails.upi_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <RadioCircle selected={selectedMethod === 'gpay'} />
                        </div>
                    </div>
                    <div className="bg-white px-6 py-4 border-b border-slate-100">
                        <button className="text-[11px] font-black text-purple-700 uppercase tracking-[0.15em] flex items-center hover:translate-x-1 transition-transform">
                            View All UPI Options <ChevronDown size={14} className="ml-1 opacity-50" />
                        </button>
                    </div>
                </section>

                {/* CREDIT & DEBIT CARDS */}
                <section>
                    <div className="px-6 pb-3 text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase">Credit & Debit Cards</div>
                    <div className={`bg-white px-6 py-5 cursor-pointer border-y border-slate-100 transition-all relative overflow-hidden ${selectedMethod === 'new_card' ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}
                        onClick={() => setSelectedMethod('new_card')}>
                        {selectedMethod === 'new_card' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-5">
                                <div className="w-14 h-10 border-2 border-dashed border-purple-200 rounded-xl flex items-center justify-center text-purple-400 bg-purple-50/30">
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <p className="text-[14px] font-black text-purple-700 uppercase tracking-[0.05em]">Add New Card</p>
                                    <p className="text-slate-400 text-xs mt-0.5 font-medium">Save and Pay via Cards</p>

                                    <div className="flex space-x-2.5 mt-2.5">
                                        <span className="text-[9px] font-black border border-slate-100 rounded-md px-2 py-0.5 text-blue-900 bg-white shadow-sm">VISA</span>
                                        <span className="text-[9px] font-black border border-slate-100 rounded-md px-2 py-0.5 text-red-600 bg-white shadow-sm">MC</span>
                                        <span className="text-[9px] font-black border border-slate-100 rounded-md px-2 py-0.5 text-sky-600 bg-white shadow-sm">RuPay</span>
                                        <span className="text-[9px] font-black border border-slate-100 rounded-md px-2 py-0.5 text-blue-500 bg-white shadow-sm font-mono">AMEX</span>
                                    </div>
                                </div>
                            </div>
                            {selectedMethod !== 'new_card' && <ChevronDown size={18} className="text-slate-300 group-hover:text-slate-500" />}
                            {selectedMethod === 'new_card' && <RadioCircle selected={true} />}
                        </div>

                        {/* Dropdown Card Form */}
                        {selectedMethod === 'new_card' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 pl-14 pr-2 pb-2">
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Card Number</label>
                                        <input type="text" placeholder="0000 0000 0000 0000" className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all" />
                                    </div>
                                    <div className="flex gap-5">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valid Thru</label>
                                            <input type="text" placeholder="MM/YY" className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all text-center" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">CVV</label>
                                            <input type="password" placeholder="***" className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all text-center" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Name on Card</label>
                                        <input type="text" placeholder="Full Name" className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all uppercase tracking-wide" />
                                    </div>
                                    <div className="flex items-center gap-3 pt-2">
                                        <input type="checkbox" id="save_card" className="w-5 h-5 accent-purple-600 rounded-lg border-slate-200" />
                                        <label htmlFor="save_card" className="text-xs text-slate-500 font-bold cursor-pointer">Save this card for future payments</label>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* MORE PAYMENT OPTIONS */}
                <section className="pb-12">
                    <div className="px-6 pb-3 text-[11px] font-black text-slate-400 tracking-[0.1em] uppercase">More Payment Options</div>

                    {/* Netbanking / Direct Transfer Option */}
                    <div className={`bg-white px-6 py-5 cursor-pointer border-y border-slate-100 transition-all relative overflow-hidden ${selectedMethod === 'netbanking' ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}
                        onClick={() => setSelectedMethod('netbanking')}>
                        {selectedMethod === 'netbanking' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-5">
                                <div className="w-14 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 bg-white shadow-sm">
                                    <Landmark size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[15px] font-bold text-slate-900 tracking-tight">Netbanking / Direct Transfer</p>
                                    <p className="text-slate-400 text-xs mt-0.5 font-medium">Account Transfer Options</p>
                                </div>
                            </div>
                            {selectedMethod !== 'netbanking' && <ChevronDown size={18} className="text-slate-300" />}
                            {selectedMethod === 'netbanking' && <RadioCircle selected={true} />}
                        </div>

                        {selectedMethod === 'netbanking' && doctorDetails?.account_number && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 pl-14 pr-2">
                                <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white shadow-2xl space-y-4 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-50" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Direct Bank Transfer</p>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider">A/C Holder</span>
                                            <span className="font-extrabold">{doctorDetails.full_name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Bank Name</span>
                                            <span className="font-extrabold">{doctorDetails.bank_name || 'HDFC Bank'}</span>
                                        </div>
                                        <div className="pt-3 border-t border-white/10">
                                            <div className="flex justify-between items-center group/field">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Account Number</span>
                                                <span className="text-xl font-bold tracking-[0.15em] font-mono group-hover/field:text-purple-400 transition-colors">{doctorDetails.account_number}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 group/field">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">IFSC Code</span>
                                                <span className="text-sm font-bold tracking-widest font-mono group-hover/field:text-purple-400 transition-colors">{doctorDetails.ifsc_code}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex items-center justify-between">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                            <ShieldCheck size={16} className="text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">Verified Medical Account</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {!doctorDetails?.account_number && selectedMethod === 'netbanking' && !isLoadingDoctor && (
                            <div className="mt-5 pl-14 pr-2 text-[11px] text-red-500 font-bold flex items-start gap-2 bg-red-50 p-4 rounded-xl border border-red-100">
                                <Info size={14} className="shrink-0 mt-0.5" />
                                <span>Doctor has not connected a bank account. Please pay via UPI or Card.</span>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Bottom Pay Action Area */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.04)] z-40">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing || (selectedMethod === 'netbanking' && !doctorDetails?.account_number)}
                        className="w-full py-4.5 rounded-[1.25rem] bg-purple-700 hover:bg-purple-800 text-white font-black text-lg shadow-xl shadow-purple-500/30 transition-all flex items-center justify-center space-x-3 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none active:scale-[0.98]"
                    >
                        {isProcessing ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Pay ₹300</span>
                                <ArrowLeft size={20} className="rotate-180 opacity-50" />
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-[0.2em]">Secured by MediConnect Pay</p>
                </div>
            </div>
        </div>
    );
}

export default function PatientPaymentPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">Loading Payment Form...</div>}>
            <PaymentPageContent />
        </Suspense>
    );
}
