import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';

interface ScheduleSlot {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

const APPOINTMENT_DAYS = [
    { id: 0, name: 'Monday' },
    { id: 1, name: 'Tuesday' },
    { id: 2, name: 'Wednesday' },
    { id: 3, name: 'Thursday' },
    { id: 4, name: 'Friday' },
    { id: 5, name: 'Saturday' },
    { id: 6, name: 'Sunday' },
];

import { ArrowLeft, Copy, Trash2, Plus, Calendar as CalendarIcon, X, Clock } from 'lucide-react';

interface ScheduleManagerProps {
    onClose?: () => void;
}

const FlexibleTimePicker = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
    // value is HH:MM (24h)
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

    useEffect(() => {
        if (value) {
            const [h24, m] = value.split(':');
            let h12 = parseInt(h24);
            const p = h12 >= 12 ? 'PM' : 'AM';
            h12 = h12 % 12;
            if (h12 === 0) h12 = 12;
            setHours(h12.toString().padStart(2, '0'));
            setMinutes(m);
            setPeriod(p);
        }
    }, [value]);

    const updateValue = (newH: string, newM: string, newP: 'AM' | 'PM') => {
        let h24 = parseInt(newH);
        if (isNaN(h24)) h24 = 12;
        if (newP === 'PM' && h24 < 12) h24 += 12;
        if (newP === 'AM' && h24 === 12) h24 = 0;

        const time24 = `${h24.toString().padStart(2, '0')}:${newM.padStart(2, '0')}`;
        onChange(time24);
    };

    return (
        <div className="relative flex-1">
            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 transition-all">
                <select
                    value={hours}
                    onChange={(e) => { setHours(e.target.value); updateValue(e.target.value, minutes, period); }}
                    className="bg-transparent px-2 py-2 text-sm font-bold text-slate-700 outline-none w-14 appearance-none text-center"
                >
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                    ))}
                </select>
                <span className="flex items-center text-slate-400 font-bold">:</span>
                <select
                    value={minutes}
                    onChange={(e) => { setMinutes(e.target.value); updateValue(hours, e.target.value, period); }}
                    className="bg-transparent px-2 py-2 text-sm font-bold text-slate-700 outline-none w-14 appearance-none text-center"
                >
                    {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => { const newP = period === 'AM' ? 'PM' : 'AM'; setPeriod(newP); updateValue(hours, minutes, newP); }}
                    className={`px-3 py-2 text-[10px] font-black tracking-widest transition-all ${period === 'AM' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}
                >
                    {period}
                </button>
            </div>
            <span className="absolute -top-2 left-3 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-tighter z-10">{label}</span>
        </div>
    );
};

export default function ScheduleManager({ onClose }: ScheduleManagerProps) {
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [unavailableDays, setUnavailableDays] = useState<number[]>([]);
    const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
    const [newExclusionDate, setNewExclusionDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            setLoading(false);
            return;
        }
        const user = JSON.parse(userStr);

        try {
            // Fetch Schedule
            const resSchedule = await fetch(`${getApiBaseUrl()}/doctors/${user.id}/schedule`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resSchedule.ok) {
                setSchedule(await resSchedule.json());
            }

            // Fetch Global Availability Settings (Unavailable Days/Dates)
            const resAvailability = await fetch(`${getApiBaseUrl()}/doctors/me/availability`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resAvailability.ok) {
                const data = await resAvailability.json();
                setUnavailableDays(data.unavailable_days || []);
                setUnavailableDates(data.unavailable_dates || []);
            }

        } catch (error) {
            console.error("Failed to fetch schedule", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = (day: number) => {
        const newSlot: ScheduleSlot = {
            day_of_week: day,
            start_time: "09:00",
            end_time: "17:00",
            is_active: true
        };
        setSchedule([...schedule, newSlot]);
    };

    const handleRemoveSlot = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule.splice(index, 1);
        setSchedule(newSchedule);
    };

    const handleUpdateSlot = (index: number, field: keyof ScheduleSlot, value: any) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const toggleUnavailableDay = (day: number) => {
        if (unavailableDays.includes(day)) {
            setUnavailableDays(unavailableDays.filter(d => d !== day));
        } else {
            setUnavailableDays([...unavailableDays, day]);
        }
    };

    const handleAddExclusion = () => {
        if (!newExclusionDate) return;
        if (unavailableDates.includes(newExclusionDate)) {
            setNewExclusionDate('');
            return;
        }
        setUnavailableDates([...unavailableDates, newExclusionDate].sort());
        setNewExclusionDate('');
    };

    const handleRemoveExclusion = (date: string) => {
        setUnavailableDates(unavailableDates.filter(d => d !== date));
    };

    const copyToAllDays = (sourceDayId: number) => {
        const sourceSlots = schedule.filter(s => s.day_of_week === sourceDayId);
        if (sourceSlots.length === 0) {
            alert("No slots to copy from this day.");
            return;
        }

        const newSchedule: ScheduleSlot[] = [];
        // Add source day slots
        newSchedule.push(...sourceSlots);

        // For every other day, add the same slots
        [0, 1, 2, 3, 4, 5, 6].forEach(dayId => {
            if (dayId === sourceDayId) return;
            sourceSlots.forEach(slot => {
                newSchedule.push({
                    ...slot,
                    day_of_week: dayId
                });
            });
        });

        setSchedule(newSchedule);
    };

    const clearDay = (dayId: number) => {
        setSchedule(schedule.filter(s => s.day_of_week !== dayId));
    };

    const saveChanges = async () => {
        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            // 1. Save Schedule
            await fetch(`${getApiBaseUrl()}/doctors/schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(schedule)
            });

            // 2. Save Unavailable Days & Dates
            await fetch(`${getApiBaseUrl()}/doctors/availability/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    unavailable_days: unavailableDays,
                    unavailable_dates: unavailableDates
                })
            });

            alert('Schedule updated successfully!');
            if (onClose) onClose();
        } catch (error) {
            console.error("Failed to save", error);
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">Loading Availability Manager...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md px-8 py-8">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center space-x-4">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Availability Manager</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your clinical hours</p>
                    </div>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="bg-sky-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-700 disabled:opacity-50 shadow-xl shadow-sky-500/20 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Slots Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Weekly Schedule Slots</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recurring availability</p>
                    </div>
                    <div className="space-y-6">
                        {APPOINTMENT_DAYS.map(day => {
                            const daySlots = schedule.filter(s => s.day_of_week === day.id);
                            const isGlobalUnavailable = unavailableDays.includes(day.id);

                            return (
                                <div key={day.id} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 ${isGlobalUnavailable ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-sky-100'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h4 className={`text-lg font-black tracking-tight ${isGlobalUnavailable ? 'text-slate-400' : 'text-slate-900'}`}>{day.name}</h4>
                                            {isGlobalUnavailable && <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg">Offline</span>}
                                        </div>

                                        {!isGlobalUnavailable && (
                                            <div className="flex items-center space-x-2">
                                                {daySlots.length > 0 && (
                                                    <button
                                                        onClick={() => copyToAllDays(day.id)}
                                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                                        title="Copy this schedule to all days"
                                                    >
                                                        <Copy size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => clearDay(day.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Clear All Slots"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleAddSlot(day.id)}
                                                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl font-bold text-xs hover:bg-sky-100 transition-all border border-sky-100"
                                                >
                                                    <Plus size={14} />
                                                    <span>Add Slot</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isGlobalUnavailable ? (
                                        <p className="text-xs font-medium text-slate-400 italic">This day is marked as completely unavailable in global settings.</p>
                                    ) : daySlots.length === 0 ? (
                                        <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Active Slots</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {daySlots.map((slot, idx) => {
                                                const realIndex = schedule.indexOf(slot);
                                                return (
                                                    <div key={idx} className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 group">
                                                        <div className="flex-1 flex items-center gap-3">
                                                            <FlexibleTimePicker
                                                                value={slot.start_time}
                                                                onChange={(val) => handleUpdateSlot(realIndex, 'start_time', val)}
                                                                label="Start"
                                                            />
                                                            <FlexibleTimePicker
                                                                value={slot.end_time}
                                                                onChange={(val) => handleUpdateSlot(realIndex, 'end_time', val)}
                                                                label="End"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveSlot(realIndex)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-8">
                    {/* Global Unavailable Days */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center space-x-2 mb-4">
                            <CalendarIcon size={18} className="text-red-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Unavailable Weekdays</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {APPOINTMENT_DAYS.map(day => (
                                <button
                                    key={day.id}
                                    onClick={() => toggleUnavailableDay(day.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${unavailableDays.includes(day.id)
                                        ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                                        : 'bg-white text-slate-400 border-slate-100 hover:border-red-200 hover:text-red-500'
                                        }`}
                                >
                                    {day.name.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-4 leading-relaxed">Selected days will be marked completely offline, regardless of slots.</p>
                    </div>

                    {/* Specific Date Exclusions */}
                    <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl shadow-slate-200/20">
                        <div className="flex items-center space-x-2 mb-6">
                            <CalendarIcon size={18} className="text-sky-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Holidays & Time Off</h3>
                        </div>

                        <div className="flex flex-col space-y-3 mb-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Specific Date</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={newExclusionDate}
                                    onChange={(e) => setNewExclusionDate(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                                <button
                                    onClick={handleAddExclusion}
                                    className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {unavailableDates.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">No specific dates added.</p>
                            ) : (
                                unavailableDates.map(date => (
                                    <div key={date} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <span className="text-sm font-black text-slate-700 tracking-tight">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <button
                                            onClick={() => handleRemoveExclusion(date)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-6 bg-sky-50 rounded-[2rem] border border-sky-100">
                        <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2">Pro Tip</h4>
                        <p className="text-xs text-sky-700 font-bold leading-relaxed">
                            Configure one day's hours and use the <Copy className="inline mx-1" size={12} /> icon to apply it to your entire work week instantly!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
