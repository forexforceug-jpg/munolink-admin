import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F1A3A 0%, #1F2F5F 100%)',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 20, padding: 40, width: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #4A7DFF, #2E5FE6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28, fontWeight: 800, color: '#FFFFFF',
          }}>M</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F2F5F', margin: '0 0 4px' }}>Munolink Admin</h1>
          <p style={{ color: '#8E99B3', fontSize: 13 }}>Sign in to your admin dashboard</p>
        </div>

        {error && (
          <div style={{
            background: '#FFEBEE', color: '#F44336', padding: '12px 16px',
            borderRadius: 10, fontSize: 13, marginBottom: 20, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F', display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@munolink.com"
              required
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid #DCE5FF', fontSize: 14, color: '#1F2F5F',
                background: '#F8FAFF', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid #DCE5FF', fontSize: 14, color: '#1F2F5F',
                background: '#F8FAFF', outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: loading ? '#A0B4E0' : '#4A7DFF',
              color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#8E99B3' }}>
          © 2025 Munolink. All rights reserved.
        </p>
      </div>
    </div>
  );
}