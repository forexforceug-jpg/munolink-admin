import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBookmark,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiHeart,
  FiMessageCircle,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShield,
  FiShoppingBag,
  FiTrash2,
  FiUserPlus,
  FiCreditCard,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  badgeStyle,
  card,
  colors,
  dangerButton,
  formatMoney,
  formatNumber,
  ghostButton,
  initials,
  input,
  panel,
  primaryButton,
  radii,
  timeAgo,
} from '../lib/theme';

const PAGE_SIZE = 12;
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Content' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'wallet', label: 'Wallet & KYC' },
  { id: 'activity', label: 'Activity' },
  { id: 'shops', label: 'Shops' },
];

function asArray(result) {
  return Array.isArray(result?.data) ? result.data : [];
}

function isVerified(user) {
  return user?.kyc_verified === true || Number(user?.kyc_verified) === 1;
}

function roleTone(role = 'customer') {
  const value = String(role).toLowerCase();
  if (value === 'admin') return 'danger';
  if (value === 'provider') return 'purple';
  if (value === 'business' || value === 'shop') return 'teal';
  return 'primary';
}

function firstImage(item) {
  if (!item) return null;
  const source = item.video_thumbnail || item.images;
  if (Array.isArray(source)) return source[0] || null;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed.startsWith('http')) return trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed[0] || null;
      if (typeof parsed === 'string') return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function Avatar({ name, src, size = 38 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        background: colors.primarySoft,
        color: colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.34,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick, tone = 'neutral' }) {
  const tones = {
    neutral: { color: colors.textMuted, background: 'transparent' },
    primary: { color: colors.primary, background: colors.primarySoft },
    danger: { color: colors.danger, background: colors.dangerSoft },
    success: { color: colors.success, background: colors.successSoft },
  };
  const palette = tones[tone] ?? tones.neutral;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        border: `1px solid ${colors.border}`,
        background: palette.background,
        color: palette.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, footer, width = 520 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ ...card, width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <header style={{ padding: '18px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>{title}</h2>
            {subtitle ? <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>{subtitle}</p> : null}
          </div>
          <IconButton icon={FiX} label="Close" onClick={onClose} />
        </header>
        <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
        {footer ? <footer style={{ padding: '14px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>{footer}</footer> : null}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 13 }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

function MiniStat({ label, value, tone = 'primary', icon: Icon }) {
  const tones = {
    primary: { color: colors.primary, background: colors.primarySoft },
    success: { color: colors.success, background: colors.successSoft },
    purple: { color: colors.purple, background: colors.purpleSoft },
    pink: { color: colors.pink, background: colors.pinkSoft },
    warning: { color: colors.warning, background: colors.warningSoft },
    teal: { color: colors.teal, background: colors.tealSoft },
  };
  const palette = tones[tone] ?? tones.primary;
  return (
    <div style={{ ...panel, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: palette.color }}>
        {Icon ? <Icon size={13} /> : null}
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { dataSourceLabel } = useAppSettings();
  const [state, setState] = useState({
    loading: true,
    users: [],
    catalog: [],
    likes: [],
    saves: [],
    comments: [],
    follows: [],
    shops: [],
    transactions: [],
    warnings: [],
    refreshedAt: null,
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verification, setVerification] = useState('all');
  const [sortBy, setSortBy] = useState('engagement');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('overview');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifyUser, setNotifyUser] = useState(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [deleteUser, setDeleteUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const results = await Promise.all([
      db('users')
        .select(
          'id,email,phone_number,full_name,avatar_url,cover_url,bio,role,kyc_verified,wallet_balance,lifetime_savings,location_city,location_region,location_country,created_at'
        )
        .limit(1000),
      db('catalog')
        .select('id,user_id,name,category,price,price_type,images,video_thumbnail,view_count,like_count,save_count,comment_count,share_count,created_at,is_active,status')
        .limit(1000),
      db('likes').select('id,user_id,post_id,created_at').limit(1000),
      db('saves').select('id,user_id,post_id,created_at').limit(1000),
      db('comments').select('id,user_id,post_id,content,created_at').limit(1000),
      db('follows').select('id,follower_id,following_id,created_at').limit(1000),
      db('shops')
        .select('id,owner_id,name,category,city,logo_url,banner_url,rating,review_count,is_verified,is_active,created_at')
        .limit(1000),
      db('transactions').select('id,user_id,buyer_id,seller_id,amount,type,status,merchant,created_at').limit(1000),
    ]);

    const warnings = results
      .map((result, index) => (result?.error?.message ? `source ${index + 1}: ${result.error.message}` : null))
      .filter(Boolean);

    setState({
      loading: false,
      users: asArray(results[0]),
      catalog: asArray(results[1]),
      likes: asArray(results[2]),
      saves: asArray(results[3]),
      comments: asArray(results[4]),
      follows: asArray(results[5]),
      shops: asArray(results[6]),
      transactions: asArray(results[7]),
      warnings,
      refreshedAt: new Date(),
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, verification, sortBy]);

  const derived = useMemo(() => {
    const catalogByAuthor = new Map();
    const catalogById = new Map();
    for (const item of state.catalog) {
      catalogById.set(item.id, item);
      if (!item.user_id) continue;
      const list = catalogByAuthor.get(item.user_id) ?? [];
      list.push(item);
      catalogByAuthor.set(item.user_id, list);
    }

    const likesByPost = new Map();
    for (const like of state.likes) {
      const list = likesByPost.get(like.post_id) ?? [];
      list.push(like);
      likesByPost.set(like.post_id, list);
    }
    const savesByPost = new Map();
    for (const save of state.saves) {
      const list = savesByPost.get(save.post_id) ?? [];
      list.push(save);
      savesByPost.set(save.post_id, list);
    }
    const commentsByPost = new Map();
    for (const comment of state.comments) {
      const list = commentsByPost.get(comment.post_id) ?? [];
      list.push(comment);
      commentsByPost.set(comment.post_id, list);
    }

    const followersByUser = new Map();
    const followingByUser = new Map();
    for (const follow of state.follows) {
      const followers = followersByUser.get(follow.following_id) ?? [];
      followers.push(follow);
      followersByUser.set(follow.following_id, followers);
      const following = followingByUser.get(follow.follower_id) ?? [];
      following.push(follow);
      followingByUser.set(follow.follower_id, following);
    }

    const shopsByOwner = new Map();
    for (const shop of state.shops) {
      if (!shop.owner_id) continue;
      const list = shopsByOwner.get(shop.owner_id) ?? [];
      list.push(shop);
      shopsByOwner.set(shop.owner_id, list);
    }

    const transactionsByUser = new Map();
    for (const tx of state.transactions) {
      for (const id of new Set([tx.user_id, tx.buyer_id, tx.seller_id].filter(Boolean))) {
        const list = transactionsByUser.get(id) ?? [];
        list.push(tx);
        transactionsByUser.set(id, list);
      }
    }

    const rows = state.users.map((user) => {
      const posts = catalogByAuthor.get(user.id) ?? [];
      const likesReceived = posts.reduce((sum, post) => sum + (likesByPost.get(post.id)?.length || 0), 0);
      const savesReceived = posts.reduce((sum, post) => sum + (savesByPost.get(post.id)?.length || 0), 0);
      const commentsReceived = posts.reduce((sum, post) => sum + (commentsByPost.get(post.id)?.length || 0), 0);
      const followers = followersByUser.get(user.id)?.length || 0;
      const following = followingByUser.get(user.id)?.length || 0;
      const shops = shopsByOwner.get(user.id) ?? [];
      const transactions = transactionsByUser.get(user.id) ?? [];
      return {
        ...user,
        _posts: posts,
        _likesReceived: likesReceived,
        _savesReceived: savesReceived,
        _commentsReceived: commentsReceived,
        _followers: followers,
        _following: following,
        _shops: shops,
        _transactions: transactions,
        _engagement: likesReceived + savesReceived + commentsReceived,
      };
    });

    return { rows, catalogById, likesByPost, commentsByPost, followersByUser, transactionsByUser };
  }, [state]);

  const { rows, catalogById, likesByPost, commentsByPost, followersByUser, transactionsByUser } = derived;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filteredRows = rows.filter((user) => {
      if (term) {
        const haystack = [user.full_name, user.email, user.phone_number, user.location_city, user.location_country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (roleFilter !== 'all' && String(user.role || 'customer').toLowerCase() !== roleFilter) return false;
      if (verification === 'verified' && !isVerified(user)) return false;
      if (verification === 'unverified' && isVerified(user)) return false;
      return true;
    });

    const sorted = [...filteredRows].sort((a, b) => {
      if (sortBy === 'followers') return b._followers - a._followers;
      if (sortBy === 'posts') return b._posts.length - a._posts.length;
      if (sortBy === 'wallet') return Number(b.wallet_balance || 0) - Number(a.wallet_balance || 0);
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'name') return String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''));
      return b._engagement - a._engagement;
    });

    return sorted;
  }, [rows, search, roleFilter, verification, sortBy]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: rows.length,
      creators: rows.filter((user) => user._posts.length > 0).length,
      verified: rows.filter(isVerified).length,
      newThisWeek: rows.filter((user) => new Date(user.created_at || 0).getTime() >= weekAgo).length,
      followers: rows.reduce((sum, user) => sum + user._followers, 0),
      wallet: rows.reduce((sum, user) => sum + Number(user.wallet_balance || 0), 0),
    };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selected = rows.find((user) => user.id === selectedId) || null;

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'customer',
      wallet_balance: String(user.wallet_balance ?? 0),
      lifetime_savings: String(user.lifetime_savings ?? 0),
      kyc_verified: isVerified(user),
      bio: user.bio || '',
      location_city: user.location_city || '',
      location_country: user.location_country || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser || !editForm) return;
    setSaving(true);
    try {
      const payload = {
        full_name: editForm.full_name.trim() || null,
        role: editForm.role || 'customer',
        wallet_balance: Number(editForm.wallet_balance) || 0,
        lifetime_savings: Number(editForm.lifetime_savings) || 0,
        kyc_verified: Boolean(editForm.kyc_verified),
        bio: editForm.bio.trim() || null,
        location_city: editForm.location_city.trim() || null,
        location_country: editForm.location_country.trim() || null,
      };
      const { error } = await db('users').update(payload).eq('id', editUser.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      setToast({ tone: 'success', message: `${editForm.full_name || 'Member'} updated.` });
      setEditUser(null);
      setEditForm(null);
      await load();
    } catch (error) {
      setToast({ tone: 'danger', message: error.message || 'Could not update member.' });
    } finally {
      setSaving(false);
    }
  };

  const handleNotify = async () => {
    if (!notifyUser || !notifyMessage.trim()) return;
    setBusy(true);
    try {
      const { error } = await db('messages').insert({
        sender_id: currentUser?.id,
        receiver_id: notifyUser.id,
        text: notifyMessage.trim(),
      });
      if (error) throw new Error(error.message);
      setToast({ tone: 'success', message: `Message sent to ${notifyUser.full_name || 'member'}.` });
      setNotifyUser(null);
      setNotifyMessage('');
    } catch (error) {
      setToast({ tone: 'danger', message: error.message || 'Could not send message.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setBusy(true);
    try {
      const { error } = await db('users').delete().eq('id', deleteUser.id);
      if (error) throw new Error(error.message);
      setToast({ tone: 'success', message: `${deleteUser.full_name || 'Member'} deleted.` });
      setDeleteUser(null);
      if (selectedId === deleteUser.id) setSelectedId(null);
      await load();
    } catch (error) {
      setToast({ tone: 'danger', message: error.message || 'Could not delete member.' });
    } finally {
      setBusy(false);
    }
  };

  const selectedLikesReceived = selected
    ? selected._posts.flatMap((post) => (likesByPost.get(post.id) ?? []).map((like) => ({ ...like, post }))).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    : [];
  const selectedCommentsReceived = selected
    ? selected._posts.flatMap((post) => (commentsByPost.get(post.id) ?? []).map((comment) => ({ ...comment, post }))).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    : [];
  const selectedFollowers = selected ? followersByUser.get(selected.id) ?? [] : [];
  const selectedActivity = selected
    ? [
        ...state.comments.filter((comment) => comment.user_id === selected.id).map((comment) => ({
          id: `comment-${comment.id}`,
          label: 'Commented',
          detail: catalogById.get(comment.post_id)?.name || 'a post',
          createdAt: comment.created_at,
          tone: 'purple',
        })),
        ...state.likes.filter((like) => like.user_id === selected.id).map((like) => ({
          id: `like-${like.id}`,
          label: 'Liked',
          detail: catalogById.get(like.post_id)?.name || 'a post',
          createdAt: like.created_at,
          tone: 'pink',
        })),
        ...state.saves.filter((save) => save.user_id === selected.id).map((save) => ({
          id: `save-${save.id}`,
          label: 'Saved',
          detail: catalogById.get(save.post_id)?.name || 'a post',
          createdAt: save.created_at,
          tone: 'warning',
        })),
        ...state.follows.filter((follow) => follow.follower_id === selected.id).map((follow) => ({
          id: `follow-${follow.id}`,
          label: 'Followed',
          detail: rows.find((user) => user.id === follow.following_id)?.full_name || 'a creator',
          createdAt: follow.created_at,
          tone: 'primary',
        })),
        ...(transactionsByUser.get(selected.id) ?? []).map((tx) => ({
          id: `tx-${tx.id}`,
          label: 'Transaction',
          detail: `${tx.type || 'transfer'} · ${formatMoney(tx.amount)}`,
          createdAt: tx.created_at,
          tone: 'success',
        })),
      ]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 14)
    : [];

  return (
    <div style={{ padding: '28px 30px 52px', maxWidth: 1580, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ ...badgeStyle('primary'), letterSpacing: 0.5 }}>
              <FiUserPlus size={11} /> Community
            </span>
            <span style={badgeStyle('neutral')}>{dataSourceLabel}</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.9 }}>Members</h1>
          <p style={{ marginTop: 6, fontSize: 13, color: colors.textMuted }}>
            Engagement, identity, wallets and the people behind every post.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: colors.textDim }}>{state.refreshedAt ? `Updated ${timeAgo(state.refreshedAt)}` : 'Loading…'}</span>
          <button type="button" onClick={load} style={ghostButton} disabled={state.loading}>
            <FiRefreshCw size={15} style={{ animation: state.loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </header>

      {state.warnings.length ? (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: radii.md, border: '1px solid rgba(241,196,15,0.28)', background: colors.warningSoft, color: colors.warning, fontSize: 11 }}>
          Some sources are unavailable: {state.warnings.slice(0, 2).join(' · ')}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <MiniStat icon={FiUserPlus} label="Members" value={formatNumber(stats.total)} tone="primary" />
        <MiniStat icon={FiPackage} label="Creators" value={formatNumber(stats.creators)} tone="success" />
        <MiniStat icon={FiShield} label="Verified" value={formatNumber(stats.verified)} tone="purple" />
        <MiniStat icon={FiCalendar} label="New this week" value={formatNumber(stats.newThisWeek)} tone="warning" />
        <MiniStat icon={FiHeart} label="Followers" value={formatNumber(stats.followers)} tone="pink" />
        <MiniStat icon={FiCreditCard} label="Wallet float" value={formatMoney(stats.wallet)} tone="teal" />
      </div>

      <div style={{ ...card, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone or city…"
            style={{ ...input, paddingLeft: 34 }}
          />
        </div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} style={{ ...input, width: 'auto', minWidth: 130 }}>
          <option value="all">All roles</option>
          <option value="customer">Customer</option>
          <option value="provider">Provider</option>
          <option value="business">Business</option>
          <option value="admin">Admin</option>
        </select>
        <select value={verification} onChange={(event) => setVerification(event.target.value)} style={{ ...input, width: 'auto', minWidth: 130 }}>
          <option value="all">All KYC</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...input, width: 'auto', minWidth: 160 }}>
          <option value="engagement">Sort: engagement</option>
          <option value="followers">Sort: followers</option>
          <option value="posts">Sort: posts</option>
          <option value="wallet">Sort: wallet</option>
          <option value="newest">Sort: newest</option>
          <option value="name">Sort: name</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>{filtered.length} members</span>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ background: colors.bgSoft }}>
                {['Member', 'Role', 'Location', 'Posts', 'Followers', 'Engagement', 'Wallet', 'KYC', 'Joined', ''].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: heading === '' || ['Posts', 'Followers', 'Engagement', 'Wallet'].includes(heading) ? 'right' : 'left',
                      padding: '11px 14px',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color: colors.textDim,
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>
                    Loading members…
                  </td>
                </tr>
              ) : paged.length ? (
                paged.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={user.full_name || user.email} src={user.avatar_url} size={36} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            {user.full_name || 'Unnamed member'}
                          </div>
                          <div style={{ fontSize: 10, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            {user.email || user.phone_number || 'No contact'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={badgeStyle(roleTone(user.role))}>{user.role || 'customer'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                      {[user.location_city, user.location_country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{user._posts.length}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{user._followers}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: user._engagement ? colors.primary : colors.textDim }}>
                      {formatNumber(user._engagement)}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatMoney(user.wallet_balance)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {isVerified(user) ? (
                        <span style={badgeStyle('success')}><FiCheck size={10} /> Yes</span>
                      ) : (
                        <span style={badgeStyle('neutral')}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 10, color: colors.textMuted, whiteSpace: 'nowrap' }}>{timeAgo(user.created_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                        <IconButton icon={FiEye} label="View" onClick={() => { setSelectedId(user.id); setTab('overview'); }} />
                        <IconButton icon={FiEdit2} label="Edit" tone="primary" onClick={() => openEdit(user)} />
                        <IconButton icon={FiSend} label="Message" onClick={() => { setNotifyUser(user); setNotifyMessage(''); }} />
                        <IconButton icon={FiTrash2} label="Delete" tone="danger" onClick={() => setDeleteUser(user)} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>
                    No members match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${colors.border}` }}>
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            Showing {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1} style={{ ...ghostButton, padding: '7px 10px', opacity: safePage <= 1 ? 0.4 : 1 }}>
              <FiChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 11, color: colors.textMuted }}>{safePage} / {totalPages}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages} style={{ ...ghostButton, padding: '7px 10px', opacity: safePage >= totalPages ? 0.4 : 1 }}>
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <div
          onClick={() => setSelectedId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end' }}
        >
          <aside
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(560px, 100%)', height: '100%', background: colors.bg, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', boxShadow: '-30px 0 80px rgba(0,0,0,0.5)' }}
          >
            <header style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Avatar name={selected.full_name || selected.email} src={selected.avatar_url} size={54} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected.full_name || 'Unnamed member'}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{selected.email || selected.phone_number || 'No contact'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={badgeStyle(roleTone(selected.role))}>{selected.role || 'customer'}</span>
                  {isVerified(selected) ? <span style={badgeStyle('success')}><FiCheck size={10} /> KYC verified</span> : <span style={badgeStyle('warning')}>KYC pending</span>}
                  {selected._shops.length ? <span style={badgeStyle('teal')}><FiShoppingBag size={10} /> {selected._shops.length} shops</span> : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <IconButton icon={FiEdit2} label="Edit" tone="primary" onClick={() => openEdit(selected)} />
                <IconButton icon={FiX} label="Close" onClick={() => setSelectedId(null)} />
              </div>
            </header>

            <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' }}>
              {TABS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: radii.pill,
                    border: `1px solid ${tab === entry.id ? colors.primaryBorder : 'transparent'}`,
                    background: tab === entry.id ? colors.primarySoft : 'transparent',
                    color: tab === entry.id ? colors.primary : colors.textMuted,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              {tab === 'overview' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <MiniStat icon={FiPackage} label="Posts" value={selected._posts.length} tone="success" />
                    <MiniStat icon={FiHeart} label="Followers" value={selected._followers} tone="pink" />
                    <MiniStat icon={FiUserPlus} label="Following" value={selected._following} tone="primary" />
                    <MiniStat icon={FiActivity} label="Engagement" value={formatNumber(selected._engagement)} tone="purple" />
                  </div>
                  <div style={{ ...panel, padding: 14 }}>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Bio</div>
                    <p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.55 }}>{selected.bio || 'No bio provided.'}</p>
                  </div>
                  <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {[
                      ['Member ID', selected.id],
                      ['Phone', selected.phone_number || '—'],
                      ['Location', [selected.location_city, selected.location_region, selected.location_country].filter(Boolean).join(', ') || '—'],
                      ['Joined', selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'],
                      ['Wallet', formatMoney(selected.wallet_balance)],
                      ['Lifetime savings', formatMoney(selected.lifetime_savings)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
                        <span style={{ color: colors.textMuted }}>{label}</span>
                        <span style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {tab === 'content' ? (
                selected._posts.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {[...selected._posts]
                      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                      .map((post) => (
                        <div key={post.id} style={{ ...panel, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Avatar name={post.name} src={firstImage(post)} size={44} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.name}</div>
                            <div style={{ fontSize: 10, color: colors.textMuted }}>{post.category || 'General'} · {post.price ? formatMoney(post.price) : 'No price'}</div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 10, color: colors.textDim }}>
                              <span><FiEye size={10} /> {formatNumber(post.view_count)}</span>
                              <span><FiHeart size={10} /> {formatNumber(post.like_count)}</span>
                              <span><FiBookmark size={10} /> {formatNumber(post.save_count)}</span>
                              <span><FiMessageCircle size={10} /> {formatNumber(post.comment_count)}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 9, color: colors.textDim, whiteSpace: 'nowrap' }}>{timeAgo(post.created_at)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ padding: 30, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>No content published yet.</div>
                )
              ) : null}

              {tab === 'engagement' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <MiniStat icon={FiHeart} label="Likes received" value={formatNumber(selected._likesReceived)} tone="pink" />
                    <MiniStat icon={FiBookmark} label="Saves received" value={formatNumber(selected._savesReceived)} tone="warning" />
                    <MiniStat icon={FiMessageCircle} label="Comments received" value={formatNumber(selected._commentsReceived)} tone="purple" />
                    <MiniStat icon={FiUserPlus} label="Followers" value={formatNumber(selected._followers)} tone="primary" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Recent likes on their posts</div>
                    {selectedLikesReceived.length ? (
                      selectedLikesReceived.slice(0, 8).map((like) => (
                        <div key={like.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 11 }}>
                          <FiHeart size={12} style={{ color: colors.pink }} />
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rows.find((user) => user.id === like.user_id)?.full_name || 'Someone'} liked {like.post.name}
                          </span>
                          <span style={{ fontSize: 9, color: colors.textDim }}>{timeAgo(like.created_at)}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: colors.textDim }}>No likes yet.</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Recent comments</div>
                    {selectedCommentsReceived.length ? (
                      selectedCommentsReceived.slice(0, 6).map((comment) => (
                        <div key={comment.id} style={{ ...panel, padding: 10, marginBottom: 7 }}>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>
                            {rows.find((user) => user.id === comment.user_id)?.full_name || 'Someone'}
                            <span style={{ color: colors.textDim, fontWeight: 400 }}> on {comment.post.name}</span>
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{comment.content}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: colors.textDim }}>No comments yet.</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Followers</div>
                    {selectedFollowers.length ? (
                      selectedFollowers.slice(0, 8).map((follow) => {
                        const follower = rows.find((user) => user.id === follow.follower_id);
                        return (
                          <div key={follow.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                            <Avatar name={follower?.full_name || 'Member'} src={follower?.avatar_url} size={26} />
                            <span style={{ fontSize: 11, flex: 1 }}>{follower?.full_name || 'Member'}</span>
                            <span style={{ fontSize: 9, color: colors.textDim }}>{timeAgo(follow.created_at)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: 11, color: colors.textDim }}>No followers yet.</div>
                    )}
                  </div>
                </div>
              ) : null}

              {tab === 'wallet' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <MiniStat icon={FiCreditCard} label="Wallet balance" value={formatMoney(selected.wallet_balance)} tone="teal" />
                    <MiniStat icon={FiBookmark} label="Lifetime savings" value={formatMoney(selected.lifetime_savings)} tone="primary" />
                    <MiniStat icon={FiShield} label="KYC status" value={isVerified(selected) ? 'Verified' : 'Pending'} tone={isVerified(selected) ? 'success' : 'warning'} />
                    <MiniStat icon={FiActivity} label="Transactions" value={selected._transactions.length} tone="purple" />
                  </div>
                  <button type="button" style={primaryButton} onClick={() => openEdit(selected)}>
                    <FiEdit2 size={14} /> Adjust wallet / KYC
                  </button>
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Transactions</div>
                    {selected._transactions.length ? (
                      [...selected._transactions]
                        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                        .slice(0, 12)
                        .map((tx) => (
                          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                            <span style={{ ...badgeStyle(tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'), fontSize: 9 }}>{tx.status || 'pending'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.type || 'Transaction'}</div>
                              <div style={{ fontSize: 9, color: colors.textDim }}>{tx.merchant || '—'} · {timeAgo(tx.created_at)}</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800 }}>{formatMoney(tx.amount)}</span>
                          </div>
                        ))
                    ) : (
                      <div style={{ fontSize: 11, color: colors.textDim }}>No transactions recorded.</div>
                    )}
                  </div>
                </div>
              ) : null}

              {tab === 'activity' ? (
                selectedActivity.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {selectedActivity.map((entry) => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${colors.border}` }}>
                        <span style={{ ...badgeStyle(entry.tone), fontSize: 9, minWidth: 76, justifyContent: 'center' }}>{entry.label}</span>
                        <span style={{ flex: 1, fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.detail}</span>
                        <span style={{ fontSize: 9, color: colors.textDim }}>{timeAgo(entry.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 30, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>No activity recorded.</div>
                )
              ) : null}

              {tab === 'shops' ? (
                selected._shops.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {selected._shops.map((shop) => (
                      <div key={shop.id} style={{ ...panel, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Avatar name={shop.name} src={shop.logo_url} size={42} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{shop.name}</div>
                          <div style={{ fontSize: 10, color: colors.textMuted }}>{shop.category || 'Shop'} · {shop.city || '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 800 }}>{Number(shop.rating || 0).toFixed(1)}</div>
                          <div style={{ fontSize: 9, color: colors.textDim }}>{shop.review_count || 0} reviews</div>
                        </div>
                        {isVerified(shop) ? <span style={badgeStyle('success')}>Verified</span> : <span style={badgeStyle('neutral')}>Open</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 30, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>No shops owned by this member.</div>
                )
              ) : null}
            </div>

            <footer style={{ padding: 14, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
              <button type="button" style={{ ...ghostButton, flex: 1 }} onClick={() => { setNotifyUser(selected); setNotifyMessage(''); }}>
                <FiSend size={14} /> Message
              </button>
              <button type="button" style={{ ...dangerButton, flex: 1 }} onClick={() => setDeleteUser(selected)}>
                <FiTrash2 size={14} /> Delete
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {editUser && editForm ? (
        <Modal
          title={`Edit ${editUser.full_name || 'member'}`}
          subtitle={editUser.email || editUser.phone_number || editUser.id}
          onClose={() => { if (!saving) { setEditUser(null); setEditForm(null); } }}
          footer={
            <>
              <button type="button" style={ghostButton} onClick={() => { setEditUser(null); setEditForm(null); }} disabled={saving}>Cancel</button>
              <button type="button" style={primaryButton} onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </>
          }
        >
          <Field label="Full name">
            <input style={input} value={editForm.full_name} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Role">
              <select style={input} value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}>
                <option value="customer">Customer</option>
                <option value="provider">Provider</option>
                <option value="business">Business</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="KYC verified">
              <label style={{ ...input, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={editForm.kyc_verified} onChange={(event) => setEditForm({ ...editForm, kyc_verified: event.target.checked })} />
                <span style={{ fontSize: 12 }}>{editForm.kyc_verified ? 'Verified' : 'Not verified'}</span>
              </label>
            </Field>
            <Field label="Wallet balance">
              <input type="number" style={input} value={editForm.wallet_balance} onChange={(event) => setEditForm({ ...editForm, wallet_balance: event.target.value })} />
            </Field>
            <Field label="Lifetime savings">
              <input type="number" style={input} value={editForm.lifetime_savings} onChange={(event) => setEditForm({ ...editForm, lifetime_savings: event.target.value })} />
            </Field>
            <Field label="City">
              <input style={input} value={editForm.location_city} onChange={(event) => setEditForm({ ...editForm, location_city: event.target.value })} />
            </Field>
            <Field label="Country">
              <input style={input} value={editForm.location_country} onChange={(event) => setEditForm({ ...editForm, location_country: event.target.value })} />
            </Field>
          </div>
          <Field label="Bio">
            <textarea rows={3} style={{ ...input, resize: 'vertical' }} value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} />
          </Field>
          <div style={{ fontSize: 10, color: colors.textDim }}>
            Local development writes use the backend admin bypass. Production writes depend on Supabase row-level security.
          </div>
        </Modal>
      ) : null}

      {notifyUser ? (
        <Modal
          title={`Message ${notifyUser.full_name || 'member'}`}
          subtitle="Sends an in-app direct message from the admin account."
          onClose={() => { if (!busy) { setNotifyUser(null); setNotifyMessage(''); } }}
          footer={
            <>
              <button type="button" style={ghostButton} onClick={() => { setNotifyUser(null); setNotifyMessage(''); }} disabled={busy}>Cancel</button>
              <button type="button" style={primaryButton} onClick={handleNotify} disabled={busy || !notifyMessage.trim()}>
                <FiSend size={14} /> {busy ? 'Sending…' : 'Send message'}
              </button>
            </>
          }
        >
          <Field label="Message">
            <textarea rows={5} style={{ ...input, resize: 'vertical' }} value={notifyMessage} onChange={(event) => setNotifyMessage(event.target.value)} placeholder="Write a direct message…" />
          </Field>
        </Modal>
      ) : null}

      {deleteUser ? (
        <Modal
          title="Delete member"
          subtitle="This removes the account record. Related content may remain."
          onClose={() => { if (!busy) setDeleteUser(null); }}
          width={440}
          footer={
            <>
              <button type="button" style={ghostButton} onClick={() => setDeleteUser(null)} disabled={busy}>Cancel</button>
              <button type="button" style={dangerButton} onClick={handleDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete member'}</button>
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.dangerSoft, color: colors.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiAlertTriangle size={18} />
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              Are you sure you want to delete <strong style={{ color: colors.text }}>{deleteUser.full_name || deleteUser.email || 'this member'}</strong>? This action cannot be undone.
            </div>
          </div>
        </Modal>
      ) : null}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            right: 22,
            zIndex: 500,
            padding: '11px 15px',
            borderRadius: radii.md,
            border: `1px solid ${toast.tone === 'danger' ? 'rgba(231,76,60,0.35)' : 'rgba(46,204,113,0.35)'}`,
            background: toast.tone === 'danger' ? colors.dangerSoft : colors.successSoft,
            color: toast.tone === 'danger' ? colors.danger : colors.success,
            fontSize: 12,
            fontWeight: 600,
            boxShadow: '0 18px 40px rgba(0,0,0,0.4)',
            maxWidth: 360,
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
