import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiImage,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiRefreshCw,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTrash2,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { db } from '../lib/db';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  badgeStyle,
  colors,
  dangerButton,
  formatNumber,
  ghostButton,
  initials,
  input,
  primaryButton,
  radii,
  timeAgo,
} from '../lib/theme';
import {
  ConfirmDialog,
  Drawer,
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
  Toggle,
  Toolbar,
} from '../components/ui';

const TABS = [
  { key: 'providers', label: 'Individual providers', short: 'Providers', table: 'individual_providers', icon: FiUser },
  { key: 'institutions', label: 'Institutions', short: 'Institutions', table: 'institutions', icon: FiBriefcase },
  { key: 'shops', label: 'Shops', short: 'Shops', table: 'shops', icon: FiShoppingBag },
];

const EMPTY_FORM = {
  full_name: '',
  display_name: '',
  profession: '',
  specialty: '',
  phone: '',
  email: '',
  city: '',
  area: '',
  address: '',
  bio: '',
  website: '',
  name: '',
  type: '',
  description: '',
  category: '',
  district: '',
  discount_percentage: '',
  is_verified: false,
  is_active: true,
  is_available_for_hire: true,
  is_open: true,
  is_anchor_partner: false,
};

const selectStyle = {
  ...input,
  width: 'auto',
  minWidth: 145,
  cursor: 'pointer',
};

function nameOf(item, tab) {
  if (!item) return 'Unnamed business';
  if (tab === 'providers') return item.full_name || item.display_name || item.email || 'Unnamed provider';
  return item.name || 'Unnamed business';
}

function subtitleOf(item, tab) {
  if (!item) return '';
  if (tab === 'providers') return item.display_name || item.profession || item.specialty || 'Individual provider';
  if (tab === 'institutions') return item.type || 'Institution';
  return item.category || item.business_type || 'Shop';
}

function imageOf(item, tab) {
  if (!item) return '';
  if (tab === 'providers') return item.profile_image || '';
  if (tab === 'institutions') return item.logo || item.cover_image || '';
  return item.logo_url || item.banner_url || '';
}

function locationOf(item) {
  if (!item) return '—';
  return [item.city, item.area, item.district, item.address].filter(Boolean).join(', ') || '—';
}

function isActive(item, tab) {
  if (!item) return false;
  if (tab === 'providers') return item.is_active !== false;
  return item.is_open !== false;
}

function statusOf(item, tab) {
  if (!item) return { label: 'Unknown', tone: 'neutral' };
  if (!item.is_verified) return { label: 'Pending', tone: 'warning' };
  if (!isActive(item, tab)) return { label: 'Suspended', tone: 'danger' };
  if (tab === 'providers' && item.is_available_for_hire) return { label: 'Available', tone: 'success' };
  if (tab === 'shops' && item.is_anchor_partner) return { label: 'Partner', tone: 'primary' };
  if (tab === 'shops' && item.is_open === false) return { label: 'Closed', tone: 'warning' };
  return { label: tab === 'institutions' ? 'Open' : 'Active', tone: 'success' };
}

function ratingOf(item, reviews) {
  const rating = Number(item?.rating ?? 0);
  if (rating) return rating;
  if (!reviews?.length) return 0;
  return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
}

function reviewCountOf(item, reviews) {
  return Number(item?.review_count ?? reviews?.length ?? 0);
}

export default function Businesses() {
  const { formatMoney, dataSourceLabel } = useAppSettings();
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [shops, setShops] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [providerServices, setProviderServices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const pageSize = 10;
  const tabConfig = TABS.find((entry) => entry.key === tab) || TABS[0];
  const items = tab === 'providers' ? providers : tab === 'institutions' ? institutions : shops;

  const flash = (tone, text) => setNotice({ tone, text });

  const setItems = (updater) => {
    if (tab === 'providers') setProviders(updater);
    else if (tab === 'institutions') setInstitutions(updater);
    else setShops(updater);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        db('individual_providers').select('*').order('created_at', { ascending: false }).limit(1500),
        db('institutions').select('*').order('created_at', { ascending: false }).limit(1500),
        db('shops').select('*').order('created_at', { ascending: false }).limit(1500),
        db('reviews').select('*').order('created_at', { ascending: false }).limit(4000),
        db('shop_products').select('*').limit(4000),
        db('provider_services').select('*').limit(4000),
        db('business_documents').select('*').order('uploaded_at', { ascending: false }).limit(3000),
        db('catalog').select('id,name,category,images,price').limit(3000),
        db('service_catalog').select('id,name,category,images,duration').limit(3000),
        db('users').select('id,full_name,email,avatar_url').limit(3000),
      ]);

      const [
        providerResult,
        institutionResult,
        shopResult,
        reviewResult,
        productResult,
        serviceResult,
        documentResult,
        catalogResult,
        catalogServiceResult,
        userResult,
      ] = results;

      setProviders(providerResult.data || []);
      setInstitutions(institutionResult.data || []);
      setShops(shopResult.data || []);
      setReviews(reviewResult.data || []);
      setShopProducts(productResult.data || []);
      setProviderServices(serviceResult.data || []);
      setDocuments(documentResult.data || []);
      setCatalog(catalogResult.data || []);
      setServices(catalogServiceResult.data || []);
      setUsers(userResult.data || []);

      const errors = results.map((result) => result.error).filter(Boolean);
      if (errors.length) {
        flash('warning', `Some business data could not be loaded: ${errors[0].message}`);
      }
    } catch (error) {
      flash('danger', error.message || 'Could not load businesses.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelected(null);
    setPage(1);
    setStatusFilter('all');
  }, [tab]);

  useEffect(() => {
    setDetailTab('overview');
  }, [selected?.id]);

  const reviewsByBusiness = useMemo(() => {
    const map = new Map();
    reviews.forEach((review) => {
      if (!review.business_id) return;
      if (!map.has(review.business_id)) map.set(review.business_id, []);
      map.get(review.business_id).push(review);
    });
    return map;
  }, [reviews]);

  const documentsByBusiness = useMemo(() => {
    const map = new Map();
    documents.forEach((document) => {
      if (!document.business_id) return;
      if (!map.has(document.business_id)) map.set(document.business_id, []);
      map.get(document.business_id).push(document);
    });
    return map;
  }, [documents]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((member) => map.set(member.id, member));
    return map;
  }, [users]);

  const catalogMap = useMemo(() => {
    const map = new Map();
    catalog.forEach((item) => map.set(item.id, item));
    return map;
  }, [catalog]);

  const serviceMap = useMemo(() => {
    const map = new Map();
    services.forEach((item) => map.set(item.id, item));
    return map;
  }, [services]);

  const stats = useMemo(() => {
    const all = [...providers, ...institutions, ...shops];
    return {
      providers: providers.length,
      institutions: institutions.length,
      shops: shops.length,
      verified: all.filter((item) => item.is_verified).length,
      active: all.filter((item) => isActive(item, tab)).length,
      reviews: reviews.length,
    };
  }, [providers, institutions, shops, reviews, tab]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const haystack = [
          nameOf(item, tab),
          subtitleOf(item, tab),
          item.phone,
          item.email,
          item.city,
          item.area,
          item.district,
          item.address,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = !query || haystack.includes(query);
        const status = statusOf(item, tab).label.toLowerCase();
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'verified' && item.is_verified) ||
          (statusFilter === 'pending' && !item.is_verified) ||
          (statusFilter === 'active' && isActive(item, tab)) ||
          (statusFilter === 'inactive' && !isActive(item, tab)) ||
          statusFilter === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === 'name') return nameOf(a, tab).localeCompare(nameOf(b, tab));
        if (sort === 'rating') {
          return ratingOf(b, reviewsByBusiness.get(b.id)) - ratingOf(a, reviewsByBusiness.get(a.id));
        }
        if (sort === 'reviews') {
          return reviewCountOf(b, reviewsByBusiness.get(b.id)) - reviewCountOf(a, reviewsByBusiness.get(a.id));
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [items, tab, search, statusFilter, sort, reviewsByBusiness]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      ...EMPTY_FORM,
      ...item,
      discount_percentage: item.discount_percentage ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      let payload;
      if (tab === 'providers') {
        payload = {
          full_name: form.full_name?.trim() || null,
          display_name: form.display_name?.trim() || null,
          profession: form.profession?.trim() || null,
          specialty: form.specialty?.trim() || null,
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          city: form.city?.trim() || null,
          address: form.address?.trim() || null,
          bio: form.bio?.trim() || null,
          website: form.website?.trim() || null,
          is_verified: Boolean(form.is_verified),
          is_active: Boolean(form.is_active),
          is_available_for_hire: Boolean(form.is_available_for_hire),
        };
      } else if (tab === 'institutions') {
        payload = {
          name: form.name?.trim() || null,
          type: form.type?.trim() || null,
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          website: form.website?.trim() || null,
          city: form.city?.trim() || null,
          area: form.area?.trim() || null,
          address: form.address?.trim() || null,
          description: form.description?.trim() || null,
          is_open: Boolean(form.is_open),
          is_verified: Boolean(form.is_verified),
        };
      } else {
        payload = {
          name: form.name?.trim() || null,
          category: form.category?.trim() || null,
          phone: form.phone?.trim() || null,
          city: form.city?.trim() || null,
          district: form.district?.trim() || null,
          address: form.address?.trim() || null,
          description: form.description?.trim() || null,
          discount_percentage:
            form.discount_percentage === '' || form.discount_percentage === null
              ? null
              : Number(form.discount_percentage),
          is_open: Boolean(form.is_open),
          is_active: Boolean(form.is_open),
          is_verified: Boolean(form.is_verified),
          is_anchor_partner: Boolean(form.is_anchor_partner),
        };
      }

      const { data, error } = await db(tabConfig.table)
        .update(payload)
        .eq('id', selected.id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(error.message);
      const updated = data || { ...selected, ...payload };
      setItems((current) => current.map((item) => (item.id === selected.id ? updated : item)));
      setSelected(updated);
      setFormOpen(false);
      flash('success', `${nameOf(updated, tab)} updated.`);
    } catch (error) {
      flash('danger', error.message || 'Could not save this business.');
    }
    setSaving(false);
  };

  const patchBusiness = async (item, payload, successText) => {
    const { data, error } = await db(tabConfig.table)
      .update(payload)
      .eq('id', item.id)
      .select('*')
      .maybeSingle();
    if (error) {
      flash('danger', error.message);
    } else {
      const updated = data || { ...item, ...payload };
      setItems((current) => current.map((row) => (row.id === item.id ? updated : row)));
      setSelected((current) => (current?.id === item.id ? updated : current));
      flash('success', successText || `${nameOf(updated, tab)} updated.`);
    }
  };

  const toggleVerified = (item) =>
    patchBusiness(
      item,
      { is_verified: !item.is_verified },
      `${nameOf(item, tab)} is now ${item.is_verified ? 'pending' : 'verified'}.`
    );

  const toggleActive = (item) => {
    const next = !isActive(item, tab);
    const payload =
      tab === 'providers'
        ? { is_active: next }
        : tab === 'institutions'
          ? { is_open: next }
          : { is_open: next, is_active: next };
    return patchBusiness(
      item,
      payload,
      `${nameOf(item, tab)} is now ${next ? 'active' : 'suspended'}.`
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await db(tabConfig.table).delete().eq('id', deleteTarget.id);
    if (error) {
      flash('danger', error.message);
    } else {
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      flash('success', `${nameOf(deleteTarget, tab)} deleted.`);
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const toggleDocument = async (document) => {
    const next = !document.is_verified;
    const { error } = await db('business_documents')
      .update({
        is_verified: next,
        status: next ? 'verified' : 'pending',
        verified_at: next ? new Date().toISOString() : null,
      })
      .eq('id', document.id);
    if (error) {
      flash('danger', error.message);
      return;
    }
    setDocuments((current) =>
      current.map((entry) =>
        entry.id === document.id
          ? { ...entry, is_verified: next, status: next ? 'verified' : 'pending' }
          : entry
      )
    );
    flash('success', `Document ${next ? 'verified' : 'marked pending'}.`);
  };

  const exportCsv = () => {
    const header = ['Name', 'Type', 'Location', 'Phone', 'Email', 'Rating', 'Reviews', 'Status', 'Created'];
    const lines = filtered.map((item) => {
      const reviewsForItem = reviewsByBusiness.get(item.id) || [];
      const status = statusOf(item, tab);
      return [
        nameOf(item, tab),
        subtitleOf(item, tab),
        locationOf(item),
        item.phone || '',
        item.email || '',
        ratingOf(item, reviewsForItem).toFixed(1),
        reviewCountOf(item, reviewsForItem),
        status.label,
        item.created_at || '',
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `munolink-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    flash('success', `${tabConfig.short} exported to CSV.`);
  };

  const selectedReviews = selected ? reviewsByBusiness.get(selected.id) || [] : [];
  const selectedDocuments = selected ? documentsByBusiness.get(selected.id) || [] : [];
  const selectedOfferings = selected
    ? tab === 'shops'
      ? shopProducts.filter((product) => product.shop_id === selected.id)
      : tab === 'providers'
        ? providerServices.filter((service) => service.user_id === selected.id)
        : providerServices.filter((service) => service.institution_id === selected.id)
    : [];

  return (
    <div style={{ padding: '30px 32px' }}>
      <PageHeader
        eyebrow="Community / Businesses"
        title="Businesses"
        subtitle="Manage providers, institutions and shops with verification, visibility and offering controls."
        actions={
          <>
            <button type="button" onClick={exportCsv} style={ghostButton}>
              <FiDownload size={14} /> Export CSV
            </button>
            <button type="button" onClick={fetchData} style={ghostButton} disabled={loading}>
              <FiRefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      {notice ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={FiUser} label="Providers" value={formatNumber(stats.providers)} detail="Individual service pros" tone="primary" />
        <StatCard icon={FiBriefcase} label="Institutions" value={formatNumber(stats.institutions)} detail="Organizations and clinics" tone="purple" />
        <StatCard icon={FiShoppingBag} label="Shops" value={formatNumber(stats.shops)} detail="Storefronts and pharmacies" tone="teal" />
        <StatCard icon={FiShield} label="Verified" value={formatNumber(stats.verified)} detail="Trusted business profiles" tone="success" />
        <StatCard icon={FiActivity} label="Reviews" value={formatNumber(stats.reviews)} detail={`${formatNumber(stats.active)} active businesses`} tone="warning" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const count = entry.key === 'providers' ? providers.length : entry.key === 'institutions' ? institutions.length : shops.length;
          const active = tab === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: radii.md,
                border: `1px solid ${active ? colors.primaryBorder : colors.border}`,
                background: active ? colors.primarySoft : colors.surface,
                color: active ? colors.primary : colors.textMuted,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Icon size={14} /> {entry.label} ({count})
            </button>
          );
        })}
        <span style={{ ...badgeStyle('neutral'), marginLeft: 'auto', alignSelf: 'center' }}>
          {dataSourceLabel}
        </span>
      </div>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name, contact, city…"
          style={{ flex: 1, minWidth: 240 }}
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">All status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Suspended</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} style={selectStyle}>
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Highest rated</option>
          <option value="reviews">Most reviewed</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>
          {formatNumber(filtered.length)} businesses
        </span>
      </Toolbar>

      {loading ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
          Loading businesses…
        </div>
      ) : paged.length === 0 ? (
        <div style={cardStyle}>
          <EmptyState
            icon={tabConfig.icon}
            title={`No ${tabConfig.short.toLowerCase()} match your filters`}
            description="Try a different search or status filter."
          />
        </div>
      ) : (
        <TableShell>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th>Location</Th>
                <Th>Rating</Th>
                {tab === 'shops' ? <Th>Wallet</Th> : null}
                <Th>Status</Th>
                <Th>Created</Th>
                <Th style={{ textAlign: 'right' }}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => {
                const reviewsForItem = reviewsByBusiness.get(item.id) || [];
                const status = statusOf(item, tab);
                const image = imageOf(item, tab);
                const rating = ratingOf(item, reviewsForItem);
                const reviewCount = reviewCountOf(item, reviewsForItem);
                return (
                  <tr key={item.id} onClick={() => setSelected(item)} style={{ cursor: 'pointer' }} className="table-row">
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={thumbStyle}>
                          {image ? (
                            <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials(nameOf(item, tab))
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                            {nameOf(item, tab)}
                          </div>
                          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                            {subtitleOf(item, tab)}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: colors.textMuted }}>
                        <FiMapPin size={11} /> {locationOf(item)}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FiStar size={11} color={colors.warning} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{rating.toFixed(1)}</span>
                        <span style={{ fontSize: 9.5, color: colors.textDim }}>({formatNumber(reviewCount)})</span>
                      </div>
                    </Td>
                    {tab === 'shops' ? (
                      <Td>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{formatMoney(item.wallet_balance)}</span>
                      </Td>
                    ) : null}
                    <Td><span style={badgeStyle(status.tone)}>{status.label}</span></Td>
                    <Td><span style={{ fontSize: 10.5, color: colors.textMuted }}>{timeAgo(item.created_at)}</span></Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 5 }} onClick={(event) => event.stopPropagation()}>
                        <IconButton title="View" onClick={() => setSelected(item)}><FiExternalLink size={13} /></IconButton>
                        <IconButton title={item.is_verified ? 'Mark pending' : 'Verify'} onClick={() => toggleVerified(item)}>
                          <FiCheckCircle size={13} />
                        </IconButton>
                        <IconButton title={isActive(item, tab) ? 'Suspend' : 'Activate'} onClick={() => toggleActive(item)}>
                          <FiActivity size={13} />
                        </IconButton>
                        <IconButton title="Edit" onClick={() => openEdit(item)}><FiEdit2 size={13} /></IconButton>
                        <IconButton title="Delete" tone="danger" onClick={() => setDeleteTarget(item)}><FiTrash2 size={13} /></IconButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      )}

      {filtered.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: 10.5, color: colors.textMuted }}>
            Page {currentPage} of {totalPages} · {formatNumber(filtered.length)} businesses
          </span>
          <div style={{ display: 'flex', gap: 7 }}>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1} style={{ ...ghostButton, padding: '7px 12px', opacity: currentPage <= 1 ? 0.5 : 1 }}>
              Previous
            </button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages} style={{ ...ghostButton, padding: '7px 12px', opacity: currentPage >= totalPages ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <Drawer
          title={nameOf(selected, tab)}
          subtitle={`${subtitleOf(selected, tab)} · ${locationOf(selected)}`}
          onClose={() => setSelected(null)}
          width={640}
          footer={
            <>
              <button type="button" onClick={() => setDeleteTarget(selected)} style={dangerButton}>
                <FiTrash2 size={14} /> Delete
              </button>
              <button type="button" onClick={() => openEdit(selected)} style={primaryButton}>
                <FiEdit2 size={14} /> Edit business
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ ...thumbStyle, width: 68, height: 68, borderRadius: 16, fontSize: 20 }}>
              {imageOf(selected, tab) ? (
                <img src={imageOf(selected, tab)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials(nameOf(selected, tab))
              )}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
                <span style={badgeStyle(statusOf(selected, tab).tone)}>{statusOf(selected, tab).label}</span>
                <span style={badgeStyle(selected.is_verified ? 'success' : 'warning')}>
                  {selected.is_verified ? 'Verified' : 'Pending verification'}
                </span>
                {tab === 'shops' && selected.is_anchor_partner ? <span style={badgeStyle('primary')}>Anchor partner</span> : null}
              </div>
              <div style={{ fontSize: 10.5, color: colors.textMuted, lineHeight: 1.5 }}>
                Created {timeAgo(selected.created_at)} · {reviewCountOf(selected, selectedReviews)} reviews
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'offerings', label: `Offerings (${selectedOfferings.length})` },
              { key: 'reviews', label: `Reviews (${selectedReviews.length})` },
              { key: 'documents', label: `Documents (${selectedDocuments.length})` },
            ].map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setDetailTab(entry.key)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 9,
                  border: `1px solid ${detailTab === entry.key ? colors.primaryBorder : colors.border}`,
                  background: detailTab === entry.key ? colors.primarySoft : colors.transparent,
                  color: detailTab === entry.key ? colors.primary : colors.textMuted,
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {detailTab === 'overview' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 16 }}>
                <DetailTile icon={FiPhone} label="Phone" value={selected.phone || 'Not set'} />
                <DetailTile icon={FiGlobe} label="Email" value={selected.email || 'Not set'} />
                <DetailTile icon={FiMapPin} label="Location" value={locationOf(selected)} />
                <DetailTile icon={FiStar} label="Rating" value={`${ratingOf(selected, selectedReviews).toFixed(1)} / 5`} />
                {tab === 'shops' ? (
                  <DetailTile icon={FiPackage} label="Wallet" value={formatMoney(selected.wallet_balance)} />
                ) : (
                  <DetailTile icon={FiUsers} label="Reviews" value={formatNumber(reviewCountOf(selected, selectedReviews))} />
                )}
                <DetailTile icon={FiClock} label="Joined" value={selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'} />
              </div>

              <SectionTitle icon={FiFileText} title="About" />
              <p style={{ margin: '0 0 16px', fontSize: 11.5, color: colors.textMuted, lineHeight: 1.65 }}>
                {selected.bio || selected.description || 'No description has been added yet.'}
              </p>

              {selected.website ? (
                <>
                  <SectionTitle icon={FiGlobe} title="Website" />
                  <a href={selected.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.primary, marginBottom: 16 }}>
                    {selected.website} <FiExternalLink size={11} />
                  </a>
                </>
              ) : null}

              <SectionTitle icon={FiShield} title="Controls" />
              <div style={{ display: 'grid', gap: 8 }}>
                <Toggle
                  checked={Boolean(selected.is_verified)}
                  onChange={() => toggleVerified(selected)}
                  label="Verified business"
                  description="Verified profiles carry a trust badge across Munolink."
                />
                <Toggle
                  checked={isActive(selected, tab)}
                  onChange={() => toggleActive(selected)}
                  label="Active and visible"
                  description="Suspended businesses stay in the admin console but are hidden from members."
                />
                {tab === 'providers' ? (
                  <Toggle
                    checked={Boolean(selected.is_available_for_hire)}
                    onChange={() => patchBusiness(selected, { is_available_for_hire: !selected.is_available_for_hire })}
                    label="Available for hire"
                    description="Shows the provider as accepting new work."
                  />
                ) : null}
                {tab === 'shops' ? (
                  <Toggle
                    checked={Boolean(selected.is_anchor_partner)}
                    onChange={() => patchBusiness(selected, { is_anchor_partner: !selected.is_anchor_partner })}
                    label="Anchor partner"
                    description="Highlights this shop as a strategic Munolink partner."
                  />
                ) : null}
              </div>
            </>
          ) : null}

          {detailTab === 'offerings' ? (
            selectedOfferings.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedOfferings.map((offering) => {
                  const item = tab === 'shops' ? catalogMap.get(offering.catalog_id) : serviceMap.get(offering.service_id);
                  const image = item?.images?.[0];
                  return (
                    <div key={offering.id} style={{ ...cardStyle, padding: 11, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ ...thumbStyle, width: 38, height: 38 }}>
                        {image ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiImage size={15} color={colors.textDim} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700 }}>{item?.name || 'Untitled offering'}</div>
                        <div style={{ fontSize: 9.5, color: colors.textMuted }}>
                          {item?.category || 'General'} {item?.duration ? `· ${item.duration}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{formatMoney(offering.price ?? item?.price)}</div>
                        <span style={badgeStyle(offering.in_stock === false || offering.is_active === false ? 'danger' : 'success')}>
                          {offering.in_stock === false || offering.is_active === false ? 'Unavailable' : 'Available'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={FiPackage} title="No offerings yet" description="Products and services linked to this business will appear here." />
            )
          ) : null}

          {detailTab === 'reviews' ? (
            selectedReviews.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedReviews.map((review) => {
                  const customer = userMap.get(review.customer_id);
                  return (
                    <div key={review.id} style={{ ...cardStyle, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={avatarStyle}>{customer?.avatar_url ? <img src={customer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(customer?.full_name || 'M')}</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{customer?.full_name || 'Munolink member'}</div>
                            <div style={{ fontSize: 9.5, color: colors.textDim }}>{timeAgo(review.created_at)}</div>
                          </div>
                        </div>
                        <span style={badgeStyle(review.rating >= 4 ? 'success' : review.rating >= 3 ? 'warning' : 'danger')}>
                          <FiStar size={9} /> {Number(review.rating || 0).toFixed(1)}
                        </span>
                      </div>
                      {review.title ? <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700 }}>{review.title}</div> : null}
                      <p style={{ margin: '5px 0 0', fontSize: 10.5, color: colors.textMuted, lineHeight: 1.6 }}>
                        {review.comment || 'No comment'}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={FiStar} title="No reviews yet" description="Customer reviews for this business will appear here." />
            )
          ) : null}

          {detailTab === 'documents' ? (
            selectedDocuments.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDocuments.map((document) => (
                  <div key={document.id} style={{ ...cardStyle, padding: 11, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...thumbStyle, width: 36, height: 36 }}>
                      <FiFileText size={15} color={colors.textMuted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {document.file_name || document.document_type}
                      </div>
                      <div style={{ fontSize: 9.5, color: colors.textMuted }}>
                        {document.document_type || 'Document'} · {timeAgo(document.uploaded_at)}
                      </div>
                    </div>
                    <span style={badgeStyle(document.is_verified ? 'success' : 'warning')}>
                      {document.is_verified ? 'Verified' : 'Pending'}
                    </span>
                    <button type="button" onClick={() => toggleDocument(document)} style={iconButtonStyle} title={document.is_verified ? 'Mark pending' : 'Verify document'}>
                      <FiCheckCircle size={13} />
                    </button>
                    {document.file_url ? (
                      <a href={document.file_url} target="_blank" rel="noreferrer" style={{ ...iconButtonStyle, textDecoration: 'none' }} title="Open document">
                        <FiExternalLink size={13} />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FiFileText} title="No documents" description="Verification documents uploaded by this business will appear here." />
            )
          ) : null}
        </Drawer>
      ) : null}

      {formOpen ? (
        <Modal
          title={`Edit ${nameOf(selected, tab)}`}
          subtitle="Update the business profile and visibility controls."
          onClose={() => setFormOpen(false)}
          width={720}
          footer={
            <>
              <button type="button" onClick={() => setFormOpen(false)} style={ghostButton}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save business'}
              </button>
            </>
          }
        >
          {tab === 'providers' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              <Field label="Full name">
                <input value={form.full_name || ''} onChange={(event) => setForm({ ...form, full_name: event.target.value })} style={input} />
              </Field>
              <Field label="Display name">
                <input value={form.display_name || ''} onChange={(event) => setForm({ ...form, display_name: event.target.value })} style={input} />
              </Field>
              <Field label="Profession">
                <input value={form.profession || ''} onChange={(event) => setForm({ ...form, profession: event.target.value })} style={input} />
              </Field>
              <Field label="Specialty">
                <input value={form.specialty || ''} onChange={(event) => setForm({ ...form, specialty: event.target.value })} style={input} />
              </Field>
              <Field label="Phone">
                <input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} style={input} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} style={input} />
              </Field>
              <Field label="City">
                <input value={form.city || ''} onChange={(event) => setForm({ ...form, city: event.target.value })} style={input} />
              </Field>
              <Field label="Address">
                <input value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} style={input} />
              </Field>
              <Field label="Website">
                <input value={form.website || ''} onChange={(event) => setForm({ ...form, website: event.target.value })} style={input} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Bio">
                  <textarea value={form.bio || ''} onChange={(event) => setForm({ ...form, bio: event.target.value })} style={{ ...input, minHeight: 86, resize: 'vertical' }} />
                </Field>
              </div>
            </div>
          ) : tab === 'institutions' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              <Field label="Name">
                <input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} style={input} />
              </Field>
              <Field label="Type">
                <input value={form.type || ''} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="Clinic, school, SACCO…" style={input} />
              </Field>
              <Field label="Phone">
                <input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} style={input} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} style={input} />
              </Field>
              <Field label="Website">
                <input value={form.website || ''} onChange={(event) => setForm({ ...form, website: event.target.value })} style={input} />
              </Field>
              <Field label="City">
                <input value={form.city || ''} onChange={(event) => setForm({ ...form, city: event.target.value })} style={input} />
              </Field>
              <Field label="Area">
                <input value={form.area || ''} onChange={(event) => setForm({ ...form, area: event.target.value })} style={input} />
              </Field>
              <Field label="Address">
                <input value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} style={input} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Description">
                  <textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ ...input, minHeight: 86, resize: 'vertical' }} />
                </Field>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              <Field label="Name">
                <input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} style={input} />
              </Field>
              <Field label="Category">
                <input value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} style={input} />
              </Field>
              <Field label="Phone">
                <input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} style={input} />
              </Field>
              <Field label="City">
                <input value={form.city || ''} onChange={(event) => setForm({ ...form, city: event.target.value })} style={input} />
              </Field>
              <Field label="District">
                <input value={form.district || ''} onChange={(event) => setForm({ ...form, district: event.target.value })} style={input} />
              </Field>
              <Field label="Address">
                <input value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} style={input} />
              </Field>
              <Field label="Discount %">
                <input type="number" min="0" max="100" value={form.discount_percentage ?? ''} onChange={(event) => setForm({ ...form, discount_percentage: event.target.value })} style={input} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Description">
                  <textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ ...input, minHeight: 86, resize: 'vertical' }} />
                </Field>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <Toggle
              checked={Boolean(form.is_verified)}
              onChange={(checked) => setForm({ ...form, is_verified: checked })}
              label="Verified"
              description="Show the Munolink trust badge for this business."
            />
            <Toggle
              checked={tab === 'providers' ? Boolean(form.is_active) : Boolean(form.is_open)}
              onChange={(checked) =>
                setForm(
                  tab === 'providers'
                    ? { ...form, is_active: checked }
                    : { ...form, is_open: checked }
                )
              }
              label="Active and visible"
              description="Inactive businesses stay in the console but are hidden from members."
            />
            {tab === 'providers' ? (
              <Toggle
                checked={Boolean(form.is_available_for_hire)}
                onChange={(checked) => setForm({ ...form, is_available_for_hire: checked })}
                label="Available for hire"
                description="Shows the provider as accepting new work."
              />
            ) : null}
            {tab === 'shops' ? (
              <Toggle
                checked={Boolean(form.is_anchor_partner)}
                onChange={(checked) => setForm({ ...form, is_anchor_partner: checked })}
                label="Anchor partner"
                description="Highlight this shop as a strategic partner."
              />
            ) : null}
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete ${nameOf(deleteTarget, tab)}?`}
          description="This removes the business profile from the admin console. Related content and members are not deleted."
          confirmLabel="Delete business"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      ) : null}
    </div>
  );
}

function IconButton({ children, title, onClick, tone = 'neutral' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        ...iconButtonStyle,
        ...(tone === 'danger'
          ? { color: colors.danger, borderColor: 'rgba(231,76,60,0.25)', background: colors.dangerSoft }
          : null),
      }}
    >
      {children}
    </button>
  );
}

function DetailTile({ icon: Icon, label, value }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: radii.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {Icon ? <Icon size={10} /> : null} {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 700, lineHeight: 1.4, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <Icon size={13} color={colors.textMuted} />
      <span style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</span>
    </div>
  );
}

const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
};

const thumbStyle = {
  width: 42,
  height: 42,
  borderRadius: 11,
  overflow: 'hidden',
  background: colors.primarySoft,
  color: colors.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 800,
  flexShrink: 0,
};

const avatarStyle = {
  width: 27,
  height: 27,
  borderRadius: 999,
  background: colors.primarySoft,
  color: colors.primary,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 9,
  fontWeight: 800,
  overflow: 'hidden',
  flexShrink: 0,
};

const iconButtonStyle = {
  width: 27,
  height: 27,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.surfaceAlt,
  color: colors.textMuted,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
