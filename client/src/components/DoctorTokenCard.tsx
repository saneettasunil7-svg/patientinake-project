import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
// Using hardcoded Hash icon to avoid import issues
const HashIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
);

import { Mic, Square, Play, Trash2, Volume2 } from 'lucide-react';

interface DoctorTokenCardProps {
    doctor: any;
    onSelect: (doctor: any, tokenStatus: any) => void;
    isSelected: boolean;
}

export default function DoctorTokenCard({ doctor, onSelect, isSelected }: DoctorTokenCardProps) {
    const router = useRouter();
    const [tokenStatus, setTokenStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showReasonInput, setShowReasonInput] = useState(false);
    const [showProfileBlocked, setShowProfileBlocked] = useState(false);
    const [reason, setReason] = useState('');

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Microphone access is blocked by the browser. This requires a secure connection (HTTPS) or localhost access.');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error('Error starting recording:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const clearRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
    };

    // Fetch token specific to THIS doctor on mount and auto-poll every 5s
    useEffect(() => {
        fetchMyTokenForDoctor();
        const interval = setInterval(fetchMyTokenForDoctor, 5000);
        return () => clearInterval(interval);
    }, [doctor.id]);

    // Notify parent when selection or token status changes
    useEffect(() => {
        if (isSelected) {
            onSelect(doctor, tokenStatus);
        }
    }, [tokenStatus, isSelected]);

    const fetchMyTokenForDoctor = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/my-token/${doctor.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTokenStatus(data);
                if (isSelected) onSelect(doctor, data);
            } else {
                // 404 means token completed/cancelled - reset so patient can get new token
                setTokenStatus(null);
                if (isSelected) onSelect(doctor, null);
            }
        } catch {
            // Transient network error (e.g. backend restarting) - silently ignore
        }
    };

    const requestToken = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!doctor.is_available) return;

        const token = localStorage.getItem('token');
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getApiBaseUrl()}/tokens/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: doctor.id,
                    reason_for_visit: reason
                })
            });

            if (response.ok) {
                const tokenData = await response.json();

                // Upload audio if exists
                if (audioBlob) {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'reason.webm');
                    try {
                        console.log('Uploading voice note for token:', tokenData.id);
                        const uploadRes = await fetch(`${getApiBaseUrl()}/tokens/${tokenData.id}/voice-reason`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });
                        if (!uploadRes.ok) {
                            const uploadErrData = await uploadRes.json();
                            console.error('Voice upload failed:', uploadRes.status, uploadErrData);
                        } else {
                            console.log('Voice note uploaded successfully');
                        }
                    } catch (uploadErr) {
                        console.error('Exception during voice note upload:', uploadErr);
                    }
                }

                await fetchMyTokenForDoctor();
                // Redirect to payment page
                router.push(`/patient/payment?tokenId=${tokenData.id}&doctorId=${doctor.id}`);
                // Bug fix: don't call onSelect(doctor, null) here as it clears the status 
                // that fetchMyTokenForDoctor just successfully set/updated.
            } else {
                let errStr = await response.text();
                let errObj: any = {};
                try {
                    errObj = errStr ? JSON.parse(errStr) : {};
                } catch (e) {
                    console.error("Non-JSON API response for /tokens/", errStr);
                }

                console.error('Token request failed with status:', response.status, errObj, errStr);
                const errorDetail = errObj.detail || (response.status === 403 ? 'Access Denied: You may be logged in with a Doctor account instead of a Patient.' : 'Failed to request token');

                setError(errorDetail);
                if (response.status === 403) alert(`Error 403: ${errorDetail}`);

                setTimeout(() => setError(null), 5000);
            }
        } catch (error: any) {
            console.error('Network Error in requestToken:', error);
            setError(`Network Error: ${error.message || 'Check connection'}`);
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
            setShowReasonInput(false);
            setReason('');
            clearRecording();
        }
    };

    const handleCancelToken = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!tokenStatus || !tokenStatus.id) return;

        if (!window.confirm("Are you sure you want to cancel this token?")) {
            return;
        }

        const token = localStorage.getItem('token');
        setLoading(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/tokens/${tokenStatus.id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setTokenStatus(null);
                onSelect(doctor, null);
                // Optionally visually alert success, but state update might be enough
            } else {
                const errData = await res.json();
                setError(errData.detail || "Failed to cancel token");
            }
        } catch (err) {
            console.error(err);
            setError("Network error while cancelling token");
        } finally {
            setLoading(false);
        }
    };

    const handleGetTokenClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!doctor.is_available) return;
        setShowReasonInput(true);
    };

    const handleCardClick = () => {
        onSelect(doctor, tokenStatus);
    };

    return (
        <div
            onClick={handleCardClick}
            className={`bg-white p-6 rounded-2xl border transition-all relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer
                ${isSelected ? 'ring-2 ring-sky-500 border-sky-500' : 'border-slate-100'}
                ${doctor.is_available ? 'hover:border-emerald-200' : 'opacity-75'}
            `}
        >
            <div className="absolute top-4 right-4">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${doctor.is_available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${doctor.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{doctor.is_available ? 'Online' : 'Offline'}</span>
                </div>
            </div>

            <div className="flex items-center space-x-5 mb-6">
                <div className="relative">
                    {doctor.profile_photo ? (
                        <img
                            src={`${getApiBaseUrl()}${doctor.profile_photo}`}
                            alt={doctor.full_name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const nextEl = (e.target as HTMLImageElement).nextElementSibling;
                                if (nextEl) nextEl.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div className={`w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl border-2 border-white shadow-md ${doctor.profile_photo ? 'hidden' : ''}`}>
                        {doctor.full_name?.charAt(0) || 'D'}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{doctor.full_name}</h3>
                    <p className="text-xs text-blue-600 font-black uppercase tracking-widest mt-1">{doctor.specialization}</p>
                </div>
            </div>

            {/* Token Status Badge inside Card */}
            {tokenStatus && (
                <div className="mb-4 bg-sky-50 border border-sky-100 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-600 uppercase">Your Token</span>
                    <span className="font-bold text-slate-800 text-lg">#{tokenStatus.token_number}</span>
                </div>
            )}

            {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

            <div className="flex space-x-2">
                {tokenStatus ? (
                    <>
                        <button
                            disabled={true}
                            className="flex-[2] py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm cursor-default shadow-sm flex items-center justify-center space-x-1"
                        >
                            <span>
                                {tokenStatus.status === 'in_progress' ? '🔴 In Consultation' :
                                    tokenStatus.status === 'called' ? '📞 Being Called' :
                                        'Queued'}
                            </span>
                        </button>
                        {tokenStatus.status !== 'in_progress' && (
                            <button
                                onClick={handleCancelToken}
                                disabled={loading}
                                className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center space-x-1"
                            >
                                {loading ? <span className="animate-spin mr-1">↻</span> : 'Cancel'}
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={handleGetTokenClick}
                        disabled={!doctor.is_available || loading}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center space-x-2
                            ${!doctor.is_available
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 hover:scale-[1.02]'
                            }`}
                    >
                        {loading ? (
                            <span className="animate-spin">↻</span>
                        ) : (
                            <>
                                <HashIcon size={18} />
                                <span>Get Token</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Reason Input Modal/Overlay inside Card */}
            {showReasonInput && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col justify-center items-center p-6 text-center animate-in fade-in zoom-in duration-200">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center justify-center space-x-2">
                        <span>Reason for Visit?</span>
                    </h4>

                    <div className="w-full relative mb-4">
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Fever, Checkup..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-12"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    isRecording ? stopRecording() : startRecording();
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-sky-100 hover:text-sky-600'}`}
                            >
                                {isRecording ? <Square size={14} /> : <Mic size={14} />}
                            </button>
                        </div>
                    </div>

                    {isRecording && (
                        <div className="flex items-center space-x-2 mb-4 text-red-500 animate-pulse">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Recording Audio...</span>
                        </div>
                    )}

                    {audioUrl && !isRecording && (
                        <div className="w-full flex items-center justify-between p-3 bg-sky-50 rounded-2xl border border-sky-100 mb-4 animate-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center space-x-2 text-sky-600">
                                <Volume2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Voice Note Recorded</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); new Audio(audioUrl).play(); }}
                                    className="p-1.5 hover:bg-sky-200 rounded-lg text-sky-600 transition-colors"
                                >
                                    <Play size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearRecording(); }}
                                    className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-3 w-full">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowReasonInput(false); clearRecording(); }}
                            className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={requestToken}
                            disabled={loading || (!reason.trim() && !audioBlob)}
                            className="flex-1 py-3 bg-sky-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-sky-700 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
                        >
                            {loading ? <span className="block animate-spin">↻</span> : 'Confirm'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex space-x-2 mt-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // BLOCKED PROFILE LOGIC: Must have token
                        if (!tokenStatus) {
                            setShowProfileBlocked(true);
                        } else {
                            router.push(`/patient/doctor/${doctor.id}`);
                        }
                    }}
                    className="w-full px-4 py-3.5 rounded-xl font-bold text-sm transition-all bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 active:scale-95"
                >
                    View Profile
                </button>
            </div>

            {/* Blocked Profile Popup */}
            {showProfileBlocked && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 flex flex-col justify-center items-center p-6 text-center animate-in fade-in zoom-in duration-200">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h4 className="font-black text-xl text-slate-900 mb-2">Access Restricted</h4>
                    <p className="text-sm font-medium text-slate-500 mb-6 px-4">
                        You must take a queue token or have an active appointment to view this Doctor's private profile.
                    </p>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowProfileBlocked(false); }}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
