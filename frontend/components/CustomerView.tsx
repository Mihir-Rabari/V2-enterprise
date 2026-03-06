import React, { lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import CustomerLayout from './CustomerLayout';

// Lazy load pages to optimize bundle and fix preload warnings
const Home = lazy(() => import('../pages/Home'));
const Shop = lazy(() => import('../pages/Shop'));
const ProductDetails = lazy(() => import('../pages/ProductDetails'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Cart = lazy(() => import('../pages/Cart'));
const Account = lazy(() => import('../pages/Account'));
const Categories = lazy(() => import('../pages/Categories'));
const Login = lazy(() => import('../pages/Login'));
const Signup = lazy(() => import('../pages/Signup'));
const LegalPage = lazy(() => import('../pages/LegalPage'));
const Checkout = lazy(() => import('../pages/Checkout'));

import { CartProvider } from '../context/CartContext';
import { QuickViewProvider } from '../context/QuickViewContext';
import { AuthProvider } from '../context/AuthContext';

interface CustomerViewProps {
  onSwitchToAdmin: () => void;
}

// Loading fallback component
const PageLoading = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Refining Experience...</p>
    </div>
  </div>
);

const CustomerView: React.FC<CustomerViewProps> = (props) => {
  return (
    <AuthProvider>
      <QuickViewProvider>
        <CartProvider>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<CustomerLayout {...props} />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="categories" element={<Categories />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="new-arrivals" element={<Shop />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="liked" element={<Navigate to="/account/wishlist" replace />} />
                <Route path="account/*" element={<Account />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
                <Route path="privacy" element={<LegalPage />} />
                <Route path="returns" element={<LegalPage />} />
                <Route path="shipping" element={<LegalPage />} />
                <Route path="terms" element={<LegalPage />} />
                <Route path="*" element={<div className="p-40 text-center space-y-4">
                  <h2 className="font-serif text-4xl italic">404</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">The requested coordinate does not exist.</p>
                  <Link to="/" className="inline-block mt-8 text-[10px] font-bold uppercase tracking-luxury border-b border-black pb-1">Return Home</Link>
                </div>} />
              </Route>
            </Routes>
          </Suspense>
        </CartProvider>
      </QuickViewProvider>
    </AuthProvider>
  );
};

export default CustomerView;

