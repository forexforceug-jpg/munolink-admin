import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalShops: 0, totalOrders: 0, totalBookings: 0,
    totalRevenue: 0, totalTransactions: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const recentActivity = [
    { icon: '👤', text: 'New user registered', time: '2 min ago', color: '#4A7DFF' },
    { icon: '🏪', text: 'New business joined the platform', time: '15 min ago', color: '#4CAF50' },
    { icon: '📦', text: 'Order #MUNO-089 completed', time: '28 min ago', color: '#FF9800' },
    { icon: '💳', text: 'Payout of UGX 450,000 processed', time: '1 hour ago', color: '#9C27B0' },
    { icon: '📋', text: 'Verification document submitted', time: '2 hours ago', color: '#F44336' },
  ];

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: shops } = await supabase.from('shops').select('*', { count: 'exact', head: true });
      const { data: txn } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);

      const orders = txn?.filter(t => t.type === 'order' || !t.type) || [];
      const bookings = txn?.filter(t => t.type === 'service_booking') || [];
      const revenue = txn?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

      setStats({
        totalUsers: users || 0,
        totalShops: shops || 0,
        totalOrders: orders.length,
        totalBookings: bookings.length,
        totalRevenue: revenue,
        totalTransactions: txn?.length || 0,
      });
      setRecentTransactions(txn?.slice(0, 8) || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    }
    setLoading(false);
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: '👥', color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Total Businesses', value: stats.totalShops.toLocaleString(), icon: '🏪', color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: '📦', color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Total Bookings', value: stats.totalBookings.toLocaleString(), icon: '📅', color: '#9C27B0', bg: '#F3E5F5' },
    { label: 'Total Revenue', value: `UGX ${(stats.totalRevenue / 1000000).toFixed(1)}M`, icon: '💰', color: '#F44336', bg: '#FFEBEE' },
    { label: 'Transactions', value: stats.totalTransactions.toLocaleString(), icon: '💳', color: '#00BCD4', bg: '#E0F7FA' },
  ];

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F' }}>Dashboard</h1>
        <p style={{ marginTop: 40, textAlign: 'center', color: '#888' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Overview of Munolink platform performance.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', background: '#FFFFFF', fontSize: 13, color: '#1F2F5F', fontWeight: 500 }}>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #DCE5FF', position: 'relative', cursor: 'pointer' }}>
            🔔
            <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, background: '#F44336', color: '#FFFFFF', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>12</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4A7DFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>MA</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F' }}>Munolink Admin</div>
              <div style={{ fontSize: 10, color: '#8E99B3' }}>Super Admin</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map((stat, i) => (
          <div key={i} style={{ background: '#FFFFFF', borderRadius: 16, padding: 18, border: '1px solid #EEF3FF' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2F5F', marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#8E99B3', fontWeight: 500 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600, marginTop: 6 }}>↑ 12.5% vs last week</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: 0 }}>Revenue Overview</h3>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#1F2F5F', margin: '4px 0 0' }}>UGX {(stats.totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingTop: 20 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const heights = [60, 85, 45, 95, 70, 120, 100];
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: '100%', maxWidth: 40, height: heights[i], background: 'linear-gradient(180deg, #4A7DFF, #2E5FE6)', borderRadius: '8px 8px 4px 4px' }} />
                  <span style={{ fontSize: 10, color: '#8E99B3', fontWeight: 500 }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Orders & Bookings Overview</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, paddingTop: 20 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const orders = [35, 50, 30, 60, 45, 75, 65];
              const bookings = [15, 25, 12, 30, 20, 35, 28];
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 16, height: orders[i], background: '#4A7DFF', borderRadius: '4px 4px 2px 2px' }} />
                    <div style={{ width: 16, height: bookings[i], background: '#4CAF50', borderRadius: '4px 4px 2px 2px' }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#8E99B3', fontWeight: 500 }}>{day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#4A7DFF' }} /><span style={{ fontSize: 11, color: '#8E99B3' }}>Orders</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#4CAF50' }} /><span style={{ fontSize: 11, color: '#8E99B3' }}>Bookings</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 16 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Recent Transactions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EEF3FF' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>ID</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.slice(0, 5).map((txn) => (
                <tr key={txn.id} style={{ borderBottom: '1px solid #F5F6FA' }}>
                  <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, color: '#4A7DFF' }}>{txn.reference?.slice(-8) || txn.id?.slice(-8) || '---'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#1F2F5F' }}>{txn.type || 'order'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, color: '#1F2F5F' }}>UGX {Number(txn.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: txn.status === 'completed' ? '#E8F5E9' : '#FFF3E0', color: txn.status === 'completed' ? '#4CAF50' : '#FF9800' }}>{txn.status || 'pending'}</span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 11, color: '#8E99B3', textAlign: 'right' }}>{txn.created_at ? new Date(txn.created_at).toLocaleDateString() : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Platform Activity</h3>
          {recentActivity.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid #F5F6FA' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#1F2F5F', fontWeight: 500 }}>{item.text}</div>
                <div style={{ fontSize: 10, color: '#8E99B3', marginTop: 2 }}>{item.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Top Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Pharmacy', pct: 35, color: '#4A7DFF' },
              { name: 'Grocery', pct: 25, color: '#4CAF50' },
              { name: 'Hardware', pct: 18, color: '#FF9800' },
              { name: 'Electronics', pct: 12, color: '#9C27B0' },
              { name: 'Clothing', pct: 7, color: '#F44336' },
              { name: 'Others', pct: 3, color: '#00BCD4' },
            ].map((cat) => (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1F2F5F' }}>{cat.name}</span>
                  <span style={{ fontSize: 11, color: '#8E99B3' }}>{cat.pct}%</span>
                </div>
                <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F5F6FA', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.pct}%`, height: '100%', borderRadius: 3, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0', marginTop: 24, borderTop: '1px solid #EEF3FF', color: '#8E99B3', fontSize: 12 }}>
        © 2025 Munolink. All rights reserved. · Version 1.0.0
      </div>
    </div>
  );
}