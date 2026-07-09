import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', role: 'customer', wallet_balance: 0, kyc_verified: false });
  const [notifyMessage, setNotifyMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone_number || u.phone || '').includes(search);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'blocked' && u.role === 'blocked');
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    shopOwners: users.filter(u => u.role === 'shop_owner').length,
    providers: users.filter(u => u.role === 'service_provider').length,
    blocked: users.filter(u => u.role === 'blocked').length,
    verified: users.filter(u => u.kyc_verified).length,
  };

  const statCards = [
    { label: 'Total Users', value: stats.total, icon: '👥', color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Customers', value: stats.customers, icon: '🛒', color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Shop Owners', value: stats.shopOwners, icon: '🏪', color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Providers', value: stats.providers, icon: '🔧', color: '#9C27B0', bg: '#F3E5F5' },
    { label: 'Blocked', value: stats.blocked, icon: '🚫', color: '#F44336', bg: '#FFEBEE' },
    { label: 'Verified', value: stats.verified, icon: '✅', color: '#00BCD4', bg: '#E0F7FA' },
  ];

  const getRoleBadge = (role) => {
    const map = {
      customer: { bg: '#E8F5E9', color: '#4CAF50', label: 'Customer' },
      shop_owner: { bg: '#FFF3E0', color: '#FF9800', label: 'Shop Owner' },
      service_provider: { bg: '#F3E5F5', color: '#9C27B0', label: 'Provider' },
      blocked: { bg: '#FFEBEE', color: '#F44336', label: 'Blocked' },
    };
    const r = map[role] || { bg: '#F5F5F5', color: '#888', label: role || 'User' };
    return <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: r.bg, color: r.color }}>{r.label}</span>;
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone_number || user.phone || '',
      role: user.role || 'customer',
      wallet_balance: Number(user.wallet_balance || 0),
      kyc_verified: user.kyc_verified || false,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!formData.full_name.trim() || !selectedUser) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: formData.full_name.trim(),
        role: formData.role,
        wallet_balance: formData.wallet_balance,
        kyc_verified: formData.kyc_verified,
      })
      .eq('id', selectedUser.id);

    if (!error) {
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...formData } : u));
      setSelectedUser({ ...selectedUser, ...formData });
      setShowEditModal(false);
    } else { alert('Error: ' + error.message); }
    setSaving(false);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    const newRole = selectedUser.role === 'blocked' ? 'customer' : 'blocked';
    setSaving(true);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', selectedUser.id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      setSelectedUser({ ...selectedUser, role: newRole });
    } else { alert('Error: ' + error.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setSelectedUser(null);
      setShowDeleteConfirm(false);
    } else { alert('Error: ' + error.message); }
    setSaving(false);
  };

  const handleSendNotification = async () => {
    if (!notifyMessage.trim() || !selectedUser) return;
    setSaving(true);
    // Store notification in messages table as admin message
    const { error } = await supabase.from('messages').insert({
      sender_id: '00000000-0000-0000-0000-000000000000',
      receiver_id: selectedUser.id,
      text: `🔔 Admin: ${notifyMessage.trim()}`,
      is_read: false,
    });

    if (!error) {
      alert(`Notification sent to ${selectedUser.full_name}`);
      setShowNotifyModal(false);
      setNotifyMessage('');
    } else { alert('Error: ' + error.message); }
    setSaving(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main */}
      <div style={{ flex: selectedUser && !showEditModal && !showNotifyModal ? '1' : '1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Users</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Users</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Manage, suspend, notify and verify platform users.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="Search by name, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 260, fontSize: 13 }} />
            <button style={primaryBtn}>+ Add User</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={statCardStyle}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#8E99B3', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="shop_owner">Shop Owner</option>
            <option value="service_provider">Service Provider</option>
            <option value="blocked">Blocked</option>
          </select>
          <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>{filteredUsers.length} users found</span>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div> : (
          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  <th style={th}>User</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Role</th>
                  <th style={th}>KYC</th>
                  <th style={th}>Wallet</th>
                  <th style={th}>Joined</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map(u => {
                  const isSel = selectedUser?.id === u.id;
                  return (
                    <tr key={u.id} onClick={() => setSelectedUser(isSel ? null : u)} style={{ borderBottom: '1px solid #F5F6FA', cursor: 'pointer', background: isSel ? '#F8FAFF' : '#FFFFFF' }}>
                      <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: u.role === 'blocked' ? '#FFEBEE' : '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: u.role === 'blocked' ? '#F44336' : '#4CAF50' }}>{(u.full_name || 'U')[0]}</div><span style={{ fontWeight: 600, fontSize: 13, color: u.role === 'blocked' ? '#888' : '#1F2F5F' }}>{u.full_name || 'Unknown'}</span></div></td>
                      <td style={td}>{u.phone_number || u.phone || '—'}</td>
                      <td style={td}>{getRoleBadge(u.role)}</td>
                      <td style={td}><span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: u.kyc_verified ? '#E8F5E9' : '#FFF3E0', color: u.kyc_verified ? '#4CAF50' : '#FF9800' }}>{u.kyc_verified ? 'Verified' : 'Pending'}</span></td>
                      <td style={td}>UGX {Number(u.wallet_balance || 0).toLocaleString()}</td>
                      <td style={td}>{formatDate(u.created_at)}</td>
                      <td style={{ ...td, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleOpenEdit(u)} style={smallBtn}>✏️</button>
                        <button onClick={() => { setSelectedUser(u); setShowDeleteConfirm(true); }} style={{ ...smallBtn, background: '#FFEBEE', color: '#F44336' }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #EEF3FF' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>{pagedUsers.length} of {filteredUsers.length}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>→</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {selectedUser && !showEditModal && !showNotifyModal && (
        <div style={sidePanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>{selectedUser.full_name || 'User'}</h3>
            <button onClick={() => setSelectedUser(null)} style={closeBtn}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['Overview', 'Activity', 'Shops'].map(t => (
              <button key={t} onClick={() => setDetailTab(t)} style={{ ...tabBtn, background: detailTab === t ? '#4A7DFF' : '#F5F6FA', color: detailTab === t ? '#FFFFFF' : '#8E99B3' }}>{t}</button>
            ))}
          </div>
          {detailTab === 'Overview' && (
            <div>
              <div style={dRow}><span style={dLabel}>User ID</span><span style={dVal}>{selectedUser.id?.slice(0, 8)}...</span></div>
              <div style={dRow}><span style={dLabel}>Name</span><span style={dVal}>{selectedUser.full_name || '—'}</span></div>
              <div style={dRow}><span style={dLabel}>Phone</span><span style={dVal}>{selectedUser.phone_number || selectedUser.phone || '—'}</span></div>
              <div style={dRow}><span style={dLabel}>Role</span><span>{getRoleBadge(selectedUser.role)}</span></div>
              <div style={dRow}><span style={dLabel}>KYC</span><span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: selectedUser.kyc_verified ? '#E8F5E9' : '#FFF3E0', color: selectedUser.kyc_verified ? '#4CAF50' : '#FF9800' }}>{selectedUser.kyc_verified ? 'Verified' : 'Pending'}</span></div>
              <div style={dRow}><span style={dLabel}>Wallet</span><span style={dVal}>UGX {Number(selectedUser.wallet_balance || 0).toLocaleString()}</span></div>
              <div style={dRow}><span style={dLabel}>Lifetime Savings</span><span style={dVal}>UGX {Number(selectedUser.lifetime_savings || 0).toLocaleString()}</span></div>
              <div style={dRow}><span style={dLabel}>Joined</span><span style={dVal}>{formatDate(selectedUser.created_at)}</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF3FF' }}>
                <button onClick={() => handleOpenEdit(selectedUser)} style={primaryBtn}>✏️ Edit User</button>
                <button onClick={handleSuspendUser} style={suspendBtn}>
                  {selectedUser.role === 'blocked' ? '✅ Unsuspend User' : '⏸️ Suspend User'}
                </button>
                <button onClick={() => { setShowNotifyModal(true); setNotifyMessage(''); }} style={notifyBtn}>🔔 Notify User</button>
                <button onClick={() => setShowDeleteConfirm(true)} style={dangerBtn}>🗑️ Delete User</button>
              </div>
            </div>
          )}
          {detailTab !== 'Overview' && <div style={{ textAlign: 'center', padding: 40, color: '#8E99B3' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><div style={{ fontWeight: 600 }}>{detailTab}</div><div style={{ fontSize: 12, marginTop: 4 }}>Coming soon</div></div>}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>Edit User</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={flabel}>Full Name</label><input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} style={finput} /></div>
              <div><label style={flabel}>Phone</label><input value={formData.phone} style={finput} disabled /></div>
              <div><label style={flabel}>Role</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={finput}><option value="customer">Customer</option><option value="shop_owner">Shop Owner</option><option value="service_provider">Service Provider</option><option value="blocked">Blocked</option></select></div>
              <div><label style={flabel}>Wallet Balance</label><input type="number" value={formData.wallet_balance} onChange={e => setFormData({ ...formData, wallet_balance: Number(e.target.value) })} style={finput} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label style={{ ...flabel, display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={formData.kyc_verified} onChange={e => setFormData({ ...formData, kyc_verified: e.target.checked })} />KYC Verified</label></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && selectedUser && (
        <div style={modalOverlay} onClick={() => setShowNotifyModal(false)}>
          <div style={{ ...modalContent, width: 450 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 8px' }}>🔔 Notify {selectedUser.full_name}</h2>
            <p style={{ color: '#8E99B3', fontSize: 13, marginBottom: 16 }}>Send a notification message to this user.</p>
            <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} placeholder="Type your message..." style={{ ...finput, minHeight: 100, resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNotifyModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSendNotification} disabled={saving || !notifyMessage.trim()} style={{ ...primaryBtn, opacity: (saving || !notifyMessage.trim()) ? 0.6 : 1 }}>{saving ? 'Sending...' : 'Send Notification'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && selectedUser && (
        <div style={modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, width: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 8px' }}>Delete {selectedUser.full_name}?</h2>
            <p style={{ color: '#8E99B3', fontSize: 13, marginBottom: 20 }}>This permanently removes this user and all associated data.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} style={dangerBtn}>{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '12px 16px', fontSize: 11, color: '#8E99B3', fontWeight: 600, textTransform: 'uppercase' };
const td = { padding: '12px 16px', fontSize: 13, color: '#1F2F5F' };
const pageBtn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#FFFFFF', color: '#1F2F5F' };
const selectStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#FFFFFF' };
const primaryBtn = { padding: '10px 20px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const dangerBtn = { padding: '10px 20px', borderRadius: 10, background: '#F44336', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const suspendBtn = { padding: '10px 20px', borderRadius: 10, background: '#FFF3E0', color: '#FF9800', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const notifyBtn = { padding: '10px 20px', borderRadius: 10, background: '#E3F2FD', color: '#1976D2', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const cancelBtn = { padding: '10px 24px', borderRadius: 10, border: '1px solid #DCE5FF', background: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const smallBtn = { padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: '#EEF3FF', color: '#4A7DFF', marginRight: 4 };
const tabBtn = { padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const statCardStyle = { background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #EEF3FF' };
const cardStyle = { background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' };
const sidePanel = { width: 380, flexShrink: 0, background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, position: 'sticky', top: 100, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' };
const closeBtn = { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8E99B3' };
const dRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F6FA' };
const dLabel = { fontSize: 12, color: '#8E99B3', fontWeight: 500 };
const dVal = { fontSize: 12, color: '#1F2F5F', fontWeight: 600, textAlign: 'right', maxWidth: '55%' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const modalContent = { background: '#FFFFFF', borderRadius: 16, padding: 28, width: 500, maxHeight: '80vh', overflow: 'auto' };
const flabel = { fontSize: 12, fontWeight: 600, color: '#1F2F5F', display: 'block', marginBottom: 5 };
const finput = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#F8FAFF', outline: 'none', boxSizing: 'border-box' };