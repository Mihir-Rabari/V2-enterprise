/**
 * Placeholder home page ("/") inside the (storefront) route group.
 *
 * ⚠️ PLACEHOLDER — this file will be REPLACED by the home-page agent with the
 * ported frontend/pages/Home implementation (see MIGRATION_PLAN.md, OWNERSHIP
 * matrix). The (storefront) group exists so all customer-facing pages can
 * later share a single layout (Navbar/Footer + context stack) without
 * affecting the standalone routes (admin, size-guide, auth utility pages).
 *
 * There is deliberately NO app/page.tsx at the app root — this route group
 * owns "/".
 */

export default function StorefrontHomePage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-luxury-gold">
          V2 Enterprise
        </p>
        <h1 className="font-serif text-4xl md:text-5xl italic text-luxury-black">
          Premium Luxury Fashion
        </h1>
        <div className="luxury-divider mx-auto" />
        <p className="text-sm text-gray-500 leading-relaxed">
          The Next.js App Router foundation is in place. The full storefront —
          home, shop, collections, and account — is being migrated here.
        </p>
        <p className="text-[10px] font-bold uppercase tracking-luxury text-gray-400">
          Crafted with care in Bhavnagar, Gujarat
        </p>
      </div>
    </main>
  );
}
