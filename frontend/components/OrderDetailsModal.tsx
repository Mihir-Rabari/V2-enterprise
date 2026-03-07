import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Truck, MapPin, CreditCard, ExternalLink, Calendar, Hash, Phone, Mail, User } from 'lucide-react';
import { Order } from '../types';

interface OrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    isAdmin?: boolean;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order, isAdmin = false }) => {
    if (!order) return null;

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase() || '';
        if (s === 'DELIVERED') return 'bg-green-50 text-green-700 border-green-100';
        if (s === 'CANCELLED' || s === 'REFUNDED') return 'bg-red-50 text-red-700 border-red-100';
        if (s === 'SHIPPED') return 'bg-blue-50 text-blue-700 border-blue-100';
        if (s === 'PROCESSING') return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-gray-50 text-gray-700 border-gray-100';
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };
    const renderAddress = (address: string) => {
        try {
            const parsed = JSON.parse(address);
            // Handle both uppercase from older/different records and standard field names
            const street = parsed.street || parsed.STREET || '';
            const city = parsed.city || parsed.CITY || '';
            const state = parsed.state || parsed.STATE || '';
            const zip = parsed.zipCode || parsed.ZIPCODE || parsed.zip || '';
            const name = parsed.name || parsed.NAME || `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim();
            const email = parsed.email || parsed.EMAIL || '';

            return (
                <div className="space-y-1">
                    {name && <p className="text-luxury-black font-extrabold">{name}</p>}
                    <p>{street}</p>
                    <p>{city}{city && state ? ', ' : ''}{state} {zip}</p>
                    {email && <p className="text-[9px] text-gray-400 lowercase tracking-widest">{email}</p>}
                </div>
            );
        } catch (e) {
            return address;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-zinc-50 border-b border-gray-100 px-8 py-6 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="font-serif text-2xl italic text-luxury-black tracking-tight">Order Details</h2>
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    <span className="flex items-center gap-1.5"><Hash size={12} strokeWidth={2.5} /> {order.orderId || order.id}</span>
                                    <span className="flex items-center gap-1.5"><Calendar size={12} strokeWidth={2.5} /> {formatDate(order.createdAt)}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-white hover:bg-black hover:text-white rounded-2xl transition-all shadow-sm border border-gray-100"
                            >
                                <X size={20} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 no-scrollbar">
                            {/* Items Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-luxury-gold/5 rounded-xl text-luxury-gold">
                                        <Package size={18} />
                                    </div>
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-luxury-black">Ordered Items</h3>
                                </div>
                                <div className="space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-6 p-4 rounded-2xl border border-gray-50 hover:border-gray-100 transition-colors bg-white group">
                                            <div className="w-20 h-24 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0">
                                                <img src={item.productPhoto} alt={item.productName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="text-[13px] font-bold text-luxury-black uppercase tracking-tight mb-1">{item.productName}</h4>
                                                    <div className="flex items-center gap-4">
                                                        {item.size && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-100 px-2 py-0.5 rounded-lg">Size: {item.size}</span>}
                                                        {item.color && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-100 px-2 py-0.5 rounded-lg">Color: {item.color}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Qty: {item.quantity}</p>
                                                    <p className="text-[13px] font-serif italic font-bold text-luxury-black">₹{item.priceAtTime.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Shipping & Billing */}
                                <div className="space-y-12">
                                    {/* Customer & Shipping */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-luxury-gold/5 rounded-xl text-luxury-gold">
                                                <User size={18} />
                                            </div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-luxury-black">Customer & Delivery</h3>
                                        </div>
                                        <div className="space-y-6">
                                            {isAdmin && order.user && (
                                                <div className="p-6 bg-zinc-50 rounded-2xl space-y-2">
                                                    <p className="text-[11px] font-bold text-luxury-black uppercase tracking-tight">{order.user.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} /> {order.user.email}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} /> {order.phone}</p>
                                                </div>
                                            )}
                                            <div className="flex gap-3 items-start">
                                                <div className="p-2.5 bg-gray-50 rounded-full flex-shrink-0">
                                                    <MapPin size={14} className="text-gray-400" />
                                                </div>
                                                <div className="pt-1">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Shipping Address</p>
                                                    <div className="text-[11px] font-bold text-luxury-black leading-relaxed tracking-luxury uppercase">
                                                        {renderAddress(order.address)}
                                                        <p className="mt-2 text-luxury-gold">CONTACT: {order.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Tracking Info */}
                                    {(order.awbNumber || (order as any).trackingLink) && (
                                        <section>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 bg-luxury-gold/5 rounded-xl text-luxury-gold">
                                                    <Truck size={18} />
                                                </div>
                                                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-luxury-black">Tracking Info</h3>
                                            </div>
                                            <div className="p-6 bg-luxury-black text-white rounded-3xl space-y-4 shadow-xl">
                                                {order.awbNumber && (
                                                    <div>
                                                        <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-1">AWB Number</p>
                                                        <p className="text-xs font-mono font-bold tracking-widest">{order.awbNumber}</p>
                                                    </div>
                                                )}
                                                {(order as any).trackingLink && (
                                                    <a
                                                        href={(order as any).trackingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group"
                                                    >
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Track Shipment</span>
                                                        <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                    </a>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </div>

                                {/* Order Summary */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-luxury-gold/5 rounded-xl text-luxury-gold">
                                            <CreditCard size={18} />
                                        </div>
                                        <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-luxury-black">Order Summary</h3>
                                    </div>
                                    <div className="bg-zinc-50 rounded-3xl p-8 space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                                <span>Subtotal</span>
                                                <span className="text-luxury-black">₹{(order.total + (order.discount || 0)).toLocaleString()}</span>
                                            </div>
                                            {order.discount > 0 && (
                                                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-green-600">
                                                    <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                                                    <span>-₹{order.discount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="h-[1px] bg-gray-200" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[13px] font-bold uppercase tracking-widest text-luxury-black">Total Paid</span>
                                                <span className="text-xl font-serif italic font-bold text-luxury-black">₹{order.total.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Payment Status</p>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {order.paymentStatus}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-black italic">
                                                Via {order.method.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Footer - Branding */}
                        <div className="px-8 py-4 bg-zinc-50 border-t border-gray-100 flex justify-center">
                            <p className="text-[8px] font-bold uppercase tracking-[0.5em] text-gray-300">V2-Enterprise / Boutique Management</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default OrderDetailsModal;
