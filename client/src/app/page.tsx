"use client";

import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity, Shield, ArrowRight, Stethoscope, Phone, Mail, MapPin,
  Heart, Brain, Baby, Microscope, Bone, Zap, Eye, Wind,
  Star, Users, Clock, Award, ChevronRight
} from "lucide-react";
import PublicChatWidget from "@/components/PublicChatWidget";
import AppointmentModal from "@/components/AppointmentModal";

function HomeContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("register") === "true") {
      setModalOpen(true);
    }
  }, [searchParams]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div id="home" className="min-h-screen relative overflow-x-hidden bg-slate-50 text-slate-800 selection:bg-sky-200 selection:text-sky-900">

      {/* Hospital Background Image */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.05] grayscale mix-blend-multiply transition-opacity duration-1000"
        style={{
          backgroundImage: "url('/images/hospital_bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-50" />
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-sky-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-teal-200/40 rounded-full blur-[120px]" />
      </div>

      {/* ─── TOP INFO BAR ─── */}
      <div className="relative z-20 bg-slate-900 text-slate-300 text-xs py-2">
        <div className="container mx-auto px-6 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-6">
            <a href="tel:+919876543210" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone size={11} className="text-sky-400" />
              Emergency: +91 98765 11111
            </a>
            <a href="tel:+919876522200" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone size={11} className="text-teal-400" />
              Appointment: +91 98765 22200
            </a>
            <a href="mailto:info@cityhospital.com" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail size={11} className="text-sky-400" />
              info@cityhospital.com
            </a>
          </div>
          <nav className="flex items-center gap-5 text-xs font-semibold text-slate-300">
            <a href="#home" className="hover:text-white transition-colors">Home</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* ─── HEADER / NAV ─── */}
        <header className="flex justify-between items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
              <Activity size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">City<span className="text-sky-600">Hospital</span></span>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a href="#departments" className="hover:text-sky-600 transition-colors">Specialities</a>
            <a href="#about" className="hover:text-sky-600 transition-colors">About Us</a>
            <a href="#testimonials" className="hover:text-sky-600 transition-colors">Patients</a>
            <a href="#contact" className="hover:text-sky-600 transition-colors">Contact</a>
          </motion.nav>


        </header>

        {/* ─── HERO SECTION ─── */}
        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-5xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase">Premier Healthcare Center</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-6xl md:text-7xl font-extrabold mb-8 leading-tight tracking-tight text-slate-900">
            World-Class Medical Care at <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-teal-500">City General Hospital</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience compassionate care, advanced treatments, and a dedicated team of medical professionals focused on your recovery and well-being.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6">
            <button
              onClick={() => setModalOpen(true)}
              className="group relative px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Book an Appointment <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <Link href="/auth/login" className="px-8 py-4 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 hover:border-sky-200 hover:bg-sky-50 transition-all shadow-sm hover:shadow-md">
              Existing Patient?
            </Link>
          </motion.div>
        </motion.main>

        {/* ─── FEATURE CARDS ─── */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-8 mt-32"
        >
          <FeatureCard
            icon={<Activity className="text-sky-600" />}
            title="24/7 Emergency Care"
            desc="Our trauma center and emergency department is open around the clock, staffed by experts ready to save lives."
            delay={0}
          />
          <FeatureCard
            icon={<Shield className="text-teal-600" />}
            title="State-of-the-Art Facilities"
            desc="Equipped with the latest medical technology and modern operating theaters to ensure the best patient outcomes."
            delay={0.1}
          />
          <FeatureCard
            icon={<Stethoscope className="text-indigo-600" />}
            title="Expert Medical Team"
            desc="Our board-certified physicians, surgeons, and nursing staff are dedicated to providing exceptional personalized care."
            delay={0.2}
          />
        </motion.div>
      </div>

      {/* ─── STATS BAR ─── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative z-10 mt-24 py-16 bg-gradient-to-r from-sky-600 to-teal-600"
      >
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { icon: <Users size={32} />, val: "500+", label: "Expert Doctors" },
            { icon: <Stethoscope size={32} />, val: "50+", label: "Specialities" },
            { icon: <Award size={32} />, val: "1M+", label: "Patients Treated" },
            { icon: <Clock size={32} />, val: "25+", label: "Years of Excellence" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center">
                {s.icon}
              </div>
              <p className="text-4xl font-extrabold">{s.val}</p>
              <p className="text-sky-100 text-sm font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── DEPARTMENTS / CENTERS OF EXCELLENCE ─── */}
      <section id="departments" className="relative z-10 py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs font-black tracking-widest text-sky-600 uppercase">Centers of Excellence</span>
            <h2 className="text-4xl font-extrabold text-slate-800 mt-2">Our Medical Specialities</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">World-class care across all major medical disciplines, delivered by leading specialists.</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {DEPARTMENTS.map((dep, i) => (
              <motion.div
                key={dep.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:border-sky-200 hover:-translate-y-1 transition-all cursor-pointer text-center"
              >
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dep.bg}`}>
                  {dep.icon}
                </div>
                <p className="font-bold text-slate-700 text-sm group-hover:text-sky-600 transition-colors">{dep.name}</p>
                <p className="text-[11px] text-slate-400 mt-1">{dep.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT US ─── */}
      <section id="about" className="relative z-10 py-24 bg-slate-50">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-black tracking-widest text-sky-600 uppercase">About Us</span>
            <h2 className="text-4xl font-extrabold text-slate-800 mt-2 mb-5">Committed to Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-teal-500">Health & Well-being</span></h2>
            <p className="text-slate-500 leading-relaxed mb-5">
              City General Hospital has been at the forefront of healthcare excellence for over 25 years. Our state-of-the-art facilities, combined with a compassionate team of world-class medical professionals, ensure that every patient receives the highest standard of care.
            </p>
            <p className="text-slate-500 leading-relaxed mb-8">
              We believe in holistic healing — treating not just the illness but the whole person. From advanced diagnostic tools to cutting-edge surgical techniques, we are equipped to handle every medical challenge.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-lg shadow-sky-500/25 hover:opacity-90 transition-opacity"
            >
              Book a Consultation <ChevronRight size={16} />
            </button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: <Heart size={24} className="text-rose-500" />, bg: "bg-rose-50", title: "Patient-First", desc: "Every decision is guided by the best interest of our patients." },
              { icon: <Award size={24} className="text-amber-500" />, bg: "bg-amber-50", title: "NABH Accredited", desc: "Certified to the highest national standards of hospital quality." },
              { icon: <Zap size={24} className="text-sky-500" />, bg: "bg-sky-50", title: "Advanced Tech", desc: "The latest diagnostic and surgical equipment at your service." },
              { icon: <Users size={24} className="text-teal-500" />, bg: "bg-teal-50", title: "Holistic Care", desc: "Treating the whole person — mind, body, and spirit." },
            ].map((item, i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                  {item.icon}
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="relative z-10 py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs font-black tracking-widest text-sky-600 uppercase">Patient Stories</span>
            <h2 className="text-4xl font-extrabold text-slate-800 mt-2">What Our Patients Say</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex text-amber-400 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.dept}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT + FOOTER ─── */}
      <footer id="contact" className="relative z-10 bg-slate-900 text-white pt-16 pb-8">
        <div className="container mx-auto px-6 grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Activity size={20} />
              </div>
              <span className="text-xl font-bold">City<span className="text-sky-400">Hospital</span></span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Delivering compassionate, world-class healthcare to the community for over 25 years. Your health and well-being is our highest priority.
            </p>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2"><MapPin size={14} className="text-sky-400" /> 123 Medical Avenue, Health District, Your City – 500001</div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-sky-400" /> +91 98765 43210 (General) · +91 98765 11111 (Emergency)</div>
              <div className="flex items-center gap-2"><Mail size={14} className="text-sky-400" /> info@cityhospital.com</div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Hospital</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              {["About Us", "Our Doctors", "Our Specialities", "International Patients", "Patient Information", "Careers"].map(l => (
                <li key={l}><a href="#" className="hover:text-sky-400 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Quick Access</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><button onClick={() => setModalOpen(true)} className="hover:text-sky-400 transition-colors text-left">Book an Appointment</button></li>
              {["Emergency Services", "Telemedicine", "Lab Reports", "Contact Us", "Privacy Policy"].map(l => (
                <li key={l}><a href="#" className="hover:text-sky-400 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-slate-500 text-xs">&copy; 2026 City General Hospital. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="/auth/login" className="hover:text-sky-400 transition-colors">Patient Login</a>
            <a href="/auth/register" className="hover:text-sky-400 transition-colors">Register</a>
          </div>
        </div>
      </footer>

      {/* ─── STICKY BOOK APPOINTMENT TAB ─── */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[9980] flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest py-4 px-3 shadow-xl hover:pr-5 transition-all rounded-l-xl"
        style={{ background: "linear-gradient(180deg, #0284c7 0%, #0d9488 100%)", writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        <Calendar size={14} style={{ transform: "rotate(90deg)" }} />
        Book an Appointment
      </button>

      {/* ─── WIDGETS ─── */}
      <AppointmentModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <PublicChatWidget />
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomeContent />
    </React.Suspense>
  );
}

// ─── STATIC DATA ───

const DEPARTMENTS = [
  { name: "Cardiology", desc: "Heart & Vascular", icon: <Heart size={28} className="text-rose-500" />, bg: "bg-rose-50" },
  { name: "Neurology", desc: "Brain & Nervous System", icon: <Brain size={28} className="text-violet-500" />, bg: "bg-violet-50" },
  { name: "Orthopaedics", desc: "Bone & Joint Care", icon: <Bone size={28} className="text-amber-500" />, bg: "bg-amber-50" },
  { name: "Paediatrics", desc: "Child Healthcare", icon: <Baby size={28} className="text-pink-500" />, bg: "bg-pink-50" },
  { name: "Oncology", desc: "Cancer Treatment", icon: <Microscope size={28} className="text-sky-500" />, bg: "bg-sky-50" },
  { name: "Gastroenterology", desc: "Digestive Health", icon: <Activity size={28} className="text-teal-500" />, bg: "bg-teal-50" },
  { name: "Pulmonology", desc: "Lung & Respiratory", icon: <Wind size={28} className="text-cyan-500" />, bg: "bg-cyan-50" },
  { name: "Ophthalmology", desc: "Eye Care", icon: <Eye size={28} className="text-indigo-500" />, bg: "bg-indigo-50" },
];

const TESTIMONIALS = [
  {
    quote: "The care I received at City Hospital was truly exceptional. The doctors were knowledgeable and the staff was incredibly compassionate throughout my treatment.",
    name: "Priya Sharma",
    initials: "PS",
    dept: "Cardiology Department",
  },
  {
    quote: "From the moment I arrived, I felt in safe hands. The orthopaedic team handled my knee surgery flawlessly and the recovery support was outstanding.",
    name: "Rajesh Menon",
    initials: "RM",
    dept: "Orthopaedics Department",
  },
  {
    quote: "Excellent facilities and a world-class team of neurologists. My entire family trusts City General Hospital for all our healthcare needs.",
    name: "Ananya Krishnan",
    initials: "AK",
    dept: "Neurology Department",
  },
];

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-sky-100 transition-all hover:-translate-y-1"
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// Needed for the sticky tab icon
function Calendar({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
