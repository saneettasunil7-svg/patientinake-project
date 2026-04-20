"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Phone, Clock, Star, Activity, PlusCircle, ArrowRight } from 'lucide-react';

const KERALA_DISTRICTS = [
    "Ernakulam",
    "Kochi",
    "Kakkanad",
    "Aluva",
    "Edappally"
];

// Curated mock data for Kerala Hospitals & Clinics
const FACILITIES_DATA = [
    // Ernakulam
    { id: 13, name: "Medical Trust Hospital", type: "Hospital", district: "Ernakulam", address: "MG Road, Pallimukku, Ernakulam", distance: "2.5 km", rating: 4.6, specialties: ["Orthopedics", "Cardiology", "Emergency"], phone: "+91 484 235 8001", openNow: true, image_color: "from-rose-500 to-red-600" },
    { id: 14, name: "DDRC SRL Diagnostics", type: "Laboratory", district: "Ernakulam", address: "Panampilly Nagar, Ernakulam", distance: "1.2 km", rating: 4.5, specialties: ["Blood Tests", "MRI", "X-Ray"], phone: "+91 484 231 4444", openNow: true, image_color: "from-purple-500 to-fuchsia-600" },
    { id: 25, name: "Lakeshore Hospital", type: "Hospital", district: "Ernakulam", address: "Nettoor, Ernakulam", distance: "6.0 km", rating: 4.8, specialties: ["Oncology", "Gastroenterology", "Transplant"], phone: "+91 484 270 1032", openNow: true, image_color: "from-blue-500 to-indigo-600" },
    { id: 26, name: "Vasan Eye Care", type: "Specialty", district: "Ernakulam", address: "MG Road, Ernakulam", distance: "2.1 km", rating: 4.2, specialties: ["Ophthalmology", "Lasik", "Cataract"], phone: "+91 484 398 9000", openNow: false, image_color: "from-amber-400 to-orange-500" },
    { id: 27, name: "Smile Elements Dental", type: "Specialty", district: "Ernakulam", address: "Kadavanthra, Ernakulam", distance: "3.5 km", rating: 4.9, specialties: ["Dentistry", "Braces", "Implants"], phone: "+91 484 402 1122", openNow: true, image_color: "from-sky-400 to-blue-500" },

    // Kochi
    { id: 15, name: "Aster Medcity", type: "Hospital", district: "Kochi", address: "Cheranalloor, Kochi", distance: "8.5 km", rating: 4.9, specialties: ["Multi-Specialty", "Pediatrics"], phone: "+91 484 669 9999", openNow: true, image_color: "from-teal-500 to-emerald-600" },
    { id: 16, name: "Lisie Hospital", type: "Hospital", district: "Kochi", address: "Lisie Hospital Road, Kochi", distance: "3.0 km", rating: 4.7, specialties: ["General Medicine", "Nephrology"], phone: "+91 484 240 2044", openNow: true, image_color: "from-indigo-500 to-blue-600" },
    { id: 17, name: "Apollo Clinic", type: "Specialty", district: "Kochi", address: "Kadavanthra, Kochi", distance: "1.8 km", rating: 4.3, specialties: ["Health Checks", "Consultation"], phone: "+91 484 220 5000", openNow: true, image_color: "from-amber-500 to-orange-600" },
    { id: 28, name: "Renai Medicity", type: "Hospital", district: "Kochi", address: "Palarivattom, Kochi", distance: "4.5 km", rating: 4.6, specialties: ["Orthopedics", "Gynecology", "ENT"], phone: "+91 484 288 0000", openNow: true, image_color: "from-rose-400 to-pink-600" },
    { id: 29, name: "Dr. Agarwal's Eye Hospital", type: "Specialty", district: "Kochi", address: "Kaloor, Kochi", distance: "3.2 km", rating: 4.4, specialties: ["Eye Care", "Surgery"], phone: "+91 484 234 5050", openNow: true, image_color: "from-yellow-500 to-amber-600" },

    // Kakkanad
    { id: 18, name: "Sunrise Hospital", type: "Hospital", district: "Kakkanad", address: "Seaport-Airport Road, Kakkanad", distance: "10.5 km", rating: 4.5, specialties: ["Laparoscopic Surgery", "Gynecology"], phone: "+91 484 288 4444", openNow: true, image_color: "from-orange-500 to-red-600" },
    { id: 19, name: "Kusumagiri Mental Health Centre", type: "Specialty", district: "Kakkanad", address: "Kusumagiri, Kakkanad", distance: "11.2 km", rating: 4.4, specialties: ["Psychiatry", "Counseling"], phone: "+91 484 242 2222", openNow: true, image_color: "from-violet-500 to-purple-600" },
    { id: 30, name: "Milestones Clinic", type: "Specialty", district: "Kakkanad", address: "Infopark Road, Kakkanad", distance: "12.0 km", rating: 4.7, specialties: ["Pediatrics", "Vaccination"], phone: "+91 484 241 1234", openNow: false, image_color: "from-fuchsia-400 to-purple-500" },
    { id: 31, name: "Neuberg Diagnostics", type: "Laboratory", district: "Kakkanad", address: "Seaport-Airport Road, Kakkanad", distance: "10.8 km", rating: 4.3, specialties: ["Blood Tests", "Health Packages"], phone: "+91 484 242 8888", openNow: true, image_color: "from-cyan-500 to-blue-500" },

    // Aluva
    { id: 20, name: "Rajagiri Hospital", type: "Hospital", district: "Aluva", address: "Chunangamvely, Aluva", distance: "18.5 km", rating: 4.8, specialties: ["Organ Transplant", "Gastroenterology"], phone: "+91 484 290 5000", openNow: true, image_color: "from-sky-500 to-indigo-600" },
    { id: 21, name: "Nair's Hospital", type: "Hospital", district: "Aluva", address: "Bank Road, Aluva", distance: "17.0 km", rating: 4.2, specialties: ["General Practice", "ENT"], phone: "+91 484 262 3333", openNow: false, image_color: "from-emerald-500 to-teal-600" },
    { id: 32, name: "KIMS Aluva", type: "Hospital", district: "Aluva", address: "Pathadipalam, Aluva", distance: "15.5 km", rating: 4.5, specialties: ["Maternity", "Pediatrics", "Emergency"], phone: "+91 484 290 8000", openNow: true, image_color: "from-teal-400 to-emerald-500" },
    { id: 33, name: "Aluva Skin Clinic", type: "Specialty", district: "Aluva", address: "Railway Station Road, Aluva", distance: "17.2 km", rating: 4.6, specialties: ["Dermatology", "Cosmetology"], phone: "+91 484 262 1122", openNow: true, image_color: "from-pink-400 to-rose-500" },

    // Edappally
    { id: 22, name: "Amrita Hospital", type: "Hospital", district: "Edappally", address: "Ponekkara, Edappally", distance: "4.2 km", rating: 4.8, specialties: ["Cardiology", "Neurology", "Oncology"], phone: "+91 484 285 1234", openNow: true, image_color: "from-sky-500 to-blue-600" },
    { id: 23, name: "MAJ Hospital", type: "Hospital", district: "Edappally", address: "MAJ Hospital Road, Edappally", distance: "5.0 km", rating: 4.1, specialties: ["General Surgery", "Maternity"], phone: "+91 484 280 5000", openNow: true, image_color: "from-pink-500 to-rose-600" },
    { id: 24, name: "Evershine Diagnostics", type: "Laboratory", district: "Edappally", address: "Toll Junction, Edappally", distance: "4.8 km", rating: 4.6, specialties: ["Pathology", "Ultrasound"], phone: "+91 484 280 1111", openNow: true, image_color: "from-fuchsia-500 to-pink-600" },
    { id: 34, name: "CRAFT Hospital & Research Centre", type: "Specialty", district: "Edappally", address: "Metro Pillar 420, Edappally", distance: "4.5 km", rating: 4.7, specialties: ["IVF", "Infertility", "Genetics"], phone: "+91 484 280 9000", openNow: true, image_color: "from-purple-400 to-violet-600" },
];

export default function NearbyFacilities() {
    const [selectedDistrict, setSelectedDistrict] = useState("Ernakulam");
    const [activeFilter, setActiveFilter] = useState("All");

    const filteredFacilities = useMemo(() => {
        return FACILITIES_DATA.filter(facility => {
            const matchesDistrict = facility.district === selectedDistrict;
            const matchesType = activeFilter === "All" || facility.type === activeFilter;
            return matchesDistrict && matchesType;
        });
    }, [selectedDistrict, activeFilter]);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <MapPin className="text-sky-500" />
                        Local Clinics & Labs
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Find medical facilities near your home in Kerala.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* District Selector */}
                    <div className="relative">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" />
                        <select
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            className="w-full sm:w-auto pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer"
                        >
                            {KERALA_DISTRICTS.map(district => (
                                <option key={district} value={district}>{district}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            ▼
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                        {['All', 'Hospital', 'Laboratory', 'Specialty'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeFilter === cat
                                    ? 'bg-white text-sky-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid display */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${selectedDistrict}-${activeFilter}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {filteredFacilities.length === 0 ? (
                        <div className="bg-white/80 backdrop-blur-md p-16 rounded-3xl border border-slate-200 text-center shadow-sm">
                            <Navigation className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No facilities found</h3>
                            <p className="text-slate-500">We couldn't find any {activeFilter.toLowerCase()}s in {selectedDistrict}. Try changing your district or filter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFacilities.map((facility, i) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={facility.id}
                                    className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all group overflow-hidden flex flex-col"
                                >
                                    {/* Top Image Banner Alternative */}
                                    <div className={`h-24 bg-gradient-to-r ${facility.image_color} p-6 relative`}>
                                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-black uppercase tracking-widest border border-white/30">
                                            {facility.type}
                                        </div>
                                    </div>

                                    <div className="p-6 pt-4 flex-1 flex flex-col border-b border-slate-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-black text-slate-800 group-hover:text-sky-600 transition-colors leading-tight">
                                                {facility.name}
                                            </h3>
                                            <div className="flex items-center text-amber-500 bg-amber-50 px-2 py-1 rounded-lg text-sm font-bold border border-amber-100">
                                                <Star size={14} className="mr-1 fill-amber-500" /> {facility.rating}
                                            </div>
                                        </div>

                                        <p className="text-slate-500 text-sm mb-4 leading-relaxed flex-1">
                                            {facility.address}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {facility.specialties.slice(0, 3).map(spec => (
                                                <span key={spec} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                    {spec}
                                                </span>
                                            ))}
                                            {facility.specialties.length > 3 && (
                                                <span className="bg-sky-50 text-sky-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-sky-100">
                                                    +{facility.specialties.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="bg-slate-50/50 p-4 px-6 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center text-slate-700 font-bold">
                                                <Navigation size={14} className="mr-1.5 text-sky-500" />
                                                {facility.distance}
                                            </div>
                                            <a
                                                href={`tel:${facility.phone.replace(/\s+/g, '')}`}
                                                className="flex items-center text-slate-700 font-bold hover:text-emerald-600 transition-colors"
                                            >
                                                <Phone size={14} className="mr-1.5 text-emerald-500" />
                                                {facility.phone}
                                            </a>
                                        </div>
                                        <div className="flex items-center">
                                            {facility.openNow ? (
                                                <span className="flex items-center text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> Open Now
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                                    <Clock size={12} className="mr-1.5" /> Closed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
