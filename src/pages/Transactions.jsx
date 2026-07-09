import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setTransactions(data);
    setLoading(false);
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = (t.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.type || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedTxns = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    orders: transactions.filter(t => t.type === 'order' || !t.type).length,
    bookings: transactions.filter(t => t.type === 'service_booking').length,
    revenue: transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    discounts: transactions.reduce((sum, t) => sum + Number(t.discount_applied || 0), 0),
  };

  const statCards = [
    { label: 'Total Orders', value: stats.total, icon: '📋', color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Completed', value: stats.completed, icon: '✅', color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Product Orders', value: stats.orders, icon: '📦', color: '#9C27B0', bg: '#F3E5F5' },
    { label: 'Bookings', value: stats.bookings, icon: '📅', color: '#00BCD4', bg: '#E0F7FA' },
    { label: 'Revenue', value: `UGX ${(stats.revenue / 1000000).toFixed(1)}M`, icon: '💰', color: '#F44336', bg: '#FFEBEE' },
  ];

  const getStatusBadge = (status) => {
    const map = {
      completed: { bg: '#E8F5E9', color: '#4CAF50', label: 'Completed' },
      pending: { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' },
      processing: { bg: '#E3F2FD', color: '#1976D2', label: 'Processing' },
      shipped: { bg: '#F3E5F5', color: '#9C27B0', label: 'Shipped' },
      cancelled: { bg: '#FFEBEE', color: '#F44336', label: 'Cancelled' },
      confirmed: { bg: '#E8F5E9', color: '#4CAF50', label: 'Confirmed' },
    };
    const s = map[status] || { bg: '#F5F5F5', color: '#888', label: status || 'Unknown' };
    return <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main Content */}
      <div style={{ flex: selectedTxn ? '1' : '1' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Orders</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Orders & Transactions</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Monitor all marketplace orders and service bookings.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="Search by reference, type..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 260, fontSize: 13 }} />
            <button style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #DCE5FF', background: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📥 Export</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
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
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Types</option>
            <option value="order">Product Orders</option>
            <option value="service_booking">Service Bookings</option>
          </select>
          <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>{filtered.length} transactions found</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading transactions...</div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  <th style={th}>Reference</th>
                  <th style={th}>Type</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Discount</th>
                  <th style={th}>Status</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedTxns.map((t) => {
                  const isSelected = selectedTxn?.id === t.id;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTxn(isSelected ? null : t)}
                      style={{
                        borderBottom: '1px solid #F5F6FA', cursor: 'pointer',
                        background: isSelected ? '#F8FAFF' : '#FFFFFF',
                      }}
                    >
                      <td style={td}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#4A7DFF', fontSize: 13 }}>{t.reference || t.id?.slice(-8)}</div>
                          <div style={{ fontSize: 10, color: '#8E99B3', marginTop: 2 }}>{t.description?.slice(0, 30) || '—'}</div>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={{ padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: t.type === 'service_booking' ? '#E3F2FD' : '#E8F5E9', color: t.type === 'service_booking' ? '#1976D2' : '#4CAF50' }}>
                          {t.type === 'service_booking' ? 'Booking' : 'Order'}
                        </span>
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>UGX {Number(t.amount || 0).toLocaleString()}</td>
                      <td style={td}>UGX {Number(t.discount_applied || 0).toLocaleString()}</td>
                      <td style={td}>{getStatusBadge(t.status)}</td>
                      <td style={td}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #EEF3FF' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>Showing {pagedTxns.length} of {filtered.length} transactions</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Side Panel */}
      {selectedTxn && (
        <div style={{
          width: 400, flexShrink: 0,
          background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF',
          padding: 20, position: 'sticky', top: 100, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Order #{selectedTxn.reference || selectedTxn.id?.slice(-8)}</h3>
              <div style={{ marginTop: 4 }}>{getStatusBadge(selectedTxn.status)}</div>
            </div>
            <button onClick={() => setSelectedTxn(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8E99B3' }}>✕</button>
          </div>

          {/* Order Summary */}
          <div style={{ background: '#F8FAFF', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1F2F5F', margin: '0 0 12px' }}>Order Summary</h4>
            <div style={detailRow}>
              <span style={detailLabel}>Date & Time</span>
              <span style={detailValue}>{selectedTxn.created_at ? new Date(selectedTxn.created_at).toLocaleString() : '—'}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Type</span>
              <span style={detailValue}>{selectedTxn.type === 'service_booking' ? 'Service Booking' : 'Product Order'}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Sender ID</span>
              <span style={detailValue}>{selectedTxn.sender_id?.slice(0, 8)}...</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Recipient ID</span>
              <span style={detailValue}>{selectedTxn.recipient_id?.slice(0, 8)}...</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Description</span>
              <span style={detailValue}>{selectedTxn.description || '—'}</span>
            </div>
          </div>

          {/* Financial Summary */}
          <div style={{ background: '#F8FAFF', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1F2F5F', margin: '0 0 12px' }}>Financial Summary</h4>
            <div style={detailRow}>
              <span style={detailLabel}>Subtotal</span>
              <span style={detailValue}>UGX {Number(selectedTxn.amount || 0).toLocaleString()}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Discount</span>
              <span style={{ ...detailValue, color: '#4CAF50' }}>− UGX {Number(selectedTxn.discount_applied || 0).toLocaleString()}</span>
            </div>
            <div style={{ ...detailRow, borderBottom: 'none', paddingTop: 10, marginTop: 4, borderTop: '2px solid #EEF3FF' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2F5F' }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#4CAF50' }}>
                UGX {(Number(selectedTxn.amount || 0) - Number(selectedTxn.discount_applied || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '12px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>View Full Order</button>
            <button style={{ padding: '12px', borderRadius: 10, background: '#F5F6FA', color: '#1F2F5F', border: '1px solid #DCE5FF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Print Invoice</button>
            <button style={{ padding: '12px', borderRadius: 10, background: '#F5F6FA', color: '#1F2F5F', border: '1px solid #DCE5FF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>More Actions</button>
            {selectedTxn.status !== 'cancelled' && (
              <button style={{ padding: '12px', borderRadius: 10, background: '#FFEBEE', color: '#F44336', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel Order</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '14px 16px', fontSize: 11, color: '#8E99B3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '12px 16px', fontSize: 13, color: '#1F2F5F' };
const pageBtn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#FFFFFF', color: '#1F2F5F' };
const filterStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#FFFFFF' };
const detailRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F6FA' };
const detailLabel = { fontSize: 12, color: '#8E99B3', fontWeight: 500 };
const detailValue = { fontSize: 12, color: '#1F2F5F', fontWeight: 600, textAlign: 'right', maxWidth: '60%' };