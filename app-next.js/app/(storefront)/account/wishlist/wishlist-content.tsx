'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { wishlistAPI } from '@/lib/apiClient';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

/**
 * Wishlist view (Saved Selection) — Next.js port of the `Wishlist` component
 * in the Vite `frontend/pages/Account.tsx` (was `<Route path="wishlist">` of
 * the nested Routes under /account). This is also the redirect target of the
 * legacy `/liked` URL (see app/(storefront)/liked/page.tsx).
 *
 * Behavior notes (faithful port):
 *  - Fetches wishlistAPI.get() on mount; skeleton grid while loading; dashed
 *    "Your selection is empty." empty state (a failed fetch — e.g. no backend —
 *    also settles into the empty state, exactly like the source's catch).
 *  - Each item renders the shared ProductCard with isWishlistPage={true}, so
 *    the heart acts as "remove" (wishlistAPI.remove + onRemove) and the item
 *    disappears from the grid without a refetch — same as the source.
 *
 * Latent strict-error fixes (behavior-neutral, in-file only):
 *  - The source passed `sizes={item.sizes}` although neither the Vite nor the
 *    Next `Product` type declares `sizes` (the wishlist endpoint returns it
 *    at runtime; Vite's tsc never gated the build). Declared via a local
 *    intersection type so strict typecheck passes with identical runtime
 *    behavior.
 */

/** Product extended with the `sizes` field the wishlist endpoint returns. */
type WishlistProduct = Product & { sizes?: string[] };

const Wishlist = () => {
    const [savedItems, setSavedItems] = React.useState<WishlistProduct[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchWishlist = async () => {
            try {
                const res = await wishlistAPI.get();
                setSavedItems(res.data.data || []);
            } catch (error) {
                console.error('Failed to fetch wishlist:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWishlist();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-[3/4] bg-zinc-50 rounded" />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 sm:space-y-12"
        >
            <div className="space-y-4">
                <h2 className="font-serif text-3xl italic text-luxury-black tracking-tighter">Saved Selection</h2>
                <div className="w-12 h-[1px] bg-luxury-gold/30" />
            </div>

            {savedItems.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-gray-100 rounded-lg">
                    <Heart size={32} strokeWidth={1} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Your selection is empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 lg:gap-16">
                    {savedItems.map(item => (
                        <ProductCard
                            key={item._id || item.id}
                            id={item._id || item.id}
                            name={item.name}
                            price={item.price}
                            image={item.photo}
                            isWishlistPage={true}
                            sizes={item.sizes}
                            onRemove={(id) => {
                                setSavedItems(prev => prev.filter(p => (p._id || p.id) !== id));
                            }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default Wishlist;
