"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/utils/apiConfig';

interface Unit {
    id: number;
    agency_id: number;
    driver_name: string;
    phone_number: string;
    vehicle_plate: string;
    status: string;
}

export default function AgencyDashboard() {
    const { token, user } = useAuth();
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Assume the user has an affiliated agency ID (hardcoded to 1 for MVP if no profile exists)
    // To implement properly, a /users/me endpoint for agency profile is needed.
    const agencyId = 1;

    const [formData, setFormData] = useState({
        driver_name: '',
        phone_number: '',
        vehicle_plate: '',
        agency_id: agencyId
    });

    useEffect(() => {
        if (!token) return;
        fetchUnits();
    }, [token]);

    const fetchUnits = async () => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/ambulance/units/agency/${agencyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setUnits(await res.json());
            }
        } catch (error) {
            console.error("Error fetching units:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${getApiBaseUrl()}/ambulance/units`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, status: "Offline" })
            });
            if (res.ok) {
                fetchUnits();
                setShowModal(false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleStatus = async (unitId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Available' ? 'Offline' : 'Available';
        try {
            await fetch(`${getApiBaseUrl()}/ambulance/units/${unitId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            fetchUnits();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8">Loading Agency Dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-neutral-800">Agency Dispatch Dashboard</h1>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">My Fleet</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
                >
                    + Add New Vehicle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {units.map(unit => (
                    <div key={unit.id} className="bg-white rounded-xl shadow p-5 border-l-4 border-red-500">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{unit.vehicle_plate}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${unit.status === 'Available' ? 'bg-green-100 text-green-700' :
                                    unit.status === 'On-Trip' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {unit.status}
                            </span>
                        </div>
                        <p className="text-gray-600 mb-1"><strong>Driver:</strong> {unit.driver_name}</p>
                        <p className="text-gray-600 mb-4"><strong>Phone:</strong> {unit.phone_number}</p>

                        <div className="pt-3 border-t">
                            <button
                                disabled={unit.status === 'On-Trip'}
                                onClick={() => toggleStatus(unit.id, unit.status)}
                                className={`w-full py-2 rounded text-sm font-medium transition ${unit.status === 'Available'
                                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                        : unit.status === 'On-Trip'
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                {unit.status === 'Available' ? 'Take Offline' : unit.status === 'On-Trip' ? 'Currently on Trip' : 'Go Online'}
                            </button>
                        </div>
                    </div>
                ))}
                {units.length === 0 && (
                    <div className="col-span-3 text-center py-10 text-gray-500 bg-white rounded-xl shadow">
                        No vehicles registered yet. Click "Add New Vehicle" to start building your fleet.
                    </div>
                )}
            </div>

            {/* Simple Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add Vehicle</h2>
                        <form onSubmit={handleCreateUnit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Vehicle Plate No.</label>
                                <input required type="text" value={formData.vehicle_plate} onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Driver Name</label>
                                <input required type="text" value={formData.driver_name} onChange={e => setFormData({ ...formData, driver_name: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Driver Phone Number</label>
                                <input required type="text" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded">Add Vehicle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
