'use client';
// Thin client entry for all /admin/* routes (Next.js App Router port of the Vite setup:
// <Route path="/admin/*" element={<ProtectedAdminRoute><AdminDashboard/></ProtectedAdminRoute>} />).
//
// Semantics preserved from frontend/App.tsx:
//   - ProtectedAdminRoute: localStorage 'v2_admin_session' === 'true' AND 'v2_token' present,
//     else redirect to /admin/login (replace semantics).
//   - While the session is unverified, render the AdminLoading fallback
//     ("Initializing Command..." spinner) exactly like the Vite Suspense fallback.
//   - The optional catch-all [[...path]] matches /admin and /admin/<anything>, and internal
//     view routing keeps working through the ?page= query param — the ported AdminDashboard
//     reads it via useSearchParams(), so refresh + deep links behave exactly like the original.
import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminDashboard from '../../../components/admin/AdminDashboard';

// Admin loading fallback (identical markup to AdminLoading in frontend/App.tsx)
const AdminLoading = () => (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-luxury-gold/60">Initializing Command...</p>
        </div>
    </div>
);

// Client-side guard reproducing ProtectedAdminRoute (UX only — the backend enforces permissions).
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        const isAdmin = localStorage.getItem('v2_admin_session') === 'true';
        const hasToken = !!localStorage.getItem('v2_token');
        if (isAdmin && hasToken) {
            setVerified(true);
        } else {
            router.replace('/admin/login');
        }
    }, [router]);

    if (!verified) return <AdminLoading />;
    return <>{children}</>;
};

const AdminDashboardInner = () => {
    // Path is surfaced for parity with the Vite /admin/* route (the dashboard's internal
    // views are driven by the ?page= query param, which useSearchParams picks up directly).
    const pathname = usePathname();
    return (
        <Suspense fallback={<AdminLoading />} key={pathname}>
            <AdminDashboard />
        </Suspense>
    );
};

export default function AdminPage() {
    return (
        <ProtectedAdminRoute>
            <AdminDashboardInner />
        </ProtectedAdminRoute>
    );
}
