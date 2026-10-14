import Link from 'next/link';

// Ported 404 page from frontend/components/CustomerView.tsx (the catch-all
// route): serif italic "404", uppercase message, "Return Home" link.
export default function NotFound() {
  return (
    <div className="p-40 text-center space-y-4">
      <h2 className="font-serif text-4xl italic">404</h2>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        The requested coordinate does not exist.
      </p>
      <Link
        href="/"
        className="inline-block mt-8 text-[10px] font-bold uppercase tracking-luxury border-b border-black pb-1"
      >
        Return Home
      </Link>
    </div>
  );
}
