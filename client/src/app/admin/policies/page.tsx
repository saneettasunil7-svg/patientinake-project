"use client";

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Calendar, Edit3 } from 'lucide-react';

interface Policy {
    id: number;
    title: string;
    content: string;
    last_updated: string;
}

export default function PolicyManagement() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });

    // Auth check handled by layout

    const fetchPolicies = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/admin/policies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPolicies(data);
            }
        } catch (error) {
            console.error('Error fetching policies:', error);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleEdit = (policy: Policy) => {
        setEditingPolicy(policy);
        setFormData({
            title: policy.title,
            content: policy.content
        });
        setIsCreating(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const url = editingPolicy
                ? `${getApiBaseUrl()}/admin/policies/${editingPolicy.id}`
                : `${getApiBaseUrl()}/admin/policies`;

            const response = await fetch(url, {
                method: editingPolicy ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsCreating(false);
                setEditingPolicy(null);
                setFormData({ title: '', content: '' });
                fetchPolicies();
            } else {
                alert(`Failed to ${editingPolicy ? 'update' : 'create'} policy`);
            }
        } catch (error) {
            console.error(`Error ${editingPolicy ? 'updating' : 'creating'} policy:`, error);
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-4xl font-bold mb-2 text-slate-900">Policy Management</h1>
                        <p className="text-slate-500">Create and update system guidelines</p>
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                            setEditingPolicy(null);
                            setFormData({ title: '', content: '' });
                            setIsCreating(true);
                        }}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 font-bold shadow-lg shadow-sky-500/25 hover:scale-105 transition-transform flex items-center text-white"
                    >
                        <Plus size={20} className="mr-2" />
                        New Policy
                    </motion.button>
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
                                    {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Policy Title</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                                            placeholder="e.g. Data Privacy Policy"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Content</label>
                                        <textarea
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all h-64 resize-none"
                                            placeholder="Enter policy details..."
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="px-6 py-3 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/20"
                                        >
                                            Publish Policy
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {policies.map((policy, index) => (
                        <motion.div
                            key={policy.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                            <div
                                className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => handleEdit(policy)}
                            >
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all">
                                    <Edit3 size={18} />
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                                <FileText size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-slate-900">{policy.title}</h3>
                            <p className="text-slate-500 mb-6 line-clamp-3 leading-relaxed">{policy.content}</p>
                            <div className="flex items-center text-xs font-bold text-slate-400 bg-slate-50 px-3 py-2 rounded-lg w-fit">
                                <Calendar size={14} className="mr-2" />
                                <span>Last Updated: {new Date(policy.last_updated).toLocaleDateString()}</span>
                            </div>
                        </motion.div>
                    ))}
                    {policies.length === 0 && !isCreating && (
                        <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200 border-dashed">
                            No policies found. Create one to get started.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
