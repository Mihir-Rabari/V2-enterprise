'use client';

// Root error boundary — dark, minimal, on-brand fallback for unhandled
// render errors in any route segment. Clicking "Try again" re-renders
// the failed segment via the reset() prop provided by the App Router.

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for diagnostics (server logs capture it too).
    console.error('[V2] Unhandled route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-6 text-white">
      <div className="text-center space-y-6">
        <p className="font-serif italic text-4xl text-luxury-gold">Something went wrong</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          An unexpected error occurred while rendering this page.
        </p>
        <button
          onClick={reset}
          className="inline-block text-[10px] font-bold uppercase tracking-luxury text-luxury-gold border-b border-luxury-gold pb-1 hover:text-white hover:border-white transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
