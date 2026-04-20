"use client";

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { motion } from 'framer-motion';
import { Activity, User, Clock, FileText } from 'lucide-react';

interface AuditLog {
    id: number;
    user_id: number;
    action: string;
    details: string;
    timestamp: string;
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);

    // Auth check handled by layout

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${getApiBaseUrl()}/admin/audit-logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-pink-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-bold mb-2 text-slate-900">Audit Logs</h1>
                    <p className="text-slate-500">Track system activities and administrator actions</p>
                </motion.div>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Admin ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mr-3">
                                                    <Activity size={16} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{log.details}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-slate-500">
                                                <User size={14} className="mr-2" />
                                                ID: {log.user_id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-slate-500">
                                                <Clock size={14} className="mr-2" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {logs.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 text-slate-200" />
                            <p>No activity logs found</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
