'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Package, Heart, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

/**
 * /account/* shared shell — Next.js App Router port of the layout chrome of
 * the Vite `frontend/pages/Account.tsx` (`<Account>` component).
 *
 * In the Vite SPA, `CustomerView.tsx` mounted `<Route path="account/*">` and
 * Account.tsx rendered the header + sidebar nav + a content area wrapping
 * NESTED `<Routes>` (index → Profile, orders → Orders, wishlist → Wishlist,
 * addresses → Addresses). Here the App Router owns the sub-routing: each Vite
 * sub-route is its own folder under `app/(storefront)/account/`, and this
 * layout renders around all of them exactly like `<Account>` did.
 *
 * Behavior notes (faithful port):
 *  - Unauthenticated visitors are redirected to login with replace semantics
 *    (source: `if (!isAuthenticated) return <Navigate to="/login"
 *    state={{ from: location }} replace />`). Next's router can't carry
 *    React-Router state, so the current pathname travels via the `?redirect=`
 *    query param — the same fallback the Vite Login.tsx already supported:
 *    `location.state?.from?.pathname || searchParams.get('redirect')`.
 *  - The gate is deferred by one macro-task: AuthProvider (this layout's
 *    parent) restores the session from localStorage in its own mount effect,
 *    which runs in the same commit as this layout's effect (child effects
 *    run before parent effects). A logged-in visitor therefore settles as
 *    authenticated BEFORE the check fires and is never falsely redirected.
 *    Until the gate settles, the shell keeps rendering (SSR always renders
 *    the shell — auth state only exists on the client, hydration-safe).
 *  - Nav active state: exact match for /account, prefix match for subpaths
 *    (source: `location.pathname === item.path` vs `startsWith`).
 *  - Logout: `logout(); navigate('/')` → `logout(); router.push('/')`.
 *  - Content-area transition: AnimatePresence keyed by pathname, identical
 *    motion values to the Vite `motion.div` that wrapped the nested Routes.
 *  - Unknown subpaths (`/account/<anything>`): Vite's nested Routes matched
 *    nothing and rendered an empty content area; here
 *    `app/(storefront)/account/[...rest]/page.tsx` renders null inside this
 *    shell, so the shell + empty content behavior (and the 200) is preserved.
 */

const menuItems = [
    { path: '/account', label: 'Profile', icon: User, exact: true },
    { path: '/account/orders', label: 'Orders', icon: Package },
    { path: '/account/wishlist', label: 'Wishlist', icon: Heart },
    { path: '/account/addresses', label: 'Addresses', icon: MapPin },
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    // False until the deferred auth check has run at least once (SSR and the
    // first client render always see `user = null` — hydration-safe context).
    const [gateSettled, setGateSettled] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setGateSettled(true);
            if (!isAuthenticated) {
                // Source passed `state: { from: location }`; Login reads only
                // the pathname, via the `redirect` search-param fallback it
                // already supported in the Vite codebase.
                router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [isAuthenticated, pathname, router]);

    // After the gate has settled on "unauthenticated", render nothing while
    // the replace-navigation to /login is in flight (Vite's <Navigate>
    // replaced the whole tree with the login route — nothing of the account
    // page stayed visible).
    if (gateSettled && !isAuthenticated) {
        return null;
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Minimalist Header - Space Collapsed */}
            <div className="py-16 sm:py-24 bg-zinc-50 border-b border-gray-100 relative overflow-hidden">
                <div className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)] relative z-10">
                    <div className="flex flex-col gap-4">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3"
                        >
                            <span className="text-luxury-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.4em]">Atelier Client</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="font-serif text-5xl sm:text-6xl italic text-luxury-black tracking-tighter leading-none"
                        >
                            My Account.
                        </motion.h1>
                    </div>
                </div>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-luxury-gold/5 to-transparent pointer-events-none" />
            </div>

            <div className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)] pt-12 sm:pt-20 pb-32">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

                    {/* Navigation - Underline Design */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <nav className="flex lg:flex-col items-center lg:items-start gap-1 sm:gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide snap-x">
                            {menuItems.map(item => {
                                const isActive = 'exact' in item && item.exact
                                    ? pathname === item.path
                                    : pathname.startsWith(item.path);

                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`group relative flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-300 whitespace-nowrap snap-start ${isActive ? 'text-luxury-gold' : 'text-gray-400 hover:text-luxury-black underline-offset-8'}`}
                                    >
                                        <item.icon size={14} strokeWidth={isActive ? 2 : 1.5} className="transition-all" />
                                        {item.label}

                                        {/* Underline Active State */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute -bottom-1 lg:bottom-0 left-4 right-4 h-[2px] bg-luxury-gold lg:left-0 lg:w-[2px] lg:h-full lg:top-0"
                                            />
                                        )}

                                        {/* Hover Indicator (Desktop Only) */}
                                        <div className="hidden lg:block absolute left-0 w-0 h-full bg-zinc-50 -z-10 group-hover:w-full transition-all duration-300" />
                                    </Link>
                                );
                            })}

                            <div className="h-4 w-px bg-gray-100 mx-4 lg:hidden" />

                            <button
                                onClick={() => {
                                    logout();
                                    router.push('/');
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-red-900 group transition-all duration-300 whitespace-nowrap snap-start hover:bg-red-50/50"
                            >
                                <LogOut size={14} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
                                Logout
                            </button>
                        </nav>
                    </aside>

                    {/* Content Section - Compact Margin */}
                    <main className="flex-1 w-full min-h-[50vh]">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{
                                    duration: 0.5,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </div>
    );
}
