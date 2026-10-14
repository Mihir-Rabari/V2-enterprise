'use client';

/**
 * Shared client providers for the whole Next.js app.
 *
 * Currently renders only the react-hot-toast <Toaster>, identical to the
 * config in frontend/App.tsx. The shared-contexts agent will extend this
 * file with SettingsProvider and the customer context stack (AuthProvider,
 * InitialLoadProvider, QuickViewProvider, CartProvider) as those contexts
 * are ported — see MIGRATION_PLAN.md (OWNERSHIP matrix).
 */

import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0A0A0B',
            color: '#fff',
            fontSize: '13px',
            border: '1px solid #1f2937',
          },
          duration: 4000,
        }}
      />
    </>
  );
}
