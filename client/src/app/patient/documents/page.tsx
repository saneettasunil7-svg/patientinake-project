"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Upload, Trash2, Edit2, Download, Check, X, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface Document {
    id: number;
    filename: string;
    upload_date: string;
}

export default function PatientDocumentsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isLoading && !user) router.push('/auth/login');
        if (user && user.role !== 'patient') router.push('/auth/login');
        if (user) fetchDocuments();
    }, [user, isLoading, router]);

    const fetchDocuments = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setDocuments(await res.json());
            }
        } catch (e) { console.error("Failed to fetch documents", e); }
        setLoading(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const newDoc = await res.json();
                setDocuments([...documents, newDoc]);
            } else if (res.status === 401 || res.status === 403) {
                alert("Your session has changed or expired. Please sign in again.");
                localStorage.removeItem('token');
                window.location.href = '/auth/login';
            } else {
                const errText = await res.text();
                alert(`Failed to upload document (Status: ${res.status}): ${errText}`);
            }
        } catch (e: any) {
            console.error("Upload error", e);
            alert(`Upload failed. Check connection: ${e.message}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setDocuments(documents.filter(d => d.id !== id));
            } else {
                alert("Failed to delete document");
            }
        } catch (e) {
            console.error("Delete error", e);
        }
    };

    const startEditing = (doc: Document) => {
        setEditingId(doc.id);
        setEditName(doc.filename);
    };

    const saveEdit = async (id: number) => {
        if (!editName.trim()) {
            setEditingId(null);
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_filename: editName })
            });

            if (res.ok) {
                const updatedDoc = await res.json();
                setDocuments(documents.map(d => d.id === id ? updatedDoc : d));
                setEditingId(null);
            } else {
                alert("Failed to rename document");
            }
        } catch (e) {
            console.error("Rename error", e);
        }
    };

    const handleDownload = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiBaseUrl()}/documents/download/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                window.open(`${getApiBaseUrl()}${data.url}`, '_blank');
            }
        } catch (e) {
            console.error("Download error", e);
        }
    };

    const formatDate = (isoStr: string) => {
        if (!isoStr) return "Unknown date";
        return new Date(isoStr).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-sky-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-100/50 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/patient/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Medical Records</h1>
                            <p className="text-sm font-medium text-slate-500">Securely store and manage your health documents</p>
                        </div>
                    </div>

                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-sky-500/30 transition-all disabled:opacity-70"
                    >
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Upload size={18} />
                        )}
                        <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                    />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                {/* Security Banner */}
                <div className="bg-emerald-50 rounded-2xl p-4 mb-8 flex items-start gap-4 border border-emerald-100">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-emerald-800">Secure Storage</h3>
                        <p className="text-xs text-emerald-600 mt-1">Your documents are encrypted and only accessible to you and your authorized doctors. You maintain full control over your data.</p>
                    </div>
                </div>

                {/* Documents List */}
                {documents.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-16 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto mt-12">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-slate-400">
                            <FileText size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">No Documents Yet</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Upload your past prescriptions, lab reports, or any other medical records to keep them safe and easily shareable with your doctors.</p>
                        <button
                            onClick={handleUploadClick}
                            className="bg-sky-50 text-sky-600 font-bold px-8 py-3 rounded-xl hover:bg-sky-100 transition-colors"
                        >
                            Upload Your First File
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map((doc, i) => (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                key={doc.id}
                                className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all group flex flex-col"
                            >
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-blue-100 rounded-2xl flex items-center justify-center text-indigo-500 shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {editingId === doc.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && saveEdit(doc.id)}
                                                    className="w-full text-sm font-bold text-slate-800 border-b-2 border-sky-500 focus:outline-none bg-sky-50 px-2 py-1 rounded-t"
                                                />
                                                <button onClick={() => saveEdit(doc.id)} className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 p-1.5 rounded-lg"><Check size={16} /></button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-1.5 rounded-lg"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-base font-bold text-slate-800 truncate" title={doc.filename}>
                                                    {doc.filename}
                                                </h3>
                                                <button onClick={() => startEditing(doc)} className="text-slate-300 hover:text-sky-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Added {formatDate(doc.upload_date)}</p>
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        onClick={() => handleDownload(doc.id)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 font-bold py-2.5 rounded-xl transition-colors text-sm"
                                    >
                                        <Download size={16} /> View
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="w-12 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
