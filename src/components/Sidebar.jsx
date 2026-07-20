import { useAuth } from '../context/AuthContext';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { icon: '📊', label: 'Dashboard', path: '/' },
  { icon: '👥', label: 'Users', path: '/users' },
  { icon: '🏪', label: 'Businesses', path: '/businesses' },
  { icon: '📦', label: 'Catalog', path: '/catalog' },
  { icon: '🖼️', label: 'Hero Sliders', path: '/hero-sliders' },
  { icon: '💳', label: 'Transactions', path: '/transactions' },
  { icon: '⭐', label: 'Reviews', path: '/reviews' },
  { icon: '📈', label: 'Reports', path: '/reports' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
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
              <div style={{ fontSize: 9, color: '#4A7DFF', fontWeight: 500 }}>For Better Connections</div>
            </div>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
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
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
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
          >🚪</button>
        </div>
      )}
    </aside>
  );
}