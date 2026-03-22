import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerView from './components/CustomerView';

// Lazy load admin components to optimize performance and fix preload warnings
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const SizeGuide = lazy(() => import('./pages/SizeGuide'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAdmin = localStorage.getItem('v2_admin_session') === 'true';
  const hasToken = !!localStorage.getItem('v2_token');
  return (isAdmin && hasToken) ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

// Admin loading fallback
const AdminLoading = () => (
  <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-mono">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] uppercase tracking-[0.3em] font-black text-luxury-gold/60">Initializing Command...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AdminLoading />}>
        <Routes>
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          <Route path="/size-guide" element={<SizeGuide />} />

          {/* Auth utility routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Customer routes - default */}
          <Route path="/*" element={<CustomerView onSwitchToAdmin={() => window.location.href = '/admin/login'} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

