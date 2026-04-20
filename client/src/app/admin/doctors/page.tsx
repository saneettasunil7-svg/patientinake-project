"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, ArrowLeft, LogOut, CheckCircle, XCircle, User, Mail, Briefcase, Key, Trash2, Upload } from 'lucide-react';

interface Doctor {
    id: number;
    email: string;
    full_name: string;
    specialization: string;
    is_active: boolean;
    is_available: boolean;
    is_verified: boolean;
    bio?: string;
    profile_photo?: string;
}

export default function DoctorManagement() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        specialization: '',
        bio: ''
    });

    useEffect(() => {
        if (user && user.role === 'admin') {
            console.log('DoctorManagement mounted, user:', user);
            fetchDoctors();
        }
    }, [user]);

    const fetchDoctors = async () => {
        const token = localStorage.getItem('token');
        console.log('Fetching doctors with token:', token ? token.substring(0, 10) + '...' : 'null');
        const url = `${getApiBaseUrl()}/admin/doctors`;
        console.log('Fetch URL:', url);

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.error('Unauthorized or forbidden access to admin doctors');
                    return;
                }
                console.error(`Failed to fetch doctors: ${response.status}`);
                return;
            }

            const data = await response.json();
            console.log('Fetch success:', data);
            setDoctors(data);
        } catch (error: any) {
            console.error('Error fetching doctors:', error);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedPhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingDoctor
            ? `${getApiBaseUrl()}/admin/doctors/${editingDoctor.id}`
            : `${getApiBaseUrl()}/admin/doctors`;
        const method = editingDoctor ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const savedDoctor = await response.json();

                // Upload photo if selected
                if (selectedPhoto) {
                    const photoData = new FormData();
                    photoData.append('file', selectedPhoto);

                    try {
                        await fetch(`${getApiBaseUrl()}/admin/doctors/${savedDoctor.id}/photo`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            body: photoData
                        });
                    } catch (photoError) {
                        console.error('Error uploading doctor photo:', photoError);
                        alert('Doctor profile saved, but failed to upload photo.');
                    }
                }

                setIsCreating(false);
                setEditingDoctor(null);
                setSelectedPhoto(null);
                setFormData({ email: '', password: '', full_name: '', specialization: '', bio: '' });
                fetchDoctors();
            } else {
                const errText = await response.text();
                alert(`Failed to save doctor profile. Status: ${response.status}. Error: ${errText}`);
            }
        } catch (error) {
            console.error('Error saving doctor:', error);
            alert(`Network error saving doctor: ${error}`);
        }
    };

    const handleVerify = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/admin/doctors/${id}/verify`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                fetchDoctors();
            }
        } catch (error) {
            console.error('Error verifying doctor:', error);
        }
    };

    const handleEdit = (doctor: Doctor) => {
        setEditingDoctor(doctor);
        setFormData({
            email: doctor.email,
            password: '',
            full_name: doctor.full_name,
            specialization: doctor.specialization,
            bio: doctor.bio || ''
        });
        setSelectedPhoto(null);
        setIsCreating(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this doctor?')) return;

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/admin/doctors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchDoctors();
            } else {
                const errText = await response.text();
                alert(`Failed to delete doctor. Status: ${response.status}. Error: ${errText}`);
            }
        } catch (error) {
            console.error('Error deleting doctor:', error);
            alert(`Network error deleting doctor: ${error}`);
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-sky-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-teal-100/50 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-slate-900">Doctor Management</h1>
                        <p className="text-slate-500">Create and manage medical staff accounts</p>
                    </div>

                    <div className="flex space-x-4">
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => fetchDoctors()}
                            className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center"
                        >
                            Refresh
                        </motion.button>
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => {
                                setEditingDoctor(null);
                                setFormData({ email: '', password: '', full_name: '', specialization: '', bio: '' });
                                setSelectedPhoto(null);
                                setIsCreating(true);
                            }}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 font-bold shadow-lg shadow-sky-500/25 hover:scale-105 transition-transform flex items-center text-white"
                        >
                            <Plus size={20} className="mr-2" />
                            Add Doctor
                        </motion.button>
                    </div>
                </div>

                <AnimatePresence>
                    {isCreating && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 shadow-xl">
                                <h2 className="text-xl font-bold mb-6 text-slate-900">
                                    {editingDoctor ? 'Edit Doctor Profile' : 'New Doctor Profile'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                                                    placeholder="Dr. John Doe"
                                                    value={formData.full_name}
                                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Specialization</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                                                    placeholder="Cardiologist"
                                                    value={formData.specialization}
                                                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    disabled={!!editingDoctor}
                                                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${editingDoctor ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    placeholder="doctor@mediconnect.com"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Password {editingDoctor && '(Leave empty to keep)'}</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                <input
                                                    type="password"
                                                    required={!editingDoctor}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                                                    placeholder="••••••••"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Bio</label>
                                            <textarea
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all h-24 resize-none"
                                                placeholder="Brief professional biography..."
                                                value={formData.bio}
                                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                            ></textarea>
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Profile Photo</label>
                                            <div className="relative">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex-1">
                                                        <label className="flex items-center justify-center w-full bg-slate-50 border border-slate-200 border-dashed rounded-xl py-3 px-4 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer group">
                                                            <Upload size={18} className="mr-2 group-hover:text-sky-500 transition-colors" />
                                                            <span className="group-hover:text-sky-600 transition-colors">
                                                                {selectedPhoto ? selectedPhoto.name : 'Choose an image'}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={handlePhotoChange}
                                                            />
                                                        </label>
                                                    </div>
                                                    {(selectedPhoto || editingDoctor?.profile_photo) && (
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 shrink-0">
                                                            <img
                                                                src={selectedPhoto ? URL.createObjectURL(selectedPhoto) : `${getApiBaseUrl().replace('/api', '')}${editingDoctor?.profile_photo}`}
                                                                alt="Preview"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreating(false);
                                                setEditingDoctor(null);
                                                setSelectedPhoto(null);
                                            }}
                                            className="px-6 py-3 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/20"
                                        >
                                            {editingDoctor ? 'Update Profile' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    {doctors.map((doctor, index) => (
                        <motion.div
                            key={doctor.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white/80 backdrop-blur-md p-6 rounded-2xl flex items-center justify-between hover:shadow-lg transition-all group border border-slate-200"
                        >
                            <div className="flex items-center space-x-6">
                                {doctor.profile_photo ? (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 shadow-md shrink-0">
                                        <img
                                            src={`${getApiBaseUrl().replace('/api', '')}${doctor.profile_photo}`}
                                            alt={doctor.full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0">
                                        {doctor.full_name[0]}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{doctor.full_name}</h3>
                                    <p className="text-slate-500 text-sm">{doctor.specialization} • {doctor.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-6">
                                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold ${doctor.is_verified ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    <Shield size={14} />
                                    <span>{doctor.is_verified ? 'Verified' : 'Unverified'}</span>
                                </div>

                                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold ${doctor.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {doctor.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    <span>{doctor.is_active ? 'Active' : 'Inactive'}</span>
                                </div>

                                <div className={`flex items-center space-x-2 text-sm font-medium ${doctor.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${doctor.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span>{doctor.is_available ? 'Online' : 'Offline'}</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {!doctor.is_verified && (
                                        <button
                                            onClick={() => handleVerify(doctor.id)}
                                            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all font-medium text-sm"
                                        >
                                            Verify
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(doctor)}
                                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition-all font-medium text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doctor.id)}
                                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                                        title="Delete Doctor"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {doctors.length === 0 && (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200 border-dashed">
                            No doctors found. Add one to get started.
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
}
