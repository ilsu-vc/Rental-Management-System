import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import Bills from './pages/Bills';
import Announcements from './pages/Announcements';
import Reports from './pages/Reports';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantBills from './pages/tenant/TenantBills';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role === 'tenant') return <Navigate to="/tenant" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'tenant' ? '/tenant' : '/dashboard'} replace /> : <Login />} />

      {/* Admin Routes */}
      <Route path="/" element={<ProtectedRoute adminOnly><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="buildings" element={<Buildings />} />
        <Route path="buildings/:buildingId/rooms" element={<Rooms />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="bills" element={<Bills />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Tenant Routes */}
      <Route path="/tenant" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<TenantDashboard />} />
        <Route path="bills" element={<TenantBills />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
