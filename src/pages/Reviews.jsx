import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const mockReviews = [
  { id: 'mock-1', customer: 'Sarah K.', business: 'FreshMart Supermarket', product: 'Rice 5kg', rating: 5, type: 'product', status: 'published', created_at: '2026-07-05', comment: 'Excellent quality rice! Fresh and well-packaged. Will definitely order again.' },
  { id: 'mock-2', customer: 'David O.', business: 'QuickFix Electric', product: 'Electrical Repairs', rating: 5, type: 'service', status: 'published', created_at: '2026-07-04', comment: 'Very professional service. Arrived on time and fixed the issue quickly.' },
  { id: 'mock-3', customer: 'Grace N.', business: 'PharmaPlus', product: 'Paracetamol 500mg', rating: 4, type: 'product', status: 'published', created_at: '2026-07-03', comment: 'Good product and fair price. Delivery was a bit slow but overall satisfied.' },
  { id: 'mock-4', customer: 'John M.', business: 'City Hardware', product: 'Cement 50kg', rating: 3, type: 'product', status: 'reported', created_at: '2026-07-02', comment: 'Cement was partially hardened. Not happy with the quality.' },
  { id: 'mock-5', customer: 'Alice W.', business: 'Sarah Hair Studio', product: 'Hair Treatment', rating: 5, type: 'service', status: 'pending', created_at: '2026-07-01', comment: 'Amazing service! My hair looks beautiful. Highly recommend Sarah.' },
  { id: 'mock-6', customer: 'Peter K.', business: 'Jinja Electronics', product: 'Phone Charger', rating: 2, type: 'product', status: 'pending', created_at: '2026-06-30', comment: 'Charger stopped working after 3 days. Requesting refund.' },
  { id: 'mock-7', customer: 'Mary A.', business: 'Best Price Supermarket', product: 'Cooking Oil 5L', rating: 4, type: 'product', status: 'published', created_at: '2026-06-29', comment: 'Good value for money. Fresh stock and well within expiry date.' },
  { id: 'mock-8', customer: 'Tom B.', business: 'Alex Mukasa', product: 'Pipe Installation', rating: 5, type: 'service', status: 'published', created_at: '2026-06-28', comment: 'Alex did a fantastic job installing new pipes. Clean work, fair price.' },
];

export default function Reviews() {
  const [reviews, setReviews] = useState(mockReviews);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Reviews fetch error:', error.message);
    } else if (data && data.length > 0) {
      setReviews(data.map(r => ({
        ...r,
        customer: r.customer || 'Customer',
        business: r.business || 'Business',
        product: r.product || 'Item',
      })));
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (reviewId, newStatus) => {
    if (typeof reviewId === 'string' && reviewId.startsWith('mock-')) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
      if (selectedReview?.id === reviewId) setSelectedReview({ ...selectedReview, status: newStatus });
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .update({ status: newStatus, updated_at: new Date() })
      .eq('id', reviewId);

    if (!error) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
      if (selectedReview?.id === reviewId) setSelectedReview({ ...selectedReview, status: newStatus });
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (typeof reviewId === 'string' && reviewId.startsWith('mock-')) {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setSelectedReview(null);
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setSelectedReview(null);
    }
  };

  const filtered = reviews.filter(r => {
    const matchesSearch = (r.comment || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.customer || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.business || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesRating = ratingFilter === 'all' || r.rating === parseInt(ratingFilter);
    return matchesSearch && matchesStatus && matchesType && matchesRating;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedReviews = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: reviews.length,
    published: reviews.filter(r => r.status === 'published').length,
    pending: reviews.filter(r => r.status === 'pending').length,
    reported: reviews.filter(r => r.status === 'reported').length,
    hidden: reviews.filter(r => r.status === 'hidden').length,
    avgRating: reviews.length > 0 ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1) : '0.0',
    businesses: [...new Set(reviews.map(r => r.business))].length,
  };

  const statCards = [
    { label: 'Total Reviews', value: stats.total, icon: '⭐', color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Published', value: stats.published, icon: '✅', color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Reported', value: stats.reported, icon: '🚩', color: '#F44336', bg: '#FFEBEE' },
    { label: 'Avg Rating', value: `${stats.avgRating} / 5`, icon: '📊', color: '#9C27B0', bg: '#F3E5F5' },
    { label: 'Businesses', value: stats.businesses, icon: '🏪', color: '#00BCD4', bg: '#E0F7FA' },
  ];

  const getStatusBadge = (status) => {
    const map = {
      'published': { bg: '#E8F5E9', color: '#4CAF50', label: 'Published' },
      'pending': { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' },
      'reported': { bg: '#FFEBEE', color: '#F44336', label: 'Reported' },
      'hidden': { bg: '#F5F5F5', color: '#888', label: 'Hidden' },
    };
    const s = map[status] || { bg: '#F5F5F5', color: '#888', label: status || 'Unknown' };
    return <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const renderStars = (rating) => '⭐'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      <div style={{ flex: selectedReview ? '1' : '1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Reviews</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Reviews</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Monitor and moderate customer reviews across the platform.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="Search reviews..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 260, fontSize: 13 }} />
            <button style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #DCE5FF', background: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📥 Export</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #EEF3FF' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#8E99B3', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="reported">Reported</option>
            <option value="hidden">Hidden</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Types</option>
            <option value="product">Product</option>
            <option value="service">Service</option>
          </select>
          <select value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }} style={filterStyle}>
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>{filtered.length} reviews found</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading reviews...</div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  <th style={th}>Review</th>
                  <th style={th}>Customer</th>
                  <th style={th}>Business</th>
                  <th style={th}>Rating</th>
                  <th style={th}>Type</th>
                  <th style={th}>Status</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedReviews.map((r) => {
                  const isSelected = selectedReview?.id === r.id;
                  return (
                    <tr key={r.id} onClick={() => setSelectedReview(isSelected ? null : r)} style={{ borderBottom: '1px solid #F5F6FA', cursor: 'pointer', background: isSelected ? '#F8FAFF' : '#FFFFFF' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{(r.comment || '').slice(0, 50)}...</div>
                        <div style={{ fontSize: 10, color: '#8E99B3', marginTop: 2 }}>{r.product}</div>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 15, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#4CAF50' }}>{(r.customer || 'U')[0]}</div>
                          <span style={{ fontWeight: 500 }}>{r.customer}</span>
                        </div>
                      </td>
                      <td style={td}>{r.business}</td>
                      <td style={td}><span style={{ fontSize: 13 }}>{renderStars(r.rating)}</span></td>
                      <td style={td}><span style={{ padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: r.type === 'service' ? '#E3F2FD' : '#E8F5E9', color: r.type === 'service' ? '#1976D2' : '#4CAF50' }}>{r.type === 'service' ? 'Service' : 'Product'}</span></td>
                      <td style={td}>{getStatusBadge(r.status)}</td>
                      <td style={td}>{formatDate(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #EEF3FF' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>Showing {pagedReviews.length} of {filtered.length} reviews</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedReview && (
        <div style={{ width: 400, flexShrink: 0, background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, position: 'sticky', top: 100, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Review #{typeof selectedReview.id === 'string' ? selectedReview.id.slice(0, 8) : selectedReview.id}</h3>
              <div style={{ marginTop: 4 }}>{getStatusBadge(selectedReview.status)}</div>
            </div>
            <button onClick={() => setSelectedReview(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8E99B3' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['Overview', 'Customer', 'Business', 'Activity'].map(t => (
              <button key={t} onClick={() => setDetailTab(t)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: detailTab === t ? '#4A7DFF' : '#F5F6FA', color: detailTab === t ? '#FFFFFF' : '#8E99B3' }}>{t}</button>
            ))}
          </div>

          {detailTab === 'Overview' && (
            <div>
              <div style={{ marginBottom: 14, textAlign: 'center', fontSize: 24 }}>{renderStars(selectedReview.rating)}</div>
              <div style={detailRow}><span style={detailLabel}>Review ID</span><span style={detailValue}>#{typeof selectedReview.id === 'string' ? selectedReview.id.slice(0, 8) : selectedReview.id}</span></div>
              <div style={detailRow}><span style={detailLabel}>Type</span><span style={detailValue}>{selectedReview.type === 'service' ? 'Service' : 'Product'} Review</span></div>
              <div style={detailRow}><span style={detailLabel}>Rating</span><span style={detailValue}>{selectedReview.rating} / 5</span></div>
              <div style={detailRow}><span style={detailLabel}>Customer</span><span style={detailValue}>{selectedReview.customer}</span></div>
              <div style={detailRow}><span style={detailLabel}>Business</span><span style={detailValue}>{selectedReview.business}</span></div>
              <div style={detailRow}><span style={detailLabel}>Product/Service</span><span style={detailValue}>{selectedReview.product}</span></div>
              <div style={detailRow}><span style={detailLabel}>Status</span><span>{getStatusBadge(selectedReview.status)}</span></div>
              <div style={detailRow}><span style={detailLabel}>Date</span><span style={detailValue}>{formatDate(selectedReview.created_at)}</span></div>
              <div style={{ padding: '12px 0', borderBottom: '1px solid #F5F6FA' }}>
                <span style={detailLabel}>Comment</span>
                <p style={{ fontSize: 13, color: '#1F2F5F', marginTop: 8, lineHeight: 1.6, background: '#F8FAFF', padding: 12, borderRadius: 8 }}>"{selectedReview.comment}"</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF3FF' }}>
                {selectedReview.status !== 'published' && (
                  <button onClick={() => handleUpdateStatus(selectedReview.id, 'published')} style={approveBtn}>✅ Approve & Publish</button>
                )}
                {selectedReview.status === 'reported' && (
                  <button onClick={() => handleUpdateStatus(selectedReview.id, 'hidden')} style={warningBtn}>🙈 Hide Review</button>
                )}
                <button style={secondaryBtn}>View on Frontend</button>
                <button style={secondaryBtn}>More Actions</button>
                <button onClick={() => handleDeleteReview(selectedReview.id)} style={dangerBtn}>🗑️ Delete Review</button>
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
const detailValue = { fontSize: 12, color: '#1F2F5F', fontWeight: 600, textAlign: 'right', maxWidth: '55%' };
const approveBtn = { padding: '12px', borderRadius: 10, background: '#4CAF50', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const warningBtn = { padding: '12px', borderRadius: 10, background: '#FF9800', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const secondaryBtn = { padding: '12px', borderRadius: 10, background: '#F5F6FA', color: '#1F2F5F', border: '1px solid #DCE5FF', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const dangerBtn = { padding: '12px', borderRadius: 10, background: '#FFEBEE', color: '#F44336', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };