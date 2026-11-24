import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiBarChart2,
  FiCheckCircle,
  FiCreditCard,
  FiHome,
  FiLogOut,
  FiPackage,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTool,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { badgeStyle, colors, radii } from '../lib/theme';

const groups = [
  {
    label: 'Overview',
    items: [{ icon: FiHome, label: 'Dashboard', path: '/', permission: 'dashboard' }],
  },
  {
    label: 'Community',
    items: [
      { icon: FiUsers, label: 'Members', path: '/users', permission: 'users' },
      { icon: FiShoppingBag, label: 'Businesses', path: '/businesses', permission: 'businesses' },
      { icon: FiPackage, label: 'Content', path: '/content', permission: 'content' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: FiTool, label: 'Engine', path: '/OpportunityEngine', permission: 'engine' },
      { icon: FiCheckCircle, label: 'Verification', path: '/verification', permission: 'verification' },
      { icon: FiCreditCard, label: 'Transactions', path: '/transactions', permission: 'transactions' },
      { icon: FiStar, label: 'Reviews', path: '/reviews', permission: 'reviews' },
      { icon: FiBarChart2, label: 'Reports', path: '/reports', permission: 'reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: FiSettings, label: 'Settings', path: '/settings', permission: 'settings' },
      { icon: FiShield, label: 'Staff & access', path: '/staff', permission: 'staff' },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission, roleName, isSuperAdmin } = useAuth();
  const { dataSourceLabel, dataSourceMode, environment } = useAppSettings();

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: collapsed ? 84 : 264,
        background: 'linear-gradient(180deg, #0D0D1A 0%, #0B0B0D 100%)',
        borderRight: `1px solid ${colors.border}`,
        transition: 'width 0.3s ease',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: collapsed ? '18px 14px' : '20px 18px',
          borderBottom: `1px solid ${colors.border}`,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: 'linear-gradient(135deg, #4A7DFF, #6C5CE7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 10px 26px rgba(74,125,255,0.32)',
              overflow: 'hidden',
            }}
          >
            <img
              src="./logo.png"
              alt="Munolink"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, letterSpacing: 0.8 }}>
                MUNOLINK
              </div>
              <div style={{ fontSize: 9, color: colors.primary, fontWeight: 700, letterSpacing: 0.6 }}>
                ADMIN STUDIO
              </div>
            </div>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {visibleGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.9,
                  textTransform: 'uppercase',
                  color: colors.textDim,
                  padding: '0 10px 7px',
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  className="sidebar-item"
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 11,
                    padding: collapsed ? '11px' : '10px 12px',
                    marginBottom: 3,
                    borderRadius: 11,
                    cursor: 'pointer',
                    background: isActive ? colors.primarySoft : 'transparent',
                    color: isActive ? colors.primary : colors.textMuted,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 12.5,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                  }}
                >
                  {isActive && !collapsed ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: -10,
                        top: 9,
                        bottom: 9,
                        width: 3,
                        borderRadius: 99,
                        background: colors.primary,
                      }}
                    />
                  ) : null}
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: collapsed ? '12px 10px' : '12px 14px', borderTop: `1px solid ${colors.border}` }}>
        {!collapsed ? (
          <div
            style={{
              padding: 10,
              borderRadius: radii.md,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: colors.text }}>Data source</span>
              <span style={badgeStyle(dataSourceMode === 'local' ? 'primary' : 'success')}>
                {dataSourceLabel}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 9, color: colors.textDim, lineHeight: 1.4 }}>
              {environment === 'development'
                ? 'Development mode · local backend'
                : 'Production mode · direct Supabase'}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: colors.primarySoft,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {(user?.email || 'A').slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'Admin'}
              </div>
              <div style={{ fontSize: 9, color: isSuperAdmin ? colors.primary : colors.textDim }}>
                {roleName || 'Signed in'}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              border: `1px solid ${colors.border}`,
              background: colors.surfaceAlt,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FiLogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
