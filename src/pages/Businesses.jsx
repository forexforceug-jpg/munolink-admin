import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Businesses() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShop, setSelectedShop] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    setLoading(true);
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (data) setShops(data);
    setLoading(false);
  };

  const filtered = shops.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'open' && s.is_open) || 
      (statusFilter === 'closed' && !s.is_open);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedShops = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: shops.length,
    verified: shops.filter(s => s.is_verified).length,
    partner: shops.filter(s => s.is_anchor_partner).length,
    open: shops.filter(s => s.is_open).length,
    closed: shops.filter(s => !s.is_open).length,
  };

  const categories = [...new Set(shops.map(s => s.category).filter(Boolean))];

  const statCards = [
    { label: 'Total Businesses', value: stats.total, icon: '🏪', color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Verified', value: stats.verified, icon: '✅', color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Partners', value: stats.partner, icon: '⭐', color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Open Now', value: stats.open, icon: '🟢', color: '#00BCD4', bg: '#E0F7FA' },
    { label: 'Closed', value: stats.closed, icon: '🔴', color: '#F44336', bg: '#FFEBEE' },
  ];

  const getStatusBadge = (shop) => {
    if (!shop.is_verified) return { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' };
    if (!shop.is_open) return { bg: '#FFEBEE', color: '#F44336', label: 'Closed' };
    if (shop.is_anchor_partner) return { bg: '#E8F5E9', color: '#4CAF50', label: 'Partner' };
    return { bg: '#E8F5E9', color: '#4CAF50', label: 'Active' };
  };

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main Content */}
      <div style={{ flex: selectedShop ? '1' : '1' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Businesses</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Businesses</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Manage all registered businesses on the platform.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="Search by name, category..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 260, fontSize: 13 }} />
            <button style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #DCE5FF', background: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📥 Export</button>
            <button style={{ padding: '10px 20px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add Business</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #EEF3FF' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#8E99B3', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>{filtered.length} businesses found</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading businesses...</div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  <th style={th}>Business</th>
                  <th style={th}>Category</th>
                  <th style={th}>Rating</th>
                  <th style={th}>Discount</th>
                  <th style={th}>Wallet</th>
                  <th style={th}>Status</th>
                  <th style={th}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {pagedShops.map((s) => {
                  const status = getStatusBadge(s);
                  const isSelected = selectedShop?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedShop(isSelected ? null : s)}
                      style={{
                        borderBottom: '1px solid #F5F6FA',
                        cursor: 'pointer',
                        background: isSelected ? '#F8FAFF' : '#FFFFFF',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#4CAF50' }}>{s.name?.[0] || 'S'}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: '#8E99B3' }}>{s.address || 'Jinja City'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>{s.category || '—'}</td>
                      <td style={td}>⭐ {Number(s.rating || 0).toFixed(1)}</td>
                      <td style={td}>{s.discount_percentage || 0}%</td>
                      <td style={td}>UGX {Number(s.wallet_balance || 0).toLocaleString()}</td>
                      <td style={td}>
                        <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color }}>{status.label}</span>
                      </td>
                      <td style={td}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #EEF3FF' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>Showing {pagedShops.length} of {filtered.length} businesses</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {selectedShop && (
        <div style={{
          width: 380, flexShrink: 0,
          background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF',
          padding: 20, position: 'sticky', top: 100, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>{selectedShop.name}</h3>
            <button onClick={() => setSelectedShop(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8E99B3' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['Overview', 'Documents', 'Activity', 'Reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: detailTab === tab ? '#4A7DFF' : '#F5F6FA',
                  color: detailTab === tab ? '#FFFFFF' : '#8E99B3',
                }}
              >{tab}</button>
            ))}
          </div>

          {detailTab === 'Overview' && (
            <div>
              <div style={detailRow}>
                <span style={detailLabel}>Business ID</span>
                <span style={detailValue}>{selectedShop.id?.slice(0, 8)}...</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Category</span>
                <span style={detailValue}>{selectedShop.category || '—'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Address</span>
                <span style={detailValue}>{selectedShop.address || '—'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Area</span>
                <span style={detailValue}>{selectedShop.area || '—'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Phone</span>
                <span style={detailValue}>{selectedShop.phone || '—'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Rating</span>
                <span style={detailValue}>⭐ {Number(selectedShop.rating || 0).toFixed(1)} ({selectedShop.review_count || 0} reviews)</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Discount</span>
                <span style={detailValue}>{selectedShop.discount_percentage || 0}%</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Wallet Balance</span>
                <span style={detailValue}>UGX {Number(selectedShop.wallet_balance || 0).toLocaleString()}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Status</span>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: selectedShop.is_open ? '#E8F5E9' : '#FFEBEE', color: selectedShop.is_open ? '#4CAF50' : '#F44336' }}>{selectedShop.is_open ? 'Open' : 'Closed'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Verified</span>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: selectedShop.is_verified ? '#E8F5E9' : '#FFF3E0', color: selectedShop.is_verified ? '#4CAF50' : '#FF9800' }}>{selectedShop.is_verified ? 'Yes' : 'No'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Partner</span>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: selectedShop.is_anchor_partner ? '#E8F5E9' : '#F5F5F5', color: selectedShop.is_anchor_partner ? '#4CAF50' : '#888' }}>{selectedShop.is_anchor_partner ? 'Yes' : 'No'}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Joined</span>
                <span style={detailValue}>{selectedShop.created_at ? new Date(selectedShop.created_at).toLocaleDateString() : '—'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF3FF' }}>
                <button style={{ padding: '12px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>View Business Profile</button>
                <button style={{ padding: '12px', borderRadius: 10, background: '#F5F6FA', color: '#1F2F5F', border: '1px solid #DCE5FF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Edit Business</button>
                <button style={{ padding: '12px', borderRadius: 10, background: '#FFEBEE', color: '#F44336', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Suspend Business</button>
              </div>
            </div>
          )}

          {detailTab !== 'Overview' && (
            <div style={{ textAlign: 'center', padding: 40, color: '#8E99B3' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 600 }}>{detailTab} tab</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Coming soon</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '14px 16px', fontSize: 11, color: '#8E99B3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '12px 16px', fontSize: 13, color: '#1F2F5F' };
const pageBtn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#FFFFFF', color: '#1F2F5F' };
const filterStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#FFFFFF' };
const detailRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F6FA' };
const detailLabel = { fontSize: 12, color: '#8E99B3', fontWeight: 500 };
const detailValue = { fontSize: 12, color: '#1F2F5F', fontWeight: 600, textAlign: 'right', maxWidth: '60%' };