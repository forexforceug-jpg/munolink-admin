import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock } from 'react-icons/fi';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Businesses from './pages/Businesses';
import Content from './pages/Content';
import Transactions from './pages/Transactions';
import Reviews from './pages/Reviews';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Staff from './pages/Staff';
import OpportunityEngine from './pages/OpportunityEngine';
import Verification from './pages/Verification';
import {
  badgeStyle,
  colors,
  ghostButton,
  primaryButton,
  radii,
} from './lib/theme';

function LoadingScreen({ label = 'Loading workspace…' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 12,
        background: colors.bg,
        color: colors.textMuted,
        fontSize: 12,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: `2px solid ${colors.border}`,
          borderTopColor: colors.primary,
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {label}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading, profileLoading } = useAuth();
  if (loading || (user && profileLoading)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AccessDenied({ permission }) {
  const { roleName } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.xl,
          padding: 30,
          textAlign: 'center',
          boxShadow: '0 24px 70px rgba(0,0,0,0.32)',
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            margin: '0 auto 16px',
            background: colors.dangerSoft,
            color: colors.danger,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FiLock size={23} />
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>
          Access restricted
        </div>
        <p style={{ margin: '8px 0 18px', fontSize: 12, color: colors.textMuted, lineHeight: 1.6 }}>
          Your <span style={{ color: colors.text, fontWeight: 700 }}>{roleName}</span> role does not
          include the <span style={{ color: colors.text, fontWeight: 700 }}>{permission}</span>{' '}
          area. Ask the Super Admin if you need access.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ ...primaryButton }}
          >
            <FiArrowLeft size={14} /> Back to dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ ...ghostButton }}
          >
            Go back
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <span style={badgeStyle('danger')}>Permission required</span>
        </div>
      </div>
    </div>
  );
}

function RequirePermission({ permission, children }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <AccessDenied permission={permission} />;
  return children;
}

function Guarded({ permission, children }) {
  return (
    <ProtectedRoute>
      <RequirePermission permission={permission}>{children}</RequirePermission>
    </ProtectedRoute>
  );
}

export default function App() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: collapsed ? 84 : 264,
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          background: colors.bg,
        }}
      >
        <Routes>
          <Route path="/" element={<Guarded permission="dashboard"><Dashboard /></Guarded>} />
          <Route path="/users" element={<Guarded permission="users"><Users /></Guarded>} />
          <Route path="/businesses" element={<Guarded permission="businesses"><Businesses /></Guarded>} />
          <Route path="/content" element={<Guarded permission="content"><Content /></Guarded>} />
          <Route path="/catalog" element={<Navigate to="/content" replace />} />
          <Route path="/transactions" element={<Guarded permission="transactions"><Transactions /></Guarded>} />
          <Route path="/reviews" element={<Guarded permission="reviews"><Reviews /></Guarded>} />
          <Route path="/reports" element={<Guarded permission="reports"><Reports /></Guarded>} />
          <Route path="/settings" element={<Guarded permission="settings"><Settings /></Guarded>} />
          <Route path="/staff" element={<Guarded permission="staff"><Staff /></Guarded>} />
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
          <Route path="/OpportunityEngine" element={<Guarded permission="engine"><OpportunityEngine /></Guarded>} />
          <Route path="/verification" element={<Guarded permission="verification"><Verification /></Guarded>} />
        </Routes>
      </main>
    </div>
  );
}
