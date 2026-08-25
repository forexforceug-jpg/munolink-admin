// src/components/Sidebar.jsx

import { useAuth } from '../context/AuthContext';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiShoppingBag, 
  FiPackage, 
  FiSettings, 
  FiCheckCircle, 
  FiCreditCard, 
  FiStar, 
  FiBarChart2, 
  FiTool,
  FiLogOut,
} from 'react-icons/fi';

const menuItems = [
  { icon: FiHome, label: 'Dashboard', path: '/' },
  { icon: FiUsers, label: 'Users', path: '/users' },
  { icon: FiShoppingBag, label: 'Businesses', path: '/businesses' },
  { icon: FiPackage, label: 'Catalog', path: '/catalog' },
  { icon: FiTool, label: 'Engine', path: '/OpportunityEngine' },
  { icon: FiCheckCircle, label: 'Verification', path: '/verification' },
  { icon: FiCreditCard, label: 'Transactions', path: '/transactions' },
  { icon: FiStar, label: 'Reviews', path: '/reviews' },
  { icon: FiBarChart2, label: 'Reports', path: '/reports' },
  { icon: FiSettings, label: 'Settings', path: '/settings' },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside style={{
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      width: collapsed ? 80 : 260,
      background: '#0F1A3A',
      transition: 'width 0.3s ease',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '20px 16px' : '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
      }} onClick={() => setCollapsed(!collapsed)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 12,
            backgroundColor: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4,
            flexShrink: 0,
          }}>
            <img 
              src="./logo.png" 
              alt="Munolink" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', letterSpacing: 1 }}>MUNOLINK</div>
              <div style={{ fontSize: 9, color: '#4A7DFF', fontWeight: 500 }}>Admin Panel</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12,
                padding: collapsed ? '12px' : '12px 16px',
                marginBottom: 4, borderRadius: 10,
                cursor: 'pointer',
                background: isActive ? 'rgba(74,125,255,0.15)' : 'transparent',
                color: isActive ? '#4A7DFF' : 'rgba(255,255,255,0.6)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed ? (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <img 
            src="/logo.png" 
            alt="Munolink" 
            style={{
              width: 40, height: 40, borderRadius: 10,
              objectFit: 'cover', flexShrink: 0,
            }} 
          />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Munolink Admin</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Super Admin</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: 18, padding: 4,
            }}
            title="Logout"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      ) : (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'center',
        }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', padding: 4,
            }}
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      )}
    </aside>
  );
}