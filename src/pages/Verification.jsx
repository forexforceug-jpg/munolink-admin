import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Verification() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [adminUserId, setAdminUserId] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    fetchAdminUser();
    fetchRequests();
  }, []);

  const fetchAdminUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user exists in users table
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setAdminUserId(profile.id);
        } else {
          // Create user record if it doesn't exist
          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              id: user.id,
              phone_number: user.phone || '',
              full_name: user.user_metadata?.full_name || 'Admin',
              role: 'admin',
            })
            .select()
            .single();
          
          if (newUser) {
            setAdminUserId(newUser.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching admin user:', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Get all verification requests with business and requester info
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          business:business_id (
            id,
            name,
            category,
            business_type,
            is_verified,
            created_at,
            owner_id
          ),
          requester:requested_by (
            id,
            full_name,
            phone_number
          ),
          reviewer:reviewed_by (
            id,
            full_name
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);

      // Calculate stats
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      const approved = data?.filter(r => r.status === 'approved').length || 0;
      const rejected = data?.filter(r => r.status === 'rejected').length || 0;

      setStats({ pending, approved, rejected, total: data?.length || 0 });

    } catch (error) {
      console.error('Error fetching verification requests:', error);
      alert('Failed to load verification requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRequests = () => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.business?.name?.toLowerCase().includes(query) ||
        r.requester?.full_name?.toLowerCase().includes(query) ||
        r.requester?.phone_number?.includes(query)
      );
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const pagedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

  const handleApprove = async (requestId) => {
    if (!confirm('Approve this business verification?')) return;
    
    if (!adminUserId) {
      alert('Admin user not found. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update verification request status - FIXED: use actual admin user ID
      const { error: reqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUserId,
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // Update business verification status
      const { error: bizError } = await supabase
        .from('shops')
        .update({ is_verified: true })
        .eq('id', request.business_id);

      if (bizError) throw bizError;

      // Update all documents for this business to verified
      const { error: docError } = await supabase
        .from('business_documents')
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: adminUserId,
        })
        .eq('business_id', request.business_id);

      if (docError) console.error('Error updating documents:', docError);

      alert('✅ Business verified successfully!');
      fetchRequests();
      setShowDetailModal(false);

    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    if (!adminUserId) {
      alert('Admin user not found. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update verification request status - FIXED: use actual admin user ID
      const { error: reqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'rejected',
          notes: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUserId,
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // Update business verification status
      const { error: bizError } = await supabase
        .from('shops')
        .update({ is_verified: false })
        .eq('id', request.business_id);

      if (bizError) throw bizError;

      alert('❌ Business verification rejected.');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchRequests();
      setShowDetailModal(false);

    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const openDocument = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#FFF3E0', color: '#E65100', label: '⏳ Pending' },
      approved: { bg: '#E8F5E9', color: '#2E7D32', label: '✅ Approved' },
      rejected: { bg: '#FFEBEE', color: '#C62828', label: '❌ Rejected' },
    };
    const s = map[status] || map.pending;
    return <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBusinessTypeLabel = (type) => {
    const map = {
      shop: '🏪 Shop',
      service: '🔧 Service Provider',
      institution: '🏨 Institution',
    };
    return map[type] || type || 'Unknown';
  };

  // Fetch documents when a request is selected
  useEffect(() => {
    if (selectedRequest?.business_id) {
      fetchDocuments(selectedRequest.business_id);
    }
  }, [selectedRequest]);

  const [businessDocuments, setBusinessDocuments] = useState([]);

  const fetchDocuments = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', businessId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setBusinessDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setBusinessDocuments([]);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  // Render Detail Modal
  const renderDetailModal = () => {
    if (!selectedRequest) return null;

    const request = selectedRequest;
    const business = request.business;
    const requester = request.requester;

    return (
      <div style={modalOverlay} onClick={() => setShowDetailModal(false)}>
        <div style={{ ...modalContent, width: 700, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
          <div style={modalHeader}>
            <h3 style={modalTitle}>📄 Verification Details</h3>
            <button onClick={() => setShowDetailModal(false)} style={closeBtn}>✕</button>
          </div>

          {/* Business Info */}
          <div style={sectionContainer}>
            <h4 style={sectionTitle}>🏪 Business Information</h4>
            <div style={detailGrid}>
              <div style={detailItem}><span style={detailLabel}>Business Name</span><span style={detailValue}>{business?.name || '—'}</span></div>
              <div style={detailItem}><span style={detailLabel}>Type</span><span style={detailValue}>{getBusinessTypeLabel(business?.business_type)}</span></div>
              <div style={detailItem}><span style={detailLabel}>Category</span><span style={detailValue}>{business?.category || '—'}</span></div>
              <div style={detailItem}><span style={detailLabel}>Status</span><span style={detailValue}>{getStatusBadge(request.status)}</span></div>
            </div>
          </div>

          {/* Owner Info */}
          <div style={sectionContainer}>
            <h4 style={sectionTitle}>👤 Owner Information</h4>
            <div style={detailGrid}>
              <div style={detailItem}><span style={detailLabel}>Name</span><span style={detailValue}>{requester?.full_name || '—'}</span></div>
              <div style={detailItem}><span style={detailLabel}>Phone</span><span style={detailValue}>{requester?.phone_number || '—'}</span></div>
              <div style={detailItem}><span style={detailLabel}>Submitted</span><span style={detailValue}>{formatDate(request.submitted_at)}</span></div>
              {request.reviewed_at && (
                <div style={detailItem}><span style={detailLabel}>Reviewed</span><span style={detailValue}>{formatDate(request.reviewed_at)}</span></div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div style={sectionContainer}>
            <h4 style={sectionTitle}>📄 Uploaded Documents</h4>
            <div style={documentsList}>
              {businessDocuments.length === 0 ? (
                <p style={{ color: '#8E99B3', fontSize: 13 }}>No documents uploaded</p>
              ) : (
                businessDocuments.map((doc, index) => (
                  <div key={index} style={documentItem}>
                    <div style={documentInfo}>
                      <span style={documentIcon}>📄</span>
                      <span style={documentName}>{doc.file_name}</span>
                      <span style={documentType}>{doc.document_type?.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div style={documentActions}>
                      <button 
                        onClick={() => openDocument(doc.file_url)} 
                        style={viewDocBtn}
                      >
                        👁️ View
                      </button>
                      <span style={docStatusBadge}>
                        {doc.is_verified ? '✅ Verified' : doc.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes */}
          {request.notes && (
            <div style={sectionContainer}>
              <h4 style={sectionTitle}>📝 Notes</h4>
              <p style={{ fontSize: 13, color: '#1F2F5F', background: '#F8FAFF', padding: 12, borderRadius: 8 }}>
                {request.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          {request.status === 'pending' && (
            <div style={actionContainer}>
              <button 
                onClick={() => handleApprove(request.id)} 
                disabled={processing}
                style={{ ...primaryBtn, background: '#4CAF50' }}
              >
                ✅ Approve
              </button>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setRejectionReason('');
                  setShowRejectModal(true);
                }} 
                disabled={processing}
                style={{ ...primaryBtn, background: '#F44336' }}
              >
                ❌ Reject
              </button>
            </div>
          )}

          {request.status !== 'pending' && (
            <div style={actionContainer}>
              <span style={{ fontSize: 13, color: '#8E99B3' }}>
                {request.status === 'approved' ? '✅ This business has been verified' : '❌ This business verification was rejected'}
                {request.reviewed_at && ` on ${formatDate(request.reviewed_at)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Reject Modal
  const renderRejectModal = () => {
    if (!showRejectModal) return null;

    return (
      <div style={modalOverlay} onClick={() => setShowRejectModal(false)}>
        <div style={{ ...modalContent, width: 450 }} onClick={e => e.stopPropagation()}>
          <div style={modalHeader}>
            <h3 style={modalTitle}>❌ Reject Verification</h3>
            <button onClick={() => setShowRejectModal(false)} style={closeBtn}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: '#8E99B3', marginBottom: 16 }}>
            Please provide a reason for rejecting this verification request.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            style={{ ...finput, minHeight: 100, resize: 'vertical', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowRejectModal(false)} style={cancelBtn}>Cancel</button>
            <button 
              onClick={() => handleReject(selectedRequest?.id)} 
              disabled={processing || !rejectionReason.trim()}
              style={{ ...primaryBtn, background: '#F44336', opacity: (processing || !rejectionReason.trim()) ? 0.6 : 1 }}
            >
              {processing ? 'Processing...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '30px 32px' }}>
      {/* Header */}
      <div style={headerContainer}>
        <div>
          <div style={breadcrumb}>Dashboard &gt; Verification</div>
          <h1 style={pageTitle}>✅ Verification Management</h1>
          <p style={pageSubtitle}>Review and manage business verification requests.</p>
        </div>
        <button onClick={fetchRequests} style={refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={statsGrid}>
        <div style={{ ...statCard, borderLeft: '4px solid #FF9800' }}>
          <div style={statValue}>{stats.pending}</div>
          <div style={statLabel}>⏳ Pending</div>
        </div>
        <div style={{ ...statCard, borderLeft: '4px solid #4CAF50' }}>
          <div style={statValue}>{stats.approved}</div>
          <div style={statLabel}>✅ Approved</div>
        </div>
        <div style={{ ...statCard, borderLeft: '4px solid #F44336' }}>
          <div style={statValue}>{stats.rejected}</div>
          <div style={statLabel}>❌ Rejected</div>
        </div>
        <div style={{ ...statCard, borderLeft: '4px solid #4A7DFF' }}>
          <div style={statValue}>{stats.total}</div>
          <div style={statLabel}>📋 Total</div>
        </div>
      </div>

      {/* Filters */}
      <div style={filtersContainer}>
        <input
          type="text"
          placeholder="Search business or owner..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={filterSelect}
        >
          <option value="all">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="approved">✅ Approved</option>
          <option value="rejected">❌ Rejected</option>
        </select>
        <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>
          {filteredRequests.length} requests found
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={emptyState}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
          <div style={emptyText}>Loading verification requests...</div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={emptyTitle}>No verification requests</div>
          <div style={emptySubtext}>All businesses have been verified or there are no pending requests.</div>
        </div>
      ) : (
        <div style={tableContainer}>
          <table style={table}>
            <thead>
              <tr style={tableHeader}>
                <th style={th}>Business</th>
                <th style={th}>Owner</th>
                <th style={th}>Type</th>
                <th style={th}>Submitted</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRequests.map((request) => {
                const business = request.business;
                const requester = request.requester;
                return (
                  <tr key={request.id} style={tableRow}>
                    <td style={td}>
                      <div style={businessCell}>
                        <div style={businessName}>{business?.name || 'Unknown Business'}</div>
                        <div style={businessCategory}>{business?.category || 'No category'}</div>
                      </div>
                    </td>
                    <td style={td}>
                      <div style={ownerCell}>
                        <div style={ownerName}>{requester?.full_name || 'Unknown'}</div>
                        <div style={ownerPhone}>{requester?.phone_number || 'No phone'}</div>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={typeBadge}>
                        {getBusinessTypeLabel(business?.business_type)}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={dateCell}>{formatDate(request.submitted_at)}</div>
                    </td>
                    <td style={td}>{getStatusBadge(request.status)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button 
                        onClick={() => handleViewDetails(request)} 
                        style={viewBtn}
                      >
                        👁️ View
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(request.id)} 
                            disabled={processing}
                            style={{ ...actionBtn, background: '#4CAF50', color: '#FFFFFF' }}
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedRequest(request);
                              setRejectionReason('');
                              setShowRejectModal(true);
                            }} 
                            disabled={processing}
                            style={{ ...actionBtn, background: '#F44336', color: '#FFFFFF' }}
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={paginationContainer}>
            <span style={{ fontSize: 12, color: '#8E99B3' }}>
              Showing {pagedRequests.length} of {filteredRequests.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={pageBtn}
              >
                ←
              </button>
              <span style={{ padding: '8px 14px', fontSize: 12, color: '#8E99B3' }}>
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                style={pageBtn}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {renderDetailModal()}
      {renderRejectModal()}
    </div>
  );
}

// ============================================
// STYLES (same as before)
// ============================================

const headerContainer = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 24,
};

const breadcrumb = {
  fontSize: 12,
  color: '#8E99B3',
  marginBottom: 4,
};

const pageTitle = {
  fontSize: 26,
  fontWeight: 800,
  color: '#1F2F5F',
  margin: 0,
};

const pageSubtitle = {
  color: '#8E99B3',
  fontSize: 14,
  marginTop: 4,
};

const refreshBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
  marginBottom: 24,
};

const statCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #EEF3FF',
};

const statValue = {
  fontSize: 28,
  fontWeight: 800,
  color: '#1F2F5F',
};

const statLabel = {
  fontSize: 12,
  color: '#8E99B3',
  marginTop: 4,
};

const filtersContainer = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
};

const searchInput = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  width: 280,
  fontSize: 13,
};

const filterSelect = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  fontSize: 13,
  background: '#FFFFFF',
  color: '#1F2F5F',
};

const tableContainer = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #EEF3FF',
  overflow: 'hidden',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse',
};

const tableHeader = {
  background: '#FAFBFF',
  borderBottom: '1px solid #EEF3FF',
};

const th = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: 11,
  color: '#8E99B3',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const td = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#1F2F5F',
};

const tableRow = {
  borderBottom: '1px solid #F5F6FA',
  transition: 'background 0.2s',
};

const businessCell = {
  display: 'flex',
  flexDirection: 'column',
};

const businessName = {
  fontWeight: 600,
  fontSize: 13,
  color: '#1F2F5F',
};

const businessCategory = {
  fontSize: 11,
  color: '#8E99B3',
  marginTop: 2,
};

const ownerCell = {
  display: 'flex',
  flexDirection: 'column',
};

const ownerName = {
  fontSize: 13,
  color: '#1F2F5F',
};

const ownerPhone = {
  fontSize: 11,
  color: '#8E99B3',
  marginTop: 2,
};

const typeBadge = {
  padding: '4px 10px',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  background: '#EEF3FF',
  color: '#4A7DFF',
};

const dateCell = {
  fontSize: 12,
  color: '#8E99B3',
};

const viewBtn = {
  padding: '6px 12px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#EEF3FF',
  color: '#4A7DFF',
  marginRight: 4,
};

const actionBtn = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  cursor: 'pointer',
  marginLeft: 4,
};

const paginationContainer = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 20px',
  borderTop: '1px solid #EEF3FF',
};

const pageBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #DCE5FF',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#FFFFFF',
  color: '#1F2F5F',
};

const emptyState = {
  textAlign: 'center',
  padding: 60,
  color: '#8E99B3',
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #EEF3FF',
};

const emptyTitle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#1F2F5F',
  marginBottom: 4,
};

const emptySubtext = {
  fontSize: 13,
  color: '#8E99B3',
};

const emptyText = {
  fontSize: 14,
  color: '#8E99B3',
};

// Modal Styles
const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
};

const modalContent = {
  background: '#FFFFFF',
  borderRadius: 16,
  padding: 28,
  maxHeight: '85vh',
  overflow: 'auto',
};

const modalHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
};

const modalTitle = {
  fontSize: 20,
  fontWeight: 800,
  color: '#1F2F5F',
  margin: 0,
};

const closeBtn = {
  background: 'none',
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
  color: '#8E99B3',
  padding: 4,
};

const sectionContainer = {
  marginBottom: 20,
  paddingBottom: 20,
  borderBottom: '1px solid #EEF3FF',
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#1F2F5F',
  margin: '0 0 12px 0',
};

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const detailItem = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '6px 0',
  borderBottom: '1px solid #F5F6FA',
};

const detailLabel = {
  fontSize: 12,
  color: '#8E99B3',
  fontWeight: 500,
};

const detailValue = {
  fontSize: 12,
  color: '#1F2F5F',
  fontWeight: 600,
  textAlign: 'right',
  maxWidth: '60%',
};

const documentsList = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const documentItem = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  background: '#F8FAFF',
  borderRadius: 8,
  border: '1px solid #EEF3FF',
};

const documentInfo = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const documentIcon = {
  fontSize: 16,
};

const documentName = {
  fontSize: 13,
  fontWeight: 500,
  color: '#1F2F5F',
};

const documentType = {
  fontSize: 11,
  color: '#8E99B3',
  padding: '2px 8px',
  borderRadius: 10,
  background: '#EEF3FF',
};

const documentActions = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const viewDocBtn = {
  padding: '4px 12px',
  borderRadius: 6,
  border: 'none',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#4A7DFF',
  color: '#FFFFFF',
};

const docStatusBadge = {
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 10,
  background: '#E8F5E9',
  color: '#2E7D32',
};

const actionContainer = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
  paddingTop: 16,
  borderTop: '1px solid #EEF3FF',
};

const primaryBtn = {
  padding: '10px 24px',
  borderRadius: 10,
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

const cancelBtn = {
  padding: '10px 24px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const finput = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #DCE5FF',
  fontSize: 13,
  color: '#1F2F5F',
  background: '#F8FAFF',
  outline: 'none',
  boxSizing: 'border-box',
};