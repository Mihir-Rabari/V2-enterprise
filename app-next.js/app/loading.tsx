// Root loading UI — centered luxury-gold spinner, following the AdminLoading
// pattern from frontend/App.tsx, applied globally for route-segment loads.
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-luxury-gold/60">
          Loading...
        </p>
      </div>
    </div>
  );
}
