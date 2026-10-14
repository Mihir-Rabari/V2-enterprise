'use client';

/**
 * Ported from frontend/pages/Checkout.tsx (Vite/React Router) to Next.js App Router.
 *
 * Route: /checkout (rendered by `app/(storefront)/checkout/page.tsx`).
 *
 * ── PR#14 payment contract — preserved EXACTLY ──────────────────────────────
 *
 *  1. `baseOrderData.items = cart.map(item => ({ productId: item.id,
 *     quantity: item.quantity, size: item.selectedSize, color: item.selectedColor }))`
 *  2. Prepaid: `paymentsAPI.createRazorpayOrder({ items: baseOrderData.items })` —
 *     the SERVER prices the cart (backend `priceCart`, method 'prepaid', ₹50/item
 *     discount) and creates the Razorpay order. The client NEVER sends an
 *     amount; `rzpOrder.amount` comes from the server response and is only
 *     echoed into the Razorpay checkout options.
 *  3. Razorpay checkout.js is loaded dynamically ONLY on this page (script id
 *     `razorpay-checkout-js`, https://checkout.razorpay.com/v1/checkout.js).
 *  4. On payment success: `ordersAPI.place({ ...baseOrderData, razorpayOrderId:
 *     response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id,
 *     razorpaySignature: response.razorpay_signature })` — the server verifies the
 *     signature, re-prices, matches amount + cart against the PaymentIntent, and
 *     is the sole authority on the final total.
 *  5. Offline flow (COD/pickup): `ordersAPI.place(baseOrderData)` with no payment
 *     fields.
 *  6. Confirmation step (gold check, `placedOrderId || #V2-<ts>` reference,
 *     "Processing" status) shown only after a successful place.
 *
 * ── Migration changes (behavior-neutral; everything else preserved verbatim) ──
 *
 *  - `useNavigate` (react-router-dom) → `useRouter` (next/navigation):
 *    navigate('/login?redirect=/checkout') → router.push('/login?redirect=/checkout'),
 *    navigate('/cart') → router.push('/cart'), navigate('/') → router.push('/').
 *    `useLocation` was imported but never used in the source — not ported.
 *  - `usePageMeta(...)` → replaced by the static `metadata` export in
 *    `page.tsx` (Next.js server-rendered head). Same title/description.
 *  - `import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Ra1wuaC73eKZrI'` →
 *    `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_Ra1wuaC73eKZrI'`
 *    (same fallback; no .env in the legacy repo ever set the Vite variable).
 *  - sessionStorage restore made hydration-safe (Next.js also renders this
 *    component on the server, where sessionStorage does not exist, and the
 *    server HTML must match the first client render). The Vite version read
 *    `v2_pending_shipping` / `v2_pending_payment` inside the useState
 *    initializers; here the initial state matches the Vite defaults with
 *    `user = null` (the ported AuthContext starts null and hydrates in an
 *    effect, and the preserved `[user]` sync effect fills the fields once the
 *    user is known), and the saved values are restored in mount effects BEFORE
 *    any write, gated so the initial state can never clobber saved data — the
 *    same pattern as the ported CartContext. Key names, JSON shape, and the
 *    "write on every change" persistence behavior are unchanged.
 *  - Duplicate-submission behavior is exactly the source's: `orderLoading` /
 *    `orderError` are tracked but (as in the source) never read by the render,
 *    and the submit button has no disabled guard. The source relies on the
 *    modal blocking interaction plus the server's exactly-once payment-intent
 *    claim for replay safety — nothing weakened, nothing added.
 *  - `user.addresses?.find((a: any) => a.isDefault)` kept verbatim from the
 *    source (the ported AuthUser type would accept `a => a.isDefault` too;
 *    runtime behavior identical either way).
 *
 * Known limitation (documented in the PR): PR #14's backend changes are merged
 * but have not been verified end-to-end against real MongoDB/Razorpay from this
 * port (no backend/Mongo on this box). This frontend is contract-faithful to
 * dev's current implementation; it does NOT mock Razorpay or reshape any API.
 */

import React, { useState, useEffect } from 'react';
import { ordersAPI, paymentsAPI } from '@/lib/apiClient';

declare global {
    interface Window {
        Razorpay: any;
    }
}
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    ChevronRight,
    MapPin,
    CreditCard,
    ShoppingBag,
    ArrowLeft,
    Truck,
    ShieldCheck,
    Package
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

type CheckoutStep = 'summary' | 'shipping' | 'payment' | 'confirmation';

const Checkout: React.FC = () => {
    // usePageMeta({ title: 'Checkout | V2 Enterprise', description: 'Securely
    // complete your V2 Enterprise order.', canonical: '/checkout' }) was ported
    // to the static `metadata` export in `page.tsx`.

    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const { cart, cartTotal: subtotal, clearCart } = useCart();
    const [step, setStep] = useState<CheckoutStep>('summary');
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderError, setOrderError] = useState('');
    const [placedOrderId, setPlacedOrderId] = useState('');

    // Load Razorpay dynamically ONLY on the checkout page
    useEffect(() => {
        const scriptId = 'razorpay-checkout-js';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const [shippingData, setShippingData] = useState(() => ({
        // Hydration-safe initial state: the Vite initializer read sessionStorage
        // (browser-only) and user data (always null on the first render in the
        // ported AuthContext). Restore from sessionStorage happens in the mount
        // effect below; the [user] effect further down syncs user fields.
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        phone: ''
    }));

    // Restore from sessionStorage (if they just logged in) — client-only.
    const [shippingRestored, setShippingRestored] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem('v2_pending_shipping');
        if (saved) {
            try {
                setShippingData(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse saved shipping data', e);
            }
        }
        setShippingRestored(true);
    }, []);

    // Save shipping data to session storage whenever it changes (to survive login redirect)
    useEffect(() => {
        if (!shippingRestored) return; // never let the initial state clobber the saved value
        sessionStorage.setItem('v2_pending_shipping', JSON.stringify(shippingData));
    }, [shippingData, shippingRestored]);

    const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'pickup' | 'cod'>('prepaid');

    // Restore persisted payment method — client-only, mirroring the Vite
    // initializer `(sessionStorage.getItem('v2_pending_payment') as any) || 'prepaid'`.
    const [paymentRestored, setPaymentRestored] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem('v2_pending_payment') as 'prepaid' | 'pickup' | 'cod' | null;
        if (saved) setPaymentMethod(saved);
        setPaymentRestored(true);
    }, []);

    useEffect(() => {
        if (!paymentRestored) return;
        sessionStorage.setItem('v2_pending_payment', paymentMethod);
    }, [paymentMethod, paymentRestored]);

    // Sync shippingData when user changes (after login or address update)
    useEffect(() => {
        if (user) {
            const defaultAddr = user.addresses?.find((a: any) => a.isDefault);
            setShippingData(prev => ({
                ...prev,
                firstName: user.name.split(' ')[0],
                lastName: user.name.split(' ').slice(1).join(' '),
                email: user.email,
                phone: user.phone || prev.phone,
                address: defaultAddr?.street || prev.address,
                city: defaultAddr?.city || prev.city,
                state: defaultAddr?.state || prev.state,
                zipCode: defaultAddr?.zipCode || prev.zipCode,
            }));
        }
    }, [user]);

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const shipping = 0; // Removed extra shipping charges
    const discountPerItem = paymentMethod === 'pickup' ? 100 : (paymentMethod === 'prepaid' ? 50 : 0);
    const checkoutDiscount = totalItems * discountPerItem;
    const total = subtotal + shipping - checkoutDiscount;

    const handleNext = async () => {
        if (step === 'summary') setStep('shipping');
        else if (step === 'shipping') {
            if (!shippingData.phone || shippingData.phone.trim().length < 10) {
                setOrderError('Please provide a valid phone number for delivery updates.');
                // Scroll to error if needed, or just stay on step
                return;
            }
            setStep('payment');
        }
        else if (step === 'payment') {
            if (!isAuthenticated) {
                // Save current step to restore after login
                sessionStorage.setItem('v2_checkout_step', 'payment');
                router.push('/login?redirect=/checkout');
                return;
            }
            setOrderLoading(true);
            setOrderError('');

            const address = JSON.stringify({
                street: shippingData.address,
                city: shippingData.city,
                state: shippingData.state,
                zipCode: shippingData.zipCode,
                country: shippingData.country,
                name: `${shippingData.firstName} ${shippingData.lastName}`,
                email: shippingData.email,
            });

            const baseOrderData = {
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    size: item.selectedSize,
                    color: item.selectedColor,
                })),
                method: paymentMethod,
                address,
                phone: shippingData.phone,
            };

            if (paymentMethod === 'prepaid') {
                try {
                    // 1. Create Razorpay order on server — the server prices the
                    //    cart (PR #14); the client never sends an amount.
                    const rzpOrderRes = await paymentsAPI.createRazorpayOrder({
                        items: baseOrderData.items,
                    });
                    const rzpOrder = rzpOrderRes.data.data;

                    const options = {
                        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_Ra1wuaC73eKZrI',
                        amount: rzpOrder.amount,
                        currency: "INR",
                        name: "V2 Fashion",
                        description: "Purchase Payment",
                        order_id: rzpOrder.id,
                        handler: async (response: any) => {
                            // 2. Verified and place final order
                            try {
                                setOrderLoading(true);
                                const finalOrderData = {
                                    ...baseOrderData,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature,
                                };
                                const res = await ordersAPI.place(finalOrderData);
                                setPlacedOrderId(res.data.data.orderId);
                                setStep('confirmation');
                                clearCart();
                                sessionStorage.removeItem('v2_pending_shipping');
                                sessionStorage.removeItem('v2_pending_payment');
                                sessionStorage.removeItem('v2_checkout_step');
                            } catch (err: any) {
                                setOrderError(err.response?.data?.message || 'Payment verified but order creation failed.');
                            } finally {
                                setOrderLoading(false);
                            }
                        },
                        prefill: {
                            name: `${shippingData.firstName} ${shippingData.lastName}`,
                            email: shippingData.email,
                            contact: shippingData.phone
                        },
                        theme: { color: "#000000" },
                        modal: {
                            ondismiss: () => setOrderLoading(false)
                        }
                    };

                    const rzp = new window.Razorpay(options);
                    rzp.open();
                } catch (err: any) {
                    setOrderError(err.response?.data?.message || 'Failed to initialize payment.');
                    setOrderLoading(false);
                }
            } else {
                // Offline flow (COD/Pickup)
                try {
                    const res = await ordersAPI.place(baseOrderData);
                    setPlacedOrderId(res.data.data.orderId);
                    setStep('confirmation');
                    clearCart();
                    sessionStorage.removeItem('v2_pending_shipping');
                    sessionStorage.removeItem('v2_pending_payment');
                    sessionStorage.removeItem('v2_checkout_step');
                } catch (err: any) {
                    const errMsg = err.response?.data?.message || 'Failed to place order.';
                    setOrderError(errMsg);

                    // If the error mentions 'unavailable' or 'invalid format', it's likely stale cart data
                    if (errMsg.toLowerCase().includes('unavailable') || errMsg.toLowerCase().includes('format') || errMsg.toLowerCase().includes('clear your cart')) {
                        console.warn('Stale cart data detected. Suggesting cart clear.');
                    }
                } finally {
                    setOrderLoading(false);
                }
            }
        }
    };

    // Restore step if coming back from login
    useEffect(() => {
        const savedStep = sessionStorage.getItem('v2_checkout_step');
        if (savedStep && isAuthenticated) {
            setStep(savedStep as CheckoutStep);
        }
    }, [isAuthenticated]);

    const handleBack = () => {
        if (step === 'shipping') setStep('summary');
        else if (step === 'payment') setStep('shipping');
        else router.push('/cart');
    };

    if (step === 'confirmation') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center space-y-8"
                >
                    <div className="w-24 h-24 bg-luxury-gold rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-luxury-gold/20">
                        <Check size={48} className="text-white" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="font-serif text-4xl italic text-luxury-black tracking-tighter">Order Confirmed</h1>
                        <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-gray-400">Your curation is being prepared for transit.</p>
                    </div>
                    <div className="bg-luxury-gray p-8 rounded-2xl space-y-4 text-left border border-gray-50">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-gray-400">Order Reference</span>
                            <span className="text-luxury-black">{placedOrderId || `#V2-${Date.now()}`}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-gray-400">Status</span>
                            <span className="text-green-600">Processing</span>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-luxury-black text-white py-5 text-[10px] font-bold uppercase tracking-luxury-widest hover:bg-black transition-all"
                    >
                        Return to Atelier
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Checkout Navbar */}
            <nav className="h-20 border-b border-gray-50 flex items-center px-6 lg:px-12 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto w-full flex justify-between items-center">
                    <button onClick={handleBack} className="flex items-center gap-2 group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Back</span>
                    </button>
                    <div className="flex items-center gap-12">
                        {[
                            { id: 'summary', label: 'Summary', icon: ShoppingBag },
                            { id: 'shipping', label: 'Shipping', icon: MapPin },
                            { id: 'payment', label: 'Payment', icon: CreditCard }
                        ].map((s, idx) => (
                            <div key={s.id} className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${step === s.id ? 'bg-luxury-black text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest hidden sm:block ${step === s.id ? 'text-luxury-black' : 'text-gray-300'
                                    }`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </nav>

            <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">

                    {/* Form Content */}
                    <div className="lg:col-span-7 space-y-16">
                        <AnimatePresence mode="wait">
                            {step === 'summary' && (
                                <motion.div
                                    key="summary"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-12"
                                >
                                    <div className="space-y-4">
                                        <h2 className="font-serif text-4xl italic text-luxury-black tracking-tight">Review Curation</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Verifying your selected pieces for transition.</p>
                                    </div>

                                    <div className="space-y-8">
                                        {cart.map((item) => (
                                            <div key={`${item.id}-${item.selectedSize}`} className="flex gap-8 items-center group">
                                                <div className="w-20 h-24 bg-luxury-gray relative overflow-hidden flex-shrink-0">
                                                    <img src={item.photo} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={item.name} />
                                                    <div className="absolute top-0 right-0 bg-luxury-black text-white px-2 py-1 text-[8px] font-bold">
                                                        x{item.quantity}
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <h3 className="font-serif text-xl italic text-luxury-black">{item.name}</h3>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                                            {item.selectedSize && `Size: ${item.selectedSize}`}
                                                            {item.selectedColor && ` | Color: ${item.selectedColor}`}
                                                        </p>
                                                        <span className="text-sm font-bold text-luxury-charcoal">₹{(item.price * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-gray-50 p-8 rounded-2xl flex items-center justify-between border border-dashed border-gray-200">
                                        <div className="flex items-center gap-4">
                                            <ShieldCheck size={20} className="text-luxury-gold" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-black">Atelier Guarantee</p>
                                                <p className="text-[9px] font-medium text-gray-400 italic">Authenticity and quality verified for every piece.</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'shipping' && (
                                <motion.div
                                    key="shipping"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-12"
                                >
                                    <div className="space-y-4">
                                        <h2 className="font-serif text-4xl italic text-luxury-black tracking-tight">Destination</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Where shall we deliver your collection?</p>
                                    </div>

                                    {/* Saved Addresses Selection */}
                                    {isAuthenticated && user?.addresses && user.addresses.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-[1px] bg-luxury-gold/30" />
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-luxury-gold">Select Saved Address</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {user.addresses.map((addr: any) => (
                                                    <div
                                                        key={addr._id}
                                                        onClick={() => {
                                                            setShippingData({
                                                                firstName: user.name.split(' ')[0],
                                                                lastName: user.name.split(' ').slice(1).join(' '),
                                                                email: user.email,
                                                                address: addr.street,
                                                                city: addr.city,
                                                                state: addr.state,
                                                                zipCode: addr.zipCode,
                                                                country: 'India',
                                                                phone: user.phone || ''
                                                            });
                                                        }}
                                                        className="p-4 border border-gray-100 rounded-xl hover:border-luxury-gold cursor-pointer transition-all bg-white relative group active:scale-[0.98]"
                                                    >
                                                        {addr.isDefault && (
                                                            <div className="absolute top-3 right-4 text-[7px] font-bold uppercase tracking-widest text-luxury-gold bg-luxury-gold/5 px-2 py-0.5 rounded-full border border-luxury-gold/10">Default</div>
                                                        )}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 text-luxury-gold">
                                                                <MapPin size={10} />
                                                                <p className="text-[8px] font-bold uppercase tracking-widest">{addr.label}</p>
                                                            </div>
                                                            <p className="text-[10px] text-luxury-black font-medium leading-relaxed uppercase">
                                                                {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3 py-4">
                                                <div className="flex-1 h-[1px] bg-gray-50" />
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-gray-300">Or Enter New Details</span>
                                                <div className="flex-1 h-[1px] bg-gray-50" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">First Name</label>
                                            <input
                                                type="text"
                                                className="w-full bg-luxury-gray border-none p-4 rounded-xl text-sm focus:ring-1 focus:ring-luxury-gold outline-none"
                                                value={shippingData.firstName}
                                                onChange={(e) => setShippingData({ ...shippingData, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
                                            <input
                                                type="text"
                                                className="w-full bg-luxury-gray border-none p-4 rounded-xl text-sm focus:ring-1 focus:ring-luxury-gold outline-none"
                                                value={shippingData.lastName}
                                                onChange={(e) => setShippingData({ ...shippingData, lastName: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Dispatch Email</label>
                                            <input
                                                type="email"
                                                className="w-full bg-luxury-gray border-none p-4 rounded-xl text-sm focus:ring-1 focus:ring-luxury-gold outline-none"
                                                value={shippingData.email}
                                                onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Street Address</label>
                                            <input
                                                type="text"
                                                className="w-full bg-luxury-gray border-none p-4 rounded-xl text-sm focus:ring-1 focus:ring-luxury-gold outline-none"
                                                value={shippingData.address}
                                                onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">City</label>
                                            <input
                                                type="text"
                                                className="w-full bg-luxury-gray border-none p-4 rounded-xl text-sm focus:ring-1 focus:ring-luxury-gold outline-none"
                                                value={shippingData.city}
                                                onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Postal Code</label>
                                            <input
                                                type="text"
                                                className="w-full bg-luxury-gray border-none p-4 rounded-xl text-sm focus:ring-1 focus:ring-luxury-gold outline-none"
                                                value={shippingData.zipCode}
                                                onChange={(e) => setShippingData({ ...shippingData, zipCode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'payment' && (
                                <motion.div
                                    key="payment"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-12"
                                >
                                    <div className="space-y-4">
                                        <h2 className="font-serif text-4xl italic text-luxury-black tracking-tight">Acquisition</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Select your preferred method of settlement.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div
                                            onClick={() => setPaymentMethod('prepaid')}
                                            className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${paymentMethod === 'prepaid' ? 'border-luxury-gold bg-gold-50/10' : 'border-gray-100 bg-white hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${paymentMethod === 'prepaid' ? 'bg-luxury-gold text-white' : 'bg-gray-50 text-gray-400'
                                                    }`}>
                                                    <CreditCard size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-luxury-black">Prepaid Card / UPI</p>
                                                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">₹50 Off per item</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'prepaid' ? 'border-luxury-gold' : 'border-gray-200'
                                                }`}>
                                                {paymentMethod === 'prepaid' && <div className="w-2.5 h-2.5 bg-luxury-gold rounded-full" />}
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setPaymentMethod('pickup')}
                                            className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${paymentMethod === 'pickup' ? 'border-luxury-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${paymentMethod === 'pickup' ? 'bg-luxury-black text-white' : 'bg-gray-50 text-gray-400'
                                                    }`}>
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-luxury-black">In-Store Pickup</p>
                                                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">₹100 Off per item</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'pickup' ? 'border-luxury-black' : 'border-gray-200'
                                                }`}>
                                                {paymentMethod === 'pickup' && <div className="w-2.5 h-2.5 bg-luxury-black rounded-full" />}
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setPaymentMethod('cod')}
                                            className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${paymentMethod === 'cod' ? 'border-luxury-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${paymentMethod === 'cod' ? 'bg-luxury-black text-white' : 'bg-gray-50 text-gray-400'
                                                    }`}>
                                                    <ShoppingBag size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-luxury-black">Cash on Delivery</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Settlement at Destination</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-luxury-black' : 'border-gray-200'
                                                }`}>
                                                {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-luxury-black rounded-full" />}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Pricing Logic Column */}
                    <div className="lg:col-span-5 lg:sticky lg:top-36">
                        <div className="bg-luxury-gray p-10 lg:p-14 rounded-3xl space-y-12 border border-gray-50 shadow-sm">
                            <div className="space-y-6">
                                <h3 className="font-serif text-2xl italic text-luxury-black tracking-tight">Price Manifest</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        <span>Curation Subtotal</span>
                                        <span className="text-luxury-black">₹{subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        <span>Transit Services</span>
                                        <span className={shipping === 0 ? 'text-green-600' : 'text-luxury-black'}>
                                            {shipping === 0 ? 'Complimentary' : `₹${shipping}`}
                                        </span>
                                    </div>
                                    {checkoutDiscount > 0 && (
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-green-600">
                                            <span>{paymentMethod === 'prepaid' ? 'Prepaid Benefit' : 'Pickup Benefit'}</span>
                                            <span>- ₹{checkoutDiscount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="h-[1px] bg-gray-200/50" />
                                    <div className="flex justify-between items-end">
                                        <span className="font-serif text-3xl italic text-luxury-black tracking-tighter">Valuation</span>
                                        <span className="text-2xl font-bold text-luxury-black tracking-tighter">₹{Math.ceil(total).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <button
                                    onClick={handleNext}
                                    className="w-full group relative overflow-hidden bg-luxury-black text-white py-6 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-700"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-3">
                                        {step === 'payment' ? 'Conclude Acquisition' : 'Proceed Forward'}
                                        <ChevronRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                </button>
                                <div className="flex items-center justify-center gap-4 py-2 opacity-30 grayscale group-hover:grayscale-0 transition-all">
                                    <Truck size={16} />
                                    <CreditCard size={16} />
                                    <Package size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Checkout;
