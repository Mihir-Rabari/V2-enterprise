import React from 'react';
import { Star } from 'lucide-react';

const ClientVoicesSection: React.FC<{ reviews: any[] }> = ({ reviews }) => (
    <section className="py-24 md:py-40 bg-white">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 md:mb-24 gap-8">
                <div className="space-y-4 text-center md:text-left w-full md:w-auto">
                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] flex items-center justify-center md:justify-start gap-2"><Star size={10} strokeWidth={2} className="text-luxury-gold" />Testimonials</span>
                    <h2 className="font-serif text-4xl md:text-7xl italic text-luxury-black tracking-tighter">Client Voices</h2>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 -mx-6 px-6 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8 md:overflow-visible md:mx-0 md:px-0 scrollbar-hide snap-x">
                {reviews.map((review: any, i: number) => (
                    <div key={review.id} className="min-w-[85vw] md:min-w-0 bg-zinc-50 p-8 md:p-12 space-y-6 flex flex-col justify-between snap-center">
                        <div className="space-y-4">
                            <div className="flex gap-1">
                                {[...Array(review.rating)].map((_, i) => (
                                    <span key={i} className="text-luxury-gold text-xs">★</span>
                                ))}
                            </div>
                            <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-luxury-black">
                                "{review.reviewText}"
                            </p>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-black">{review.customerName}</p>
                                <p className="text-[9px] text-gray-500 uppercase tracking-wider">Verified Client</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default ClientVoicesSection;
