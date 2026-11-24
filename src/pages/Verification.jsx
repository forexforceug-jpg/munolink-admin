// src/pages/Verification.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FiCheckCircle, FiXCircle, FiClock, FiRefreshCw, FiSearch, 
  FiFilter, FiEye, FiCheck, FiX, FiFileText, FiUser, FiHome,
  FiBriefcase, FiPhone, FiCalendar, FiMessageSquare, FiDownload,
  FiExternalLink, FiChevronLeft, FiChevronRight, FiAlertCircle,
  FiShield, FiUserCheck, FiUserX, FiTrash2, FiEdit2,
} from 'react-icons/fi';

// ============================================================
// COMPONENT
// ============================================================

export default function Verification() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [businessDocuments, setBusinessDocuments] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  // ============================================================
  // FETCH FUNCTIONS - FIXED
  // ============================================================

  const fetchAdminUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ✅ FIX: Use maybeSingle() instead of single() to avoid 406 errors
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Try to insert the user
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              phone_number: user.phone || '',
              full_name: user.user_metadata?.full_name || 'Admin',
              role: 'admin',
            })
            .select()
            .maybeSingle();
          
          if (insertError && insertError.code !== '23505') {
            console.error('Insert error:', insertError);
            // Use the user's id as fallback
            setAdminUserId(user.id);
          } else if (newUser) {
            setAdminUserId(newUser.id);
          } else {
            setAdminUserId(user.id);
          }
        } else if (profile) {
          setAdminUserId(profile.id);
        } else {
          // Try inserting the user
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              phone_number: user.phone || '',
              full_name: user.user_metadata?.full_name || 'Admin',
              role: 'admin',
            })
            .select()
            .maybeSingle();
          
          if (insertError && insertError.code !== '23505') {
            console.error('Insert error:', insertError);
            setAdminUserId(user.id);
          } else if (newUser) {
            setAdminUserId(newUser.id);
          } else {
            setAdminUserId(user.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching admin user:', error);
      // Fallback: use the user's id from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminUserId(user.id);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ FIX: Simplified query - don't try to join with users table directly
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          id,
          business_id,
          requested_by,
          status,
          notes,
          submitted_at,
          reviewed_at,
          reviewed_by,
          verification_type,
          owner_type
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        setError(error.message);
        throw error;
      }
      
      if (!data || data.length === 0) {
        setRequests([]);
        setStats({ pending: 0, approved: 0, rejected: 0, total: 0 });
        setLoading(false);
        return;
      }

      // ✅ Get business info separately
      const businessIds = data.map(r => r.business_id).filter(Boolean);
      let businessMap = {};
      if (businessIds.length > 0) {
        const { data: businesses, error: bizError } = await supabase
          .from('shops')
          .select('id, name, category, business_type, is_verified, created_at, owner_id')
          .in('id', businessIds);
        
        if (!bizError && businesses) {
          businessMap = businesses.reduce((acc, b) => {
            acc[b.id] = b;
            return acc;
          }, {});
        }
      }

      // ✅ Get requester info separately
      const userIds = data.map(r => r.requested_by).filter(Boolean);
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, full_name, phone_number')
          .in('id', userIds);
        
        if (!userError && users) {
          userMap = users.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {});
        }
      }

      // ✅ Get reviewer info separately
      const reviewerIds = data.map(r => r.reviewed_by).filter(Boolean);
      let reviewerMap = {};
      if (reviewerIds.length > 0) {
        const { data: reviewers, error: reviewerError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', reviewerIds);
        
        if (!reviewerError && reviewers) {
          reviewerMap = reviewers.reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {});
        }
      }

      // ✅ Combine data
      const enrichedData = data.map(r => ({
        ...r,
        business: businessMap[r.business_id] || null,
        requester: userMap[r.requested_by] || null,
        reviewer: reviewerMap[r.reviewed_by] || null,
      }));

      setRequests(enrichedData);

      // Calculate stats
      const pending = enrichedData.filter(r => r.status === 'pending').length || 0;
      const approved = enrichedData.filter(r => r.status === 'approved').length || 0;
      const rejected = enrichedData.filter(r => r.status === 'rejected').length || 0;

      setStats({ pending, approved, rejected, total: enrichedData.length || 0 });

    } catch (error) {
      console.error('Error fetching verification requests:', error);
      setError('Failed to load verification requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (businessId) => {
    try {
      // ✅ FIX: Use maybeSingle() and handle empty results
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', businessId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        setBusinessDocuments([]);
        return;
      }
      setBusinessDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setBusinessDocuments([]);
    }
  }, []);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    const init = async () => {
      await fetchAdminUser();
      await fetchRequests();
    };
    init();
  }, [fetchAdminUser, fetchRequests]);

  // ============================================================
  // HANDLERS
  // ============================================================

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

      // Update verification request status
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
      if (request.business_id) {
        const { error: bizError } = await supabase
          .from('shops')
          .update({ is_verified: true })
          .eq('id', request.business_id);

        if (bizError) console.error('Error updating business:', bizError);
      }

      // Update documents
      if (request.business_id) {
        const { error: docError } = await supabase
          .from('business_documents')
          .update({ 
            is_verified: true,
            verified_at: new Date().toISOString(),
            verified_by: adminUserId,
          })
          .eq('business_id', request.business_id);

        if (docError) console.error('Error updating documents:', docError);
      }

      alert('✅ Business verified successfully!');
      await fetchRequests();
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

      if (request.business_id) {
        const { error: bizError } = await supabase
          .from('shops')
          .update({ is_verified: false })
          .eq('id', request.business_id);

        if (bizError) console.error('Error updating business:', bizError);
      }

      alert('❌ Business verification rejected.');
      setShowRejectModal(false);
      setRejectionReason('');
      await fetchRequests();
      setShowDetailModal(false);

    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    if (request.business_id) {
      await fetchDocuments(request.business_id);
    }
    setShowDetailModal(true);
  };

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#FEF3C7', color: '#D97706', icon: <FiClock size={14} />, label: 'Pending' },
      approved: { bg: '#D1FAE5', color: '#059669', icon: <FiCheckCircle size={14} />, label: 'Approved' },
      rejected: { bg: '#FEE2E2', color: '#DC2626', icon: <FiXCircle size={14} />, label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 6,
        padding: '4px 12px', 
        borderRadius: 12, 
        fontSize: 11, 
        fontWeight: 600, 
        background: s.bg, 
        color: s.color 
      }}>
        {s.icon}
        {s.label}
      </span>
    );
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
      shop: { label: 'Shop', icon: <FiBriefcase size={14} /> },
      service: { label: 'Service Provider', icon: <FiUser size={14} /> },
      institution: { label: 'Institution', icon: <FiHome size={14} /> },
    };
    const result = map[type] || { label: type || 'Unknown', icon: <FiHome size={14} /> };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {result.icon}
        {result.label}
      </span>
    );
  };

  // ============================================================
  // FILTERING & PAGINATION
  // ============================================================

  const filteredRequests = useMemo(() => {
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
  }, [requests, statusFilter, search]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const pagedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <div>
          <div style={breadcrumb}>Dashboard / Verification</div>
          <h1 style={pageTitle}>Verification Management</h1>
          <p style={pageSubtitle}>Review and manage business verification requests.</p>
        </div>
        <button onClick={fetchRequests} style={refreshBtn}>
          <FiRefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={statsGrid}>
        <div style={{ ...statCard, borderLeft: '4px solid #F59E0B' }}>
          <div style={statValue}>{stats.pending}</div>
          <div style={statLabel}>
            <FiClock size={14} style={{ marginRight: 4 }} />
            Pending
          </div>
        </div>
        <div style={{ ...statCard, borderLeft: '4px solid #10B981' }}>
          <div style={statValue}>{stats.approved}</div>
          <div style={statLabel}>
            <FiCheckCircle size={14} style={{ marginRight: 4 }} />
            Approved
          </div>
        </div>
        <div style={{ ...statCard, borderLeft: '4px solid #EF4444' }}>
          <div style={statValue}>{stats.rejected}</div>
          <div style={statLabel}>
            <FiXCircle size={14} style={{ marginRight: 4 }} />
            Rejected
          </div>
        </div>
        <div style={{ ...statCard, borderLeft: '4px solid #3B82F6' }}>
          <div style={statValue}>{stats.total}</div>
          <div style={statLabel}>
            <FiFileText size={14} style={{ marginRight: 4 }} />
            Total
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={filtersContainer}>
        <div style={searchWrapper}>
          <FiSearch size={18} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search business or owner..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={searchInput}
          />
        </div>
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
        <span style={resultCount}>
          {filteredRequests.length} requests found
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div style={errorContainer}>
          <FiAlertCircle size={20} color="#EF4444" />
          <span style={{ color: '#DC2626', fontSize: 14 }}>{error}</span>
          <button onClick={fetchRequests} style={errorRetryBtn}>Retry</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={emptyState}>
          <div style={loadingSpinner} />
          <div style={emptyText}>Loading verification requests...</div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={emptyState}>
          <div style={emptyIcon}>📭</div>
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
                <th style={{ ...th, textAlign: 'center' }}>Actions</th>
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
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button 
                        onClick={() => handleViewDetails(request)} 
                        style={viewBtn}
                      >
                        <FiEye size={14} />
                        View
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(request.id)} 
                            disabled={processing}
                            style={{ ...actionBtn, background: '#10B981', color: '#FFFFFF' }}
                          >
                            <FiCheck size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedRequest(request);
                              setRejectionReason('');
                              setShowRejectModal(true);
                            }} 
                            disabled={processing}
                            style={{ ...actionBtn, background: '#EF4444', color: '#FFFFFF' }}
                          >
                            <FiX size={14} />
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
            <span style={paginationInfo}>
              Showing {pagedRequests.length} of {filteredRequests.length}
            </span>
            <div style={paginationControls}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...pageBtn, opacity: page === 1 ? 0.5 : 1 }}
              >
                <FiChevronLeft size={16} />
              </button>
              <span style={pageInfo}>
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                style={{ ...pageBtn, opacity: page === totalPages || totalPages === 0 ? 0.5 : 1 }}
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDetailModal && renderDetailModal()}
      {showRejectModal && renderRejectModal()}
    </div>
  );

  // ============================================================
  // MODAL RENDERERS
  // ============================================================

  function renderDetailModal() {
    if (!selectedRequest) return null;

    const request = selectedRequest;
    const business = request.business;
    const requester = request.requester;

    return (
      <div style={modalOverlay} onClick={() => setShowDetailModal(false)}>
        <div style={modalContent} onClick={e => e.stopPropagation()}>
          <div style={modalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: '#EEF3FF', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: 24
              }}>
                <FiShield size={24} color="#4A7DFF" />
              </div>
              <div>
                <h3 style={modalTitle}>Verification Details</h3>
                <p style={{ fontSize: 12, color: '#64748B' }}>
                  {getStatusBadge(request.status)}
                </p>
              </div>
            </div>
            <button onClick={() => setShowDetailModal(false)} style={closeBtn}>
              <FiXCircle size={22} />
            </button>
          </div>

          <div style={modalBody}>
            {/* Business Info */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>
                <FiBriefcase size={16} /> Business Information
              </h4>
              <div style={detailGrid}>
                <div style={detailItem}>
                  <span style={detailLabel}>Business Name</span>
                  <span style={detailValue}>{business?.name || '—'}</span>
                </div>
                <div style={detailItem}>
                  <span style={detailLabel}>Type</span>
                  <span style={detailValue}>{getBusinessTypeLabel(business?.business_type)}</span>
                </div>
                <div style={detailItem}>
                  <span style={detailLabel}>Category</span>
                  <span style={detailValue}>{business?.category || '—'}</span>
                </div>
                <div style={detailItem}>
                  <span style={detailLabel}>Status</span>
                  <span style={detailValue}>{getStatusBadge(request.status)}</span>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>
                <FiUser size={16} /> Owner Information
              </h4>
              <div style={detailGrid}>
                <div style={detailItem}>
                  <span style={detailLabel}>Name</span>
                  <span style={detailValue}>{requester?.full_name || '—'}</span>
                </div>
                <div style={detailItem}>
                  <span style={detailLabel}>Phone</span>
                  <span style={detailValue}>{requester?.phone_number || '—'}</span>
                </div>
                <div style={detailItem}>
                  <span style={detailLabel}>Submitted</span>
                  <span style={detailValue}>{formatDate(request.submitted_at)}</span>
                </div>
                {request.reviewed_at && (
                  <div style={detailItem}>
                    <span style={detailLabel}>Reviewed</span>
                    <span style={detailValue}>{formatDate(request.reviewed_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>
                <FiFileText size={16} /> Uploaded Documents
              </h4>
              {businessDocuments.length === 0 ? (
                <p style={{ color: '#64748B', fontSize: 13 }}>No documents uploaded</p>
              ) : (
                <div style={documentsList}>
                  {businessDocuments.map((doc, index) => (
                    <div key={index} style={documentItem}>
                      <div style={documentInfo}>
                        <div style={documentIcon}>
                          <FiFileText size={16} color="#4A7DFF" />
                        </div>
                        <div>
                          <div style={documentName}>{doc.file_name}</div>
                          <div style={documentMeta}>
                            <span style={documentType}>{doc.document_type?.replace('_', ' ').toUpperCase()}</span>
                            <span style={documentSize}>{(doc.file_size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                      </div>
                      <div style={documentActions}>
                        {doc.file_url && (
                          <button 
                            onClick={() => window.open(doc.file_url, '_blank')} 
                            style={viewDocBtn}
                          >
                            <FiExternalLink size={14} />
                            View
                          </button>
                        )}
                        <span style={{ 
                          ...docStatusBadge,
                          background: doc.is_verified ? '#D1FAE5' : '#FEF3C7',
                          color: doc.is_verified ? '#059669' : '#D97706',
                        }}>
                          {doc.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {request.notes && (
              <div style={sectionCard}>
                <h4 style={sectionTitle}>
                  <FiMessageSquare size={16} /> Rejection Notes
                </h4>
                <p style={{ 
                  fontSize: 13, 
                  color: '#DC2626', 
                  background: '#FEF2F2', 
                  padding: 12, 
                  borderRadius: 8,
                  border: '1px solid #FECACA',
                }}>
                  {request.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            {request.status === 'pending' && (
              <div style={actionContainer}>
                <button 
                  onClick={() => {
                    setShowDetailModal(false);
                    setRejectionReason('');
                    setShowRejectModal(true);
                  }} 
                  disabled={processing}
                  style={rejectBtn}
                >
                  <FiX size={16} />
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(request.id)} 
                  disabled={processing}
                  style={approveBtn}
                >
                  <FiCheck size={16} />
                  Approve
                </button>
              </div>
            )}

            {request.status !== 'pending' && (
              <div style={actionContainer}>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  {request.status === 'approved' ? (
                    <span style={{ color: '#059669' }}>✅ This business has been verified</span>
                  ) : (
                    <span style={{ color: '#DC2626' }}>❌ This business verification was rejected</span>
                  )}
                  {request.reviewed_at && ` on ${formatDate(request.reviewed_at)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderRejectModal() {
    if (!showRejectModal) return null;

    return (
      <div style={modalOverlay} onClick={() => setShowRejectModal(false)}>
        <div style={{ ...modalContent, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
          <div style={modalHeader}>
            <h3 style={modalTitle}>
              <FiXCircle size={20} color="#DC2626" style={{ marginRight: 8 }} />
              Reject Verification
            </h3>
            <button onClick={() => setShowRejectModal(false)} style={closeBtn}>
              <FiXCircle size={22} />
            </button>
          </div>
          <div style={modalBody}>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
              Please provide a reason for rejecting this verification request.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={textArea}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowRejectModal(false)} style={cancelBtn}>
                Cancel
              </button>
              <button 
                onClick={() => handleReject(selectedRequest?.id)} 
                disabled={processing || !rejectionReason.trim()}
                style={{ ...rejectBtn, opacity: (processing || !rejectionReason.trim()) ? 0.6 : 1 }}
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// ============================================================
// STYLES
// ============================================================

const container = {
  padding: '30px 32px',
  maxWidth: '1400px',
  margin: '0 auto',
  background: '#F8FAFC',
  minHeight: '100vh',
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 24,
};

const breadcrumb = {
  fontSize: 12,
  color: '#64748B',
  marginBottom: 4,
};

const pageTitle = {
  fontSize: 26,
  fontWeight: 800,
  color: '#0F172A',
  margin: 0,
};

const pageSubtitle = {
  color: '#64748B',
  fontSize: 14,
  marginTop: 4,
};

const refreshBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  color: '#3B82F6',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.2s',
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
  padding: '18px 20px',
  border: '1px solid #E2E8F0',
};

const statValue = {
  fontSize: 28,
  fontWeight: 800,
  color: '#0F172A',
};

const statLabel = {
  fontSize: 13,
  color: '#64748B',
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
};

const filtersContainer = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
};

const searchWrapper = {
  position: 'relative',
  flex: 1,
  maxWidth: 320,
};

const searchInput = {
  width: '100%',
  padding: '10px 16px 10px 40px',
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  fontSize: 13,
  background: '#FFFFFF',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const filterSelect = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  fontSize: 13,
  background: '#FFFFFF',
  color: '#0F172A',
  cursor: 'pointer',
  outline: 'none',
};

const resultCount = {
  fontSize: 13,
  color: '#64748B',
  marginLeft: 'auto',
};

const errorContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 20px',
  background: '#FEF2F2',
  borderRadius: 12,
  border: '1px solid #FECACA',
  marginBottom: 20,
};

const errorRetryBtn = {
  padding: '6px 16px',
  borderRadius: 8,
  border: '1px solid #FCA5A5',
  background: '#FFFFFF',
  color: '#DC2626',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  marginLeft: 'auto',
};

const tableContainer = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #E2E8F0',
  overflow: 'hidden',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse',
};

const tableHeader = {
  background: '#F8FAFC',
  borderBottom: '1px solid #E2E8F0',
};

const th = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: 11,
  color: '#64748B',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const td = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#0F172A',
};

const tableRow = {
  borderBottom: '1px solid #F1F5F9',
  transition: 'background 0.2s',
};

const businessCell = {
  display: 'flex',
  flexDirection: 'column',
};

const businessName = {
  fontWeight: 600,
  fontSize: 13,
  color: '#0F172A',
};

const businessCategory = {
  fontSize: 11,
  color: '#64748B',
  marginTop: 2,
};

const ownerCell = {
  display: 'flex',
  flexDirection: 'column',
};

const ownerName = {
  fontSize: 13,
  color: '#0F172A',
};

const ownerPhone = {
  fontSize: 11,
  color: '#64748B',
  marginTop: 2,
};

const typeBadge = {
  padding: '4px 10px',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  background: '#EEF3FF',
  color: '#3B82F6',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const dateCell = {
  fontSize: 12,
  color: '#64748B',
};

const viewBtn = {
  padding: '6px 14px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#EEF3FF',
  color: '#3B82F6',
  marginRight: 4,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all 0.2s',
};

const actionBtn = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  cursor: 'pointer',
  marginLeft: 4,
  display: 'inline-flex',
  alignItems: 'center',
  transition: 'all 0.2s',
};

const paginationContainer = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 20px',
  borderTop: '1px solid #E2E8F0',
};

const paginationInfo = {
  fontSize: 13,
  color: '#64748B',
};

const paginationControls = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const pageBtn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#FFFFFF',
  color: '#0F172A',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s',
};

const pageInfo = {
  padding: '8px 14px',
  fontSize: 13,
  color: '#64748B',
};

const emptyState = {
  textAlign: 'center',
  padding: 60,
  color: '#64748B',
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #E2E8F0',
};

const emptyIcon = {
  fontSize: 48,
  marginBottom: 16,
};

const emptyTitle = {
  fontSize: 18,
  fontWeight: 600,
  color: '#0F172A',
  marginBottom: 4,
};

const emptySubtext = {
  fontSize: 14,
  color: '#64748B',
};

const emptyText = {
  fontSize: 14,
  color: '#64748B',
  marginTop: 12,
};

const loadingSpinner = {
  width: 40,
  height: 40,
  border: '4px solid #E2E8F0',
  borderTop: '4px solid #3B82F6',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto 16px',
};

// Modal Styles
const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  padding: 20,
};

const modalContent = {
  background: '#FFFFFF',
  borderRadius: 16,
  maxWidth: 700,
  width: '100%',
  maxHeight: '85vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const modalHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid #E2E8F0',
};

const modalTitle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#0F172A',
  margin: 0,
};

const modalBody = {
  padding: '24px',
  overflowY: 'auto',
  flex: 1,
};

const closeBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#64748B',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
};

const sectionCard = {
  marginBottom: 20,
  paddingBottom: 20,
  borderBottom: '1px solid #E2E8F0',
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#0F172A',
  margin: '0 0 12px 0',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const detailItem = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid #F1F5F9',
};

const detailLabel = {
  fontSize: 12,
  color: '#64748B',
  fontWeight: 500,
};

const detailValue = {
  fontSize: 12,
  color: '#0F172A',
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
  padding: '10px 14px',
  background: '#F8FAFC',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
};

const documentInfo = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const documentIcon = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: '#EEF3FF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const documentName = {
  fontSize: 13,
  fontWeight: 500,
  color: '#0F172A',
};

const documentMeta = {
  display: 'flex',
  gap: 8,
  marginTop: 2,
};

const documentType = {
  fontSize: 11,
  color: '#64748B',
  padding: '2px 8px',
  borderRadius: 10,
  background: '#E2E8F0',
};

const documentSize = {
  fontSize: 11,
  color: '#64748B',
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
  background: '#3B82F6',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all 0.2s',
};

const docStatusBadge = {
  fontSize: 11,
  padding: '2px 10px',
  borderRadius: 10,
  fontWeight: 600,
};

const actionContainer = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
  paddingTop: 16,
  borderTop: '1px solid #E2E8F0',
};

const approveBtn = {
  padding: '10px 28px',
  borderRadius: 10,
  background: '#10B981',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.2s',
};

const rejectBtn = {
  padding: '10px 28px',
  borderRadius: 10,
  background: '#EF4444',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.2s',
};

const cancelBtn = {
  padding: '10px 24px',
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  color: '#0F172A',
  transition: 'all 0.2s',
};

const textArea = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 13,
  color: '#0F172A',
  background: '#FFFFFF',
  outline: 'none',
  resize: 'vertical',
  minHeight: 100,
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

// Add keyframe animation for spinner
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleTag);
}