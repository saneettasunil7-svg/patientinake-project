"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { useAuth } from '@/context/AuthContext';
import IncomingCallAlert from '@/components/IncomingCallAlert';

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Only run redirect logic for patients, if we have a token and are not already on the emergency page
        if (!isLoading && (!user || user.role !== 'patient')) {
            router.replace('/auth/login');
            return;
        }
        if (isLoading || !user || user.role !== 'patient' || pathname === '/patient/emergency-call') return;

        const checkActiveEmergency = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const res = await fetch(`${getApiBaseUrl()}/tokens/my-active/token`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_emergency) {
                        router.replace('/patient/emergency-call');
                    }
                }
            } catch (e) {
                // Silently ignore background check errors to prevent console spam
            }
        };

        checkActiveEmergency();
        // Periodically check (every 30s) to catch newly initiated emergencies while navigating
        const interval = setInterval(checkActiveEmergency, 2000);
        return () => clearInterval(interval);
    }, [pathname, router, user, isLoading]);

    return (
        <>
            <IncomingCallAlert />
            {children}
        </>
    );
}
