"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/utils/apiConfig';

interface Agency {
    id: number;
    name: string;
    license_number: string;
    region: string;
    is_verified: boolean;
    latitude: number | null;
    longitude: number | null;
    phone_number: string | null;
}

export default function AdminAgenciesPage() {
    const { token, user } = useAuth();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Agency Form
    const [formData, setFormData] = useState({
        name: '',
        license_number: '',
        region: '',
        is_verified: false,
        latitude: '',
        longitude: '',
        phone_number: ''
    });

    // For editing an existing agency
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        if (!token) return;
        fetchAgencies();
    }, [token]);

    const fetchAgencies = async () => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/ambulance/agencies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAgencies(await res.json());
            }
        } catch (error) {
            console.error("Error fetching agencies:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgency = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null
            };
            const res = await fetch(`${getApiBaseUrl()}/ambulance/agencies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchAgencies();
                setShowModal(false);
            } else {
                alert('Error creating agency');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteAgency = async (agencyId: number) => {
        if (!confirm('Are you sure you want to delete this agency?')) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/ambulance/agencies/${agencyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchAgencies();
            } else {
                alert('Error deleting agency');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditAgency = (agency: Agency) => {
        setFormData({
            name: agency.name || '',
            license_number: agency.license_number || '',
            region: agency.region || '',
            is_verified: agency.is_verified || false,
            latitude: agency.latitude ? agency.latitude.toString() : '',
            longitude: agency.longitude ? agency.longitude.toString() : '',
            phone_number: agency.phone_number || ''
        });
        setEditingId(agency.id);
        setShowModal(true);
    };

    const handleUpdateAgency = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null
            };
            const res = await fetch(`${getApiBaseUrl()}/ambulance/agencies/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchAgencies();
                setShowModal(false);
                setEditingId(null);
                setFormData({ name: '', license_number: '', region: '', is_verified: false, latitude: '', longitude: '', phone_number: '' });
            } else {
                alert('Error updating agency');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({ name: '', license_number: '', region: '', is_verified: false, latitude: '', longitude: '', phone_number: '' });
        setShowModal(true);
    };

    if (loading) return <div>Loading Agencies...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Manage Ambulance Agencies</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                >
                    + Register Agency
                </button>
            </div>

            <div className="bg-white rounded shadow p-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="p-3">ID</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">License</th>
                            <th className="p-3">Phone Number</th>
                            <th className="p-3">Region</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Location</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agencies.length === 0 ? (
                            <tr><td colSpan={6} className="p-3 text-center text-gray-500">No agencies registered yet.</td></tr>
                        ) : (
                            agencies.map(ag => (
                                <tr key={ag.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{ag.id}</td>
                                    <td className="p-3 font-semibold">{ag.name}</td>
                                    <td className="p-3">{ag.license_number}</td>
                                    <td className="p-3">{ag.phone_number || '-'}</td>
                                    <td className="p-3">{ag.region}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${ag.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {ag.is_verified ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm">
                                        {ag.latitude ? `${ag.latitude}, ${ag.longitude}` : 'Not set'}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => handleEditAgency(ag)}
                                            className="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAgency(ag.id)}
                                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Agency' : 'Register New Agency'}</h2>
                        <form onSubmit={editingId ? handleUpdateAgency : handleCreateAgency} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Agency Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">License Number</label>
                                <input required type="text" value={formData.license_number} onChange={e => setFormData({ ...formData, license_number: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <input type="text" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="w-full border p-2 rounded" placeholder="E.g., +1 234 567 890" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Region</label>
                                <input required type="text" value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Latitude</label>
                                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} className="w-full border p-2 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Longitude</label>
                                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} className="w-full border p-2 rounded" />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="verified" checked={formData.is_verified} onChange={e => setFormData({ ...formData, is_verified: e.target.checked })} className="mr-2" />
                                <label htmlFor="verified">Mark as Verified</label>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{editingId ? 'Update Agency' : 'Save Agency'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
