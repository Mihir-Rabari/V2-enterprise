'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useMyOrders } from '@/hooks/useMyOrders';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { Order } from '@/types';

/**
 * Orders view (Purchase History) — Next.js port of the `Orders` component in
 * the Vite `frontend/pages/Account.tsx` (was `<Route path="orders">` of the
 * nested Routes under /account).
 *
 * Behavior notes (faithful port):
 *  - Order list via the shared `useMyOrders()` hook (ordersAPI.getMyOrders),
 *    with the same skeleton loading state and dashed "No orders yet." empty
 *    state. Without a backend the hook settles into its empty state — no
 *    crash, matching the source's `.catch(() => setError(...))` semantics.
 *  - Clicking an order opens the shared OrderDetailsModal (isAdmin={false}),
 *    exactly like the source.
 *  - Same stagger container/item motion variants and status pill colors.
 *
 * Latent strict-error fixes (behavior-neutral, in-file only):
 *  - The source stored `useMyOrders()` rows (whose hook-local `MyOrder` shape
 *    differs from the shared `Order` type, e.g. `paymentMethod` vs `method`)
 *    into a `useState<Order | null>` via an `as any` cast — Vite's tsc never
 *    gated the build. Replaced with an `as unknown as Order` cast: identical
 *    runtime value handed to the modal, no `any` under strict typecheck.
 *  - The standalone variant objects are annotated with framer-motion's
 *    `Variants`: untyped, `ease: [0.22, 1, 0.36, 1]` infers `number[]`, which
 *    is not assignable to the `Easing` union's `readonly [n, n, n, n]` tuple
 *    (framer-motion v12). Annotation only constrains compile-time typing;
 *    runtime values and animations are identical.
 */

const Orders = () => {
    const { orders, loading: ordersLoading } = useMyOrders();
    const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
    const [modalOpen, setModalOpen] = React.useState(false);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'DELIVERED') return 'bg-green-50 text-green-800';
        if (status === 'CANCELLED') return 'bg-red-50 text-red-700';
        return 'bg-luxury-gold/5 text-luxury-gold';
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 sm:space-y-12"
        >
            <div className="space-y-4">
                <h2 className="font-serif text-3xl italic text-luxury-black tracking-tighter">Purchase History</h2>
                <div className="w-12 h-[1px] bg-luxury-gold/30" />
            </div>

            {ordersLoading ? (
                <div className="animate-pulse space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-32 bg-gray-50 rounded" />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-gray-200 rounded">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No orders yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order, i) => (
                        <motion.div
                            key={i}
                            variants={itemVariants}
                            onClick={() => {
                                setSelectedOrder(order as unknown as Order);
                                setModalOpen(true);
                            }}
                            className="group border border-gray-100 p-8 sm:p-10 hover:border-luxury-gold hover:shadow-2xl hover:shadow-black/[0.03] transition-all duration-700 bg-white relative cursor-pointer"
                        >
                            <div className="absolute top-6 right-8">
                                <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${getStatusColor(order.status)}`}>
                                    <span className="inline-block w-1 h-1 rounded-full bg-current mr-2 animate-pulse" />
                                    {order.status}
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-10">
                                <div className="w-full">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Order Ref</p>
                                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black">{order.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Date</p>
                                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Amount</p>
                                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black">₹{order.total.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="hidden lg:block space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">{order.items.length} Item{order.items.length !== 1 ? 's' : ''}</p>
                                            <p className="text-[10px] font-bold tracking-luxury text-gray-500 italic">
                                                {order.items?.map(i => i.productName).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <OrderDetailsModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                order={selectedOrder}
                isAdmin={false}
            />
        </motion.div>
    );
};

export default Orders;
