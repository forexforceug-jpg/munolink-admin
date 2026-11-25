import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiMapPin,
  FiRefreshCw,
  FiShield,
  FiShoppingBag,
  FiUser,
  FiX,
  FiXCircle,
  FiZap,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import {
  getVerificationApprovalMode,
  saveVerificationApprovalMode,
} from '../lib/platformSettings';
import {
  badgeStyle,
  card,
  colors,
  ghostButton,
  initials,
  input,
  primaryButton,
  radii,
  timeAgo,
} from '../lib/theme';
import {
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  StatCard,
  TableShell,
  Td,
  Th,
  Toolbar,
} from '../components/ui';

const PAGE_SIZE = 10;

const ENTITY_TYPES = {
  shop: { label: 'Shop', short: 'Shop', table: 'shops', icon: FiShoppingBag, tone: 'primary' },
  provider: {
    label: 'Individual provider',
    short: 'Provider',
    table: 'individual_providers',
    icon: FiUser,
    tone: 'purple',
  },
  institution: {
    label: 'Institution',
    short: 'Institution',
    table: 'institutions',
    icon: FiBriefcase,
    tone: 'teal',
  },
};

function resolveEntityType(request, entity) {
  if (entity?.__entityType) return entity.__entityType;
  const haystack = [
    request.verification_type,
    request.owner_type,
    request.business_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (haystack.includes('provider') || haystack.includes('individual') || haystack.includes('service')) {
    return 'provider';
  }
  if (haystack.includes('institution') || haystack.includes('school') || haystack.includes('clinic')) {
    return 'institution';
  }
  return 'shop';
}

function entityDisplayName(entity, type) {
  if (!entity) return 'Unknown entity';
  if (type === 'provider') {
    return (
      entity.display_name ||
      entity.full_name ||
      [entity.first_name, entity.last_name].filter(Boolean).join(' ') ||
      entity.business_name ||
      entity.email ||
      'Individual provider'
    );
  }
  return entity.name || entity.display_name || 'Unknown entity';
}

function entityImage(entity) {
  return entity?.logo_url || entity?.logo || entity?.profile_image || entity?.cover_image || '';
}

function entityOwnerId(entity, request, type) {
  if (type === 'shop') return entity?.owner_id || request.requested_by || null;
  return entity?.created_by || request.requested_by || null;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function BlueTick({ size = 14, title = 'Verified' }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.primary,
        color: '#FFFFFF',
        flexShrink: 0,
      }}
    >
      <FiCheck size={Math.max(8, size - 5)} strokeWidth={4} />
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { tone: 'warning', label: 'Pending', icon: FiClock },
    approved: { tone: 'success', label: 'Approved', icon: FiCheckCircle },
    rejected: { tone: 'danger', label: 'Rejected', icon: FiXCircle },
  };
  const config = map[status] || map.pending;
  const Icon = config.icon;
  return (
    <span style={badgeStyle(config.tone)}>
      <Icon size={10} /> {config.label}
    </span>
  );
}

export default function Verification() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalMode, setApprovalMode] = useState('manual');
  const [autoConfirm, setAutoConfirm] = useState(false);

  const adminUserId = user?.id || null;

  const showNotice = (tone, message) => setNotice({ tone, message });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requestResult = await db('verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (requestResult.error) throw new Error(requestResult.error.message);

      const rows = Array.isArray(requestResult.data) ? requestResult.data : [];
      const businessIds = [...new Set(rows.map((row) => row.business_id).filter(Boolean))];
      const userIds = [
        ...new Set(
          rows
            .flatMap((row) => [row.requested_by, row.reviewed_by])
            .filter(Boolean)
        ),
      ];

      const entityQueries = businessIds.length
        ? await Promise.all([
            db('shops').select('*').in('id', businessIds),
            db('individual_providers').select('*').in('id', businessIds),
            db('institutions').select('*').in('id', businessIds),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }];

      const userResult = userIds.length
        ? await db('users')
            .select('id,full_name,email,phone_number,kyc_verified,avatar_url')
            .in('id', userIds)
        : { data: [] };

      const entityMap = new Map();
      const addEntities = (list, type) => {
        for (const item of list || []) {
          if (!entityMap.has(item.id)) {
            entityMap.set(item.id, { ...item, __entityType: type });
          }
        }
      };
      addEntities(entityQueries[0].data, 'shop');
      addEntities(entityQueries[1].data, 'provider');
      addEntities(entityQueries[2].data, 'institution');

      const userMap = new Map(
        (Array.isArray(userResult.data) ? userResult.data : []).map((member) => [
          member.id,
          member,
        ])
      );

      const enriched = rows.map((request) => {
        const entity = entityMap.get(request.business_id) || null;
        const type = resolveEntityType(request, entity);
        const ownerId = entityOwnerId(entity, request, type);
        const owner = ownerId ? userMap.get(ownerId) : null;
        const requester = request.requested_by
          ? userMap.get(request.requested_by) || null
          : null;
        const reviewer = request.reviewed_by
          ? userMap.get(request.reviewed_by) || null
          : null;
        return {
          ...request,
          entity,
          entityType: type,
          entityTable: ENTITY_TYPES[type]?.table || 'shops',
          entityName: entityDisplayName(entity, type),
          entityImage: entityImage(entity),
          entityVerified: Boolean(entity?.is_verified),
          ownerId,
          owner,
          ownerName:
            owner?.full_name ||
            (type === 'provider' ? entityDisplayName(entity, type) : '') ||
            requester?.full_name ||
            'Unknown owner',
          ownerVerified: Boolean(owner?.kyc_verified),
          ownerPhone: entity?.phone || requester?.phone_number || '',
          location: entity?.city || entity?.address || entity?.area || '',
          requester,
          reviewer,
        };
      });

      setRequests(enriched);
      setApprovalMode(await getVerificationApprovalMode());
    } catch (loadError) {
      setError(loadError.message || 'Could not load verification requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const pending = requests.filter((row) => row.status === 'pending').length;
    const approved = requests.filter((row) => row.status === 'approved').length;
    const rejected = requests.filter((row) => row.status === 'rejected').length;
    const verifiedEntities = new Set(
      requests
        .filter((row) => row.entityVerified)
        .map((row) => row.business_id)
        .filter(Boolean)
    ).size;
    return { pending, approved, rejected, verifiedEntities, total: requests.length };
  }, [requests]);

  const typeCounts = useMemo(
    () => ({
      shop: requests.filter((row) => row.entityType === 'shop').length,
      provider: requests.filter((row) => row.entityType === 'provider').length,
      institution: requests.filter((row) => row.entityType === 'institution').length,
    }),
    [requests]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (typeFilter !== 'all' && row.entityType !== typeFilter) return false;
      if (!query) return true;
      return [row.entityName, row.ownerName, row.ownerPhone, row.entity?.category, row.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, statusFilter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const approveRequest = async (request, reviewerId) => {
    const now = new Date().toISOString();
    const requestResult = await db('verification_requests')
      .update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: reviewerId,
        notes: null,
      })
      .eq('id', request.id);
    if (requestResult.error) throw new Error(requestResult.error.message);

    if (request.business_id && request.entityTable) {
      const entityResult = await db(request.entityTable)
        .update({ is_verified: true })
        .eq('id', request.business_id);
      if (entityResult.error) throw new Error(entityResult.error.message);
    }

    const userIds = [...new Set([request.requested_by, request.ownerId].filter(Boolean))];
    if (userIds.length) {
      const userResult = await db('users')
        .update({ kyc_verified: true })
        .in('id', userIds);
      if (userResult.error) throw new Error(userResult.error.message);
    }
  };

  const handleApprove = async (request) => {
    if (!request) return;
    if (!adminUserId) {
      showNotice('danger', 'Admin session not found. Refresh and try again.');
      return;
    }
    setProcessing(true);
    try {
      await approveRequest(request, adminUserId);
      setShowDetail(false);
      setSelectedRequest(null);
      showNotice('success', `${request.entityName} is verified. The blue tick is now active.`);
      await loadData();
    } catch (approveError) {
      showNotice('danger', approveError.message || 'Could not approve this request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoApprove = async () => {
    const pending = requests.filter((row) => row.status === 'pending');
    if (!pending.length) {
      setAutoConfirm(false);
      showNotice('warning', 'There are no pending verification requests.');
      return;
    }
    if (!adminUserId) {
      setAutoConfirm(false);
      showNotice('danger', 'Admin session not found. Refresh and try again.');
      return;
    }
    setProcessing(true);
    setAutoConfirm(false);
    let approved = 0;
    let failed = 0;
    for (const request of pending) {
      try {
        await approveRequest(request, adminUserId);
        approved += 1;
      } catch {
        failed += 1;
      }
    }
    showNotice(
      failed ? 'warning' : 'success',
      `${approved} request${approved === 1 ? '' : 's'} approved${
        failed ? `; ${failed} could not be processed` : ''
      }. Blue ticks were issued for approved owners.`
    );
    await loadData();
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      showNotice('danger', 'Add a reason before rejecting this request.');
      return;
    }
    if (!adminUserId) {
      showNotice('danger', 'Admin session not found. Refresh and try again.');
      return;
    }
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const requestResult = await db('verification_requests')
        .update({
          status: 'rejected',
          notes: rejectionReason.trim(),
          reviewed_at: now,
          reviewed_by: adminUserId,
        })
        .eq('id', rejectTarget.id);
      if (requestResult.error) throw new Error(requestResult.error.message);

      if (rejectTarget.business_id && rejectTarget.entityTable) {
        const entityResult = await db(rejectTarget.entityTable)
          .update({ is_verified: false })
          .eq('id', rejectTarget.business_id);
        if (entityResult.error) throw new Error(entityResult.error.message);
      }

      const userIds = [
        ...new Set([rejectTarget.requested_by, rejectTarget.ownerId].filter(Boolean)),
      ];
      const hasAnotherApproval = requests.some(
        (row) =>
          row.id !== rejectTarget.id &&
          row.status === 'approved' &&
          [row.requested_by, row.ownerId].some((id) => userIds.includes(id))
      );
      if (userIds.length && !hasAnotherApproval) {
        await db('users').update({ kyc_verified: false }).in('id', userIds);
      }

      setRejectTarget(null);
      setRejectionReason('');
      setShowDetail(false);
      setSelectedRequest(null);
      showNotice('success', `${rejectTarget.entityName} verification was rejected.`);
      await loadData();
    } catch (rejectError) {
      showNotice('danger', rejectError.message || 'Could not reject this request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleModeChange = async (mode) => {
    setApprovalMode(mode);
    const result = await saveVerificationApprovalMode(mode);
    showNotice(
      result.persisted ? 'success' : 'warning',
      result.persisted
        ? mode === 'automatic'
          ? 'Automatic approval mode is on. Use Run auto-approval to process the pending queue.'
          : 'Manual approval mode is on. Every request needs an admin decision.'
        : 'Saved locally. Create the platform_settings table to share this setting.'
    );
  };

  const openDetails = (request) => {
    setSelectedRequest(request);
    setShowDetail(true);
  };

  const openReject = (request) => {
    setRejectTarget(request);
    setRejectionReason('');
  };

  const statusOptions = [
    { value: 'pending', label: `Pending (${stats.pending})` },
    { value: 'approved', label: `Approved (${stats.approved})` },
    { value: 'rejected', label: `Rejected (${stats.rejected})` },
    { value: 'all', label: `All (${stats.total})` },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Trust and safety"
        title="Verification"
        subtitle="Approve individual providers, institutions and shops. Approved entities receive the blue tick next to their name across web and mobile."
        actions={
          <button type="button" onClick={loadData} disabled={loading} style={ghostButton}>
            <FiRefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {notice && (
        <div style={{ marginBottom: 14 }}>
          <Notice tone={notice.tone}>{notice.message}</Notice>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="danger">
            <FiAlertCircle size={13} /> {error}
          </Notice>
        </div>
      )}

      <section style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={styles.modeRow}>
          <div style={styles.modeCopy}>
            <div style={styles.modeTitle}>
              <FiShield size={16} color={colors.primary} />
              Approval mode
            </div>
            <div style={styles.modeText}>
              Manual approval requires an admin decision for every request. Automatic mode keeps
              the setting ready for third-party identity checks and exposes a one-click approval
              pass for the current queue.
            </div>
          </div>
          <div style={styles.modeActions}>
            <div style={styles.segmented}>
              <button
                type="button"
                onClick={() => handleModeChange('manual')}
                style={{
                  ...styles.segmentButton,
                  ...(approvalMode === 'manual' ? styles.segmentButtonActive : null),
                }}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('automatic')}
                style={{
                  ...styles.segmentButton,
                  ...(approvalMode === 'automatic' ? styles.segmentButtonActive : null),
                }}
              >
                Automatic
              </button>
            </div>
            {approvalMode === 'automatic' && (
              <button
                type="button"
                onClick={() => setAutoConfirm(true)}
                disabled={processing || !stats.pending}
                style={{
                  ...primaryButton,
                  opacity: processing || !stats.pending ? 0.55 : 1,
                }}
              >
                <FiZap size={14} /> Run auto-approval
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Notice tone={approvalMode === 'automatic' ? 'warning' : 'primary'}>
            {approvalMode === 'automatic'
              ? 'Automatic mode is enabled. A third-party verification provider can call the same approval flow when its checks pass; until then, use Run auto-approval for the pending queue.'
              : 'Manual mode is enabled. Document checks will move to a third-party verification provider; this page controls entity status and the blue tick.'}
          </Notice>
        </div>
      </section>

      <div style={styles.statsGrid}>
        <StatCard
          icon={FiClock}
          label="Pending"
          value={stats.pending}
          detail="Waiting for an admin decision"
          tone="warning"
        />
        <StatCard
          icon={FiCheckCircle}
          label="Approved"
          value={stats.approved}
          detail="Blue tick issued to approved owners"
          tone="success"
        />
        <StatCard
          icon={FiXCircle}
          label="Rejected"
          value={stats.rejected}
          detail="Rejected with reviewer notes"
          tone="danger"
        />
        <StatCard
          icon={FiShield}
          label="Verified entities"
          value={stats.verifiedEntities}
          detail="Shops, providers and institutions"
          tone="primary"
        />
      </div>

      <div style={styles.typeTabs}>
        {[
          { key: 'all', label: 'All types', count: stats.total },
          { key: 'shop', label: 'Shops', count: typeCounts.shop },
          { key: 'provider', label: 'Individual providers', count: typeCounts.provider },
          { key: 'institution', label: 'Institutions', count: typeCounts.institution },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setTypeFilter(tab.key);
              setPage(1);
            }}
            style={{
              ...styles.typeTab,
              ...(typeFilter === tab.key ? styles.typeTabActive : null),
            }}
          >
            {tab.label}
            <span style={styles.typeCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search entity, owner or location..."
          style={{ flex: 1, maxWidth: 360 }}
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          style={{ ...input, width: 170 }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={styles.resultMeta}>
          {filtered.length} request{filtered.length === 1 ? '' : 's'} found
        </span>
      </Toolbar>

      {loading ? (
        <div style={{ ...card, padding: 48, textAlign: 'center', color: colors.textMuted }}>
          Loading verification requests...
        </div>
      ) : !paged.length ? (
        <div style={card}>
          <EmptyState
            icon={FiShield}
            title="No verification requests"
            description={
              search || typeFilter !== 'all' || statusFilter !== 'pending'
                ? 'No requests match the current filters.'
                : 'New provider, institution and shop verification requests will appear here.'
            }
          />
        </div>
      ) : (
        <TableShell>
          <table style={styles.table}>
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th>Owner</Th>
                <Th>Type</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th style={{ textAlign: 'right' }}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((request) => {
                const typeConfig = ENTITY_TYPES[request.entityType] || ENTITY_TYPES.shop;
                const TypeIcon = typeConfig.icon;
                return (
                  <tr key={request.id}>
                    <Td>
                      <div style={styles.entityCell}>
                        <div style={styles.avatarWrap}>
                          {request.entityImage ? (
                            <img src={request.entityImage} alt="" style={styles.avatarImage} />
                          ) : (
                            <span style={styles.avatarFallback}>
                              {initials(request.entityName)}
                            </span>
                          )}
                        </div>
                        <div style={styles.entityText}>
                          <div style={styles.entityNameRow}>
                            <span style={styles.entityName}>{request.entityName}</span>
                            {(request.entityVerified || request.status === 'approved') && (
                              <BlueTick title="Blue tick verified" />
                            )}
                          </div>
                          <div style={styles.entityMeta}>
                            {request.entity?.category || request.location || 'No category'}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div style={styles.ownerCell}>
                        <div style={styles.ownerNameRow}>
                          <span style={styles.ownerName}>{request.ownerName}</span>
                          {request.ownerVerified && <BlueTick size={12} title="Verified owner" />}
                        </div>
                        <div style={styles.ownerMeta}>
                          {request.ownerPhone || request.owner?.email || 'No contact'}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span style={badgeStyle(typeConfig.tone)}>
                        <TypeIcon size={10} /> {typeConfig.short}
                      </span>
                    </Td>
                    <Td>
                      <div style={styles.dateCell}>{timeAgo(request.submitted_at)}</div>
                      <div style={styles.dateSub}>{formatDate(request.submitted_at)}</div>
                    </Td>
                    <Td>
                      <StatusBadge status={request.status} />
                    </Td>
                    <Td>
                      <div style={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openDetails(request)}
                          style={styles.iconButton}
                          title="View details"
                        >
                          <FiEye size={13} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(request)}
                              disabled={processing}
                              style={{ ...styles.iconButton, color: colors.success }}
                              title="Approve and issue blue tick"
                            >
                              <FiCheck size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openReject(request)}
                              disabled={processing}
                              style={{ ...styles.iconButton, color: colors.danger }}
                              title="Reject request"
                            >
                              <FiX size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={styles.pagination}>
            <span style={styles.pageMeta}>
              Showing {paged.length} of {filtered.length}
            </span>
            <div style={styles.pageControls}>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                style={{ ...styles.pageButton, opacity: safePage === 1 ? 0.45 : 1 }}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                style={{
                  ...styles.pageButton,
                  opacity: safePage === totalPages ? 0.45 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </TableShell>
      )}

      {showDetail && selectedRequest && (
        <Modal
          title={selectedRequest.entityName}
          subtitle={`${ENTITY_TYPES[selectedRequest.entityType]?.label || 'Entity'} verification request`}
          onClose={() => {
            setShowDetail(false);
            setSelectedRequest(null);
          }}
          width={680}
          footer={
            selectedRequest.status === 'pending' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetail(false);
                    openReject(selectedRequest);
                  }}
                  disabled={processing}
                  style={{ ...ghostButton, color: colors.danger }}
                >
                  <FiX size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing}
                  style={{ ...primaryButton, opacity: processing ? 0.65 : 1 }}
                >
                  <FiCheckCircle size={14} /> {processing ? 'Approving...' : 'Approve and issue blue tick'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowDetail(false);
                  setSelectedRequest(null);
                }}
                style={ghostButton}
              >
                Close
              </button>
            )
          }
        >
          <div style={styles.detailBody}>
            <div style={styles.detailHero}>
              <div style={styles.detailAvatarWrap}>
                {selectedRequest.entityImage ? (
                  <img src={selectedRequest.entityImage} alt="" style={styles.detailAvatar} />
                ) : (
                  <span style={styles.detailAvatarFallback}>
                    {initials(selectedRequest.entityName)}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.detailNameRow}>
                  <span style={styles.detailName}>{selectedRequest.entityName}</span>
                  {(selectedRequest.entityVerified || selectedRequest.status === 'approved') && (
                    <BlueTick size={18} title="Blue tick verified" />
                  )}
                </div>
                <div style={styles.detailMetaRow}>
                  <StatusBadge status={selectedRequest.status} />
                  <span style={badgeStyle(ENTITY_TYPES[selectedRequest.entityType]?.tone)}>
                    {ENTITY_TYPES[selectedRequest.entityType]?.label}
                  </span>
                  {selectedRequest.location && (
                    <span style={styles.detailLocation}>
                      <FiMapPin size={11} /> {selectedRequest.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <div style={styles.detailCardTitle}>Entity details</div>
                <div style={styles.kv}>
                  <span>Name</span>
                  <strong>{selectedRequest.entityName}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Category</span>
                  <strong>{selectedRequest.entity?.category || selectedRequest.entity?.type || '-'}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Phone</span>
                  <strong>{selectedRequest.entity?.phone || selectedRequest.ownerPhone || '-'}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Location</span>
                  <strong>{selectedRequest.location || '-'}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Entity ID</span>
                  <strong style={styles.mono}>{selectedRequest.business_id || '-'}</strong>
                </div>
              </div>

              <div style={styles.detailCard}>
                <div style={styles.detailCardTitle}>Owner details</div>
                <div style={styles.kv}>
                  <span>Owner</span>
                  <strong style={styles.inlineStrong}>
                    {selectedRequest.ownerName}
                    {selectedRequest.ownerVerified && <BlueTick size={12} title="Verified owner" />}
                  </strong>
                </div>
                <div style={styles.kv}>
                  <span>Email</span>
                  <strong>{selectedRequest.owner?.email || selectedRequest.requester?.email || '-'}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Phone</span>
                  <strong>{selectedRequest.ownerPhone || '-'}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Blue tick</span>
                  <strong>{selectedRequest.ownerVerified ? 'Active' : 'Not active'}</strong>
                </div>
                <div style={styles.kv}>
                  <span>Owner ID</span>
                  <strong style={styles.mono}>{selectedRequest.ownerId || '-'}</strong>
                </div>
              </div>
            </div>

            <div style={styles.blueTickCard}>
              <div style={styles.blueTickIcon}>
                <BlueTick size={24} />
              </div>
              <div>
                <div style={styles.blueTickTitle}>Blue tick policy</div>
                <div style={styles.blueTickText}>
                  Approval sets the entity as verified and marks the owner and requester as
                  blue-tick verified. Mobile renders the blue check next to the author name on
                  posts and featured cards. Rejecting removes the tick only when the owner has no
                  other approved verification.
                </div>
              </div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.detailCardTitle}>Request details</div>
              <div style={styles.kv}>
                <span>Verification type</span>
                <strong>{selectedRequest.verification_type || '-'}</strong>
              </div>
              <div style={styles.kv}>
                <span>Submitted</span>
                <strong>{formatDate(selectedRequest.submitted_at)}</strong>
              </div>
              <div style={styles.kv}>
                <span>Reviewed</span>
                <strong>{formatDate(selectedRequest.reviewed_at)}</strong>
              </div>
              <div style={styles.kv}>
                <span>Reviewer</span>
                <strong>{selectedRequest.reviewer?.full_name || selectedRequest.reviewed_by || '-'}</strong>
              </div>
            </div>

            {selectedRequest.notes && (
              <div style={styles.notesCard}>
                <div style={styles.notesTitle}>Reviewer notes</div>
                <div style={styles.notesText}>{selectedRequest.notes}</div>
              </div>
            )}

            <Notice tone="primary">
              Document collection and third-party identity checks are not part of this page yet.
              This workflow controls entity verification, owner blue ticks and approval mode.
            </Notice>
          </div>
        </Modal>
      )}

      {rejectTarget && (
        <Modal
          title="Reject verification"
          subtitle={`Reject ${rejectTarget.entityName} and record the reason.`}
          onClose={() => {
            setRejectTarget(null);
            setRejectionReason('');
          }}
          width={480}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectionReason('');
                }}
                style={ghostButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                style={{
                  ...ghostButton,
                  color: colors.danger,
                  opacity: processing || !rejectionReason.trim() ? 0.55 : 1,
                }}
              >
                <FiX size={14} /> {processing ? 'Rejecting...' : 'Reject request'}
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Reason" hint="This is stored on the verification request.">
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Explain why this verification was rejected..."
                style={{ ...input, minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>
            <Notice tone="danger">
              Rejecting removes entity verification and may remove the owner's blue tick if no
              other approved verification exists.
            </Notice>
          </div>
        </Modal>
      )}

      {autoConfirm && (
        <ConfirmDialog
          title="Approve all pending requests?"
          description={`This will approve ${stats.pending} pending verification request${
            stats.pending === 1 ? '' : 's'
          }, mark each entity verified and issue blue ticks to the linked owners.`}
          confirmLabel="Approve pending"
          tone="primary"
          loading={processing}
          onConfirm={handleAutoApprove}
          onClose={() => setAutoConfirm(false)}
        />
      )}
    </div>
  );
}

const styles = {
  modeRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  modeCopy: {
    maxWidth: 700,
  },
  modeTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
  },
  modeText: {
    marginTop: 5,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 1.6,
  },
  modeActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  segmented: {
    display: 'flex',
    gap: 4,
    padding: 4,
    borderRadius: radii.md,
    background: colors.bgSoft,
    border: `1px solid ${colors.border}`,
  },
  segmentButton: {
    padding: '7px 13px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: 'transparent',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  segmentButtonActive: {
    background: colors.primarySoft,
    border: `1px solid ${colors.primaryBorder}`,
    color: colors.text,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  typeTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  typeTab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 12px',
    borderRadius: radii.pill,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  typeTabActive: {
    background: colors.primarySoft,
    border: `1px solid ${colors.primaryBorder}`,
    color: colors.text,
  },
  typeCount: {
    padding: '1px 6px',
    borderRadius: radii.pill,
    background: 'rgba(255,255,255,0.08)',
    fontSize: 9,
    color: colors.textDim,
  },
  resultMeta: {
    marginLeft: 'auto',
    fontSize: 10,
    color: colors.textDim,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 850,
  },
  entityCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    background: colors.surfaceAlt,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    fontSize: 11,
    fontWeight: 800,
    color: colors.primary,
  },
  entityText: {
    minWidth: 0,
  },
  entityNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  entityName: {
    fontSize: 11.5,
    fontWeight: 700,
    color: colors.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  entityMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textDim,
  },
  ownerCell: {
    minWidth: 0,
  },
  ownerNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  ownerName: {
    fontSize: 11.5,
    fontWeight: 600,
    color: colors.text,
  },
  ownerMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textDim,
  },
  dateCell: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dateSub: {
    marginTop: 2,
    fontSize: 9.5,
    color: colors.textDim,
  },
  rowActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 5,
  },
  iconButton: {
    width: 28,
    height: 28,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
    color: colors.textMuted,
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    borderTop: `1px solid ${colors.border}`,
  },
  pageMeta: {
    fontSize: 10,
    color: colors.textDim,
  },
  pageControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    padding: '7px 11px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
    color: colors.text,
    fontSize: 10.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: 10,
    color: colors.textMuted,
  },
  detailBody: {
    display: 'grid',
    gap: 14,
  },
  detailHero: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radii.lg,
    background: colors.bgSoft,
    border: `1px solid ${colors.border}`,
  },
  detailAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: 'hidden',
    background: colors.surfaceAlt,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  detailAvatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailAvatarFallback: {
    fontSize: 18,
    fontWeight: 800,
    color: colors.primary,
  },
  detailNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  detailName: {
    fontSize: 17,
    fontWeight: 800,
  },
  detailMetaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  detailLocation: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: colors.textDim,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  detailCard: {
    padding: 14,
    borderRadius: radii.md,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
  },
  detailCardTitle: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: 9,
  },
  kv: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: '6px 0',
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  inlineStrong: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: colors.text,
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 9.5,
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  blueTickCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    background: colors.primarySoft,
    border: `1px solid ${colors.primaryBorder}`,
  },
  blueTickIcon: {
    flexShrink: 0,
  },
  blueTickTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: colors.text,
  },
  blueTickText: {
    marginTop: 4,
    fontSize: 10.5,
    color: colors.textMuted,
    lineHeight: 1.6,
  },
  notesCard: {
    padding: 14,
    borderRadius: radii.md,
    background: colors.dangerSoft,
    border: `1px solid rgba(231,76,60,0.3)`,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.danger,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.6,
  },
};
