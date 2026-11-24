import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiArrowUpRight,
  FiCheckCircle,
  FiCreditCard,
  FiHeart,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiShoppingBag,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../lib/db';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  badgeStyle,
  card,
  colors,
  dayKey,
  formatMoney,
  formatNumber,
  ghostButton,
  initials,
  panel,
  radii,
  timeAgo,
} from '../lib/theme';

const ENGAGEMENT_COLORS = [colors.primary, colors.success, colors.purple, colors.warning, colors.pink];

function asArray(result) {
  return Array.isArray(result?.data) ? result.data : [];
}

function StatCard({ icon: Icon, label, value, detail, tone = 'primary', trend }) {
  const tones = {
    primary: { color: colors.primary, background: colors.primarySoft },
    success: { color: colors.success, background: colors.successSoft },
    purple: { color: colors.purple, background: colors.purpleSoft },
    warning: { color: colors.warning, background: colors.warningSoft },
    pink: { color: colors.pink, background: colors.pinkSoft },
    teal: { color: colors.teal, background: colors.tealSoft },
  };
  const palette = tones[tone] ?? tones.primary;
  return (
    <div style={{ ...card, padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: palette.background,
            color: palette.color,
          }}
        >
          <Icon size={18} />
        </div>
        {trend ? (
          <span style={{ ...badgeStyle('success'), gap: 3 }}>
            <FiArrowUpRight size={11} /> {trend}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{label}</div>
      {detail ? <div style={{ marginTop: 3, fontSize: 11, color: colors.textDim }}>{detail}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, action, children, style }) {
  return (
    <section style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{title}</h2>
          {subtitle ? <p style={{ marginTop: 3, fontSize: 11, color: colors.textMuted }}>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function EmptyState({ label = 'No data yet' }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textDim,
        fontSize: 12,
        border: `1px dashed ${colors.border}`,
        borderRadius: radii.md,
      }}
    >
      {label}
    </div>
  );
}

function Avatar({ name, src, size = 34 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
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

export default function Dashboard() {
  const { dataSourceLabel } = useAppSettings();
  const [state, setState] = useState({
    loading: true,
    error: '',
    warnings: [],
    users: [],
    catalog: [],
    services: [],
    shops: [],
    likes: [],
    saves: [],
    comments: [],
    follows: [],
    reviews: [],
    featured: [],
    transactions: [],
    refreshedAt: null,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const results = await Promise.all([
      db('users')
        .select(
          'id,full_name,email,avatar_url,role,kyc_verified,wallet_balance,lifetime_savings,location_city,location_country,latitude,longitude,created_at'
        )
        .limit(1000),
      db('catalog')
        .select(
          'id,user_id,name,category,price,images,video_thumbnail,view_count,like_count,save_count,comment_count,share_count,created_at,is_active,status,location'
        )
        .limit(1000),
      db('service_catalog').select('id,name,category,price_type,created_at,is_active').limit(1000),
      db('shops')
        .select('id,owner_id,name,category,city,logo_url,rating,is_verified,latitude,longitude,created_at')
        .limit(1000),
      db('likes').select('id,user_id,post_id,created_at').limit(1000),
      db('saves').select('id,user_id,post_id,created_at').limit(1000),
      db('comments').select('id,user_id,post_id,content,created_at').limit(1000),
      db('follows').select('id,follower_id,following_id,created_at').limit(1000),
      db('reviews').select('id,customer_id,business_id,rating,comment,status,created_at').limit(1000),
      db('featured_opportunities').select('*').limit(200),
      db('transactions').select('id,amount,status,type,created_at').limit(1000),
    ]);

    const warnings = results
      .map((result, index) => (result?.error?.message ? `source ${index + 1}: ${result.error.message}` : null))
      .filter(Boolean);

    setState({
      loading: false,
      error: '',
      warnings,
      users: asArray(results[0]),
      catalog: asArray(results[1]),
      services: asArray(results[2]),
      shops: asArray(results[3]),
      likes: asArray(results[4]),
      saves: asArray(results[5]),
      comments: asArray(results[6]),
      follows: asArray(results[7]),
      reviews: asArray(results[8]),
      featured: asArray(results[9]),
      transactions: asArray(results[10]),
      refreshedAt: new Date(),
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const userById = new Map(state.users.map((user) => [user.id, user]));
    const catalogById = new Map(state.catalog.map((item) => [item.id, item]));

    const authorStats = new Map();
    for (const item of state.catalog) {
      if (!item.user_id) continue;
      const current = authorStats.get(item.user_id) ?? { posts: 0, likes: 0, saves: 0, comments: 0 };
      current.posts += 1;
      current.likes += Number(item.like_count || 0);
      current.saves += Number(item.save_count || 0);
      current.comments += Number(item.comment_count || 0);
      authorStats.set(item.user_id, current);
    }

    const postsWithScore = state.catalog.map((item) => {
      const score =
        Number(item.view_count || 0) * 0.1 +
        Number(item.like_count || 0) * 3 +
        Number(item.save_count || 0) * 4 +
        Number(item.comment_count || 0) * 5 +
        Number(item.share_count || 0) * 6;
      return { ...item, score, author: userById.get(item.user_id) };
    });

    const topPosts = [...postsWithScore].sort((a, b) => b.score - a.score).slice(0, 6);

    const categoryMap = new Map();
    for (const item of state.catalog) {
      const key = item.category || 'Uncategorized';
      const current = categoryMap.get(key) ?? { name: key, count: 0, engagement: 0 };
      current.count += 1;
      current.engagement +=
        Number(item.like_count || 0) + Number(item.save_count || 0) + Number(item.comment_count || 0);
      categoryMap.set(key, current);
    }
    const topCategories = [...categoryMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);

    const days = [];
    for (let index = 13; index >= 0; index -= 1) {
      const date = new Date(now - index * 24 * 60 * 60 * 1000);
      const key = dayKey(date);
      days.push({
        key,
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        posts: 0,
        users: 0,
      });
    }
    const dayMap = new Map(days.map((day) => [day.key, day]));
    for (const item of state.catalog) {
      const bucket = dayMap.get(dayKey(item.created_at));
      if (bucket) bucket.posts += 1;
    }
    for (const user of state.users) {
      const bucket = dayMap.get(dayKey(user.created_at));
      if (bucket) bucket.users += 1;
    }

    const engagement = [
      { name: 'Likes', value: state.likes.length, color: ENGAGEMENT_COLORS[0] },
      { name: 'Saves', value: state.saves.length, color: ENGAGEMENT_COLORS[1] },
      { name: 'Comments', value: state.comments.length, color: ENGAGEMENT_COLORS[2] },
      { name: 'Follows', value: state.follows.length, color: ENGAGEMENT_COLORS[3] },
      { name: 'Reviews', value: state.reviews.length, color: ENGAGEMENT_COLORS[4] },
    ];
    const totalEngagement = engagement.reduce((sum, item) => sum + item.value, 0);

    const activeFeatured = state.featured.filter((item) => {
      const start = item.start_date ? new Date(item.start_date).getTime() : 0;
      const end = item.end_date ? new Date(item.end_date).getTime() : Number.MAX_SAFE_INTEGER;
      return start <= now && end >= now;
    });

    const spotlight = activeFeatured.length
      ? activeFeatured.slice(0, 5).map((entry) => {
          const item =
            entry.item_type === 'product' || entry.item_type === 'catalog'
              ? catalogById.get(entry.item_id)
              : null;
          return {
            id: entry.id,
            label: entry.custom_label || item?.name || 'Featured opportunity',
            itemType: entry.item_type,
            priority: entry.priority,
            item,
          };
        })
      : topPosts.slice(0, 5).map((item) => ({
          id: item.id,
          label: item.name,
          itemType: 'trending',
          priority: Math.round(item.score),
          item,
        }));

    const roleMap = new Map();
    for (const user of state.users) {
      const role = user.role || 'customer';
      roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
    }
    const roles = [...roleMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const cityMap = new Map();
    for (const user of state.users) {
      const city = [user.location_city, user.location_country].filter(Boolean).join(', ') || 'Unknown';
      cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    }
    const cities = [...cityMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mapUsers = state.users
      .map((user) => ({
        id: user.id,
        name: user.full_name || user.email || 'Member',
        latitude: Number(user.latitude),
        longitude: Number(user.longitude),
        city: user.location_city,
      }))
      .filter((user) => Number.isFinite(user.latitude) && Number.isFinite(user.longitude));
    const mapShops = state.shops
      .map((shop) => ({
        id: shop.id,
        name: shop.name,
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
        city: shop.city,
      }))
      .filter((shop) => Number.isFinite(shop.latitude) && Number.isFinite(shop.longitude));
    const mapCenter =
      mapUsers.length || mapShops.length
        ? [
            (mapUsers[0]?.latitude ?? mapShops[0]?.latitude ?? 0.3476),
            (mapUsers[0]?.longitude ?? mapShops[0]?.longitude ?? 32.5825),
          ]
        : [0.3476, 32.5825];

    const walletTotal = state.users.reduce((sum, user) => sum + Number(user.wallet_balance || 0), 0);
    const savingsTotal = state.users.reduce((sum, user) => sum + Number(user.lifetime_savings || 0), 0);
    const verified = state.users.filter((user) => Number(user.kyc_verified) === 1 || user.kyc_verified === true).length;
    const newUsers = state.users.filter((user) => new Date(user.created_at).getTime() >= weekAgo).length;
    const activePosts = state.catalog.filter((item) => item.is_active === 1 || item.is_active === true).length;
    const transactionVolume = state.transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const completedTransactions = state.transactions.filter((tx) => tx.status === 'completed').length;

    const activity = [
      ...state.users.map((user) => ({
        id: `user-${user.id}`,
        type: 'Member joined',
        title: user.full_name || user.email || 'New member',
        meta: user.role || 'customer',
        avatar: user.avatar_url,
        createdAt: user.created_at,
        tone: 'primary',
      })),
      ...state.catalog.map((item) => ({
        id: `post-${item.id}`,
        type: 'Post published',
        title: item.name,
        meta: item.category || 'General',
        createdAt: item.created_at,
        tone: 'success',
      })),
      ...state.likes.map((like) => ({
        id: `like-${like.id}`,
        type: 'Like',
        title: userById.get(like.user_id)?.full_name || 'A member',
        meta: catalogById.get(like.post_id)?.name || 'a post',
        createdAt: like.created_at,
        tone: 'pink',
      })),
      ...state.comments.map((comment) => ({
        id: `comment-${comment.id}`,
        type: 'Comment',
        title: userById.get(comment.user_id)?.full_name || 'A member',
        meta: catalogById.get(comment.post_id)?.name || 'a post',
        createdAt: comment.created_at,
        tone: 'purple',
      })),
      ...state.follows.map((follow) => ({
        id: `follow-${follow.id}`,
        type: 'Follow',
        title: userById.get(follow.follower_id)?.full_name || 'A member',
        meta: userById.get(follow.following_id)?.full_name || 'a creator',
        createdAt: follow.created_at,
        tone: 'warning',
      })),
    ]
      .filter((entry) => entry.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 9);

    return {
      topPosts,
      topCategories,
      days,
      engagement,
      totalEngagement,
      activeFeatured,
      spotlight,
      roles,
      cities,
      mapUsers,
      mapShops,
      mapCenter,
      walletTotal,
      savingsTotal,
      verified,
      newUsers,
      activePosts,
      transactionVolume,
      completedTransactions,
      activity,
      authorStats,
    };
  }, [state]);

  const {
    topPosts,
    topCategories,
    days,
    engagement,
    totalEngagement,
    activeFeatured,
    spotlight,
    roles,
    cities,
    mapUsers,
    mapShops,
    mapCenter,
    walletTotal,
    savingsTotal,
    verified,
    newUsers,
    activePosts,
    transactionVolume,
    completedTransactions,
    activity,
  } = derived;

  const engagementTotalForPie = engagement.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ padding: '28px 30px 52px', maxWidth: 1580, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ ...badgeStyle('primary'), letterSpacing: 0.6 }}>
              <FiZap size={11} /> Content command center
            </span>
            <span style={{ ...badgeStyle('neutral') }}>{dataSourceLabel}</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.9, lineHeight: 1.1 }}>
            Platform pulse
          </h1>
          <p style={{ marginTop: 6, fontSize: 13, color: colors.textMuted }}>
            People, posts, services and the engagement loops connecting them.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: colors.textDim }}>
            {state.refreshedAt ? `Updated ${timeAgo(state.refreshedAt)}` : 'Loading…'}
          </span>
          <button type="button" onClick={load} style={ghostButton} disabled={state.loading}>
            <FiRefreshCw size={15} style={{ animation: state.loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </header>

      {state.warnings.length ? (
        <div
          style={{
            marginBottom: 18,
            padding: '10px 14px',
            borderRadius: radii.md,
            border: `1px solid rgba(241,196,15,0.28)`,
            background: colors.warningSoft,
            color: colors.warning,
            fontSize: 11,
          }}
        >
          Some sources are unavailable: {state.warnings.slice(0, 2).join(' · ')}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <StatCard icon={FiUsers} label="Members" value={formatNumber(state.users.length)} detail={`${newUsers} joined this week`} tone="primary" />
        <StatCard icon={FiPackage} label="Content posts" value={formatNumber(state.catalog.length)} detail={`${activePosts} active`} tone="success" />
        <StatCard icon={FiShoppingBag} label="Services" value={formatNumber(state.services.length)} detail={`${state.shops.length} shops`} tone="teal" />
        <StatCard icon={FiHeart} label="Engagement" value={formatNumber(totalEngagement)} detail={`${state.comments.length} comments · ${state.follows.length} follows`} tone="pink" />
        <StatCard icon={FiCheckCircle} label="Verified members" value={formatNumber(verified)} detail={`${state.users.length ? Math.round((verified / state.users.length) * 100) : 0}% of members`} tone="purple" />
        <StatCard icon={FiCreditCard} label="Wallet balance" value={formatMoney(walletTotal)} detail={`${formatMoney(savingsTotal)} lifetime savings`} tone="warning" />
        <StatCard icon={FiActivity} label="Transactions" value={formatNumber(state.transactions.length)} detail={`${completedTransactions} completed · ${formatMoney(transactionVolume)}`} tone="primary" />
        <StatCard icon={FiStar} label="Featured live" value={formatNumber(activeFeatured.length)} detail={activeFeatured.length ? 'Curated by admins' : 'Using trending fallback'} tone="teal" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.9fr)', gap: 16, marginBottom: 16 }}>
        <SectionCard title="Content growth" subtitle="New posts and members over the last 14 days">
          {state.loading ? (
            <EmptyState label="Loading growth…" />
          ) : (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.primary} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.success} stopOpacity={0.42} />
                      <stop offset="100%" stopColor={colors.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: colors.textDim, fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fill: colors.textDim, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.borderStrong}`,
                      borderRadius: 12,
                      fontSize: 12,
                      color: colors.text,
                    }}
                  />
                  <Area type="monotone" dataKey="posts" name="Posts" stroke={colors.primary} strokeWidth={2.5} fill="url(#postsGradient)" />
                  <Area type="monotone" dataKey="users" name="Members" stroke={colors.success} strokeWidth={2} fill="url(#usersGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMuted }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: colors.primary }} /> Posts
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMuted }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: colors.success }} /> Members
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Engagement mix" subtitle={`${formatNumber(totalEngagement)} total signals`}>
          {engagementTotalForPie ? (
            <>
              <div style={{ height: 178, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={engagement}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {engagement.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: colors.surface,
                        border: `1px solid ${colors.borderStrong}`,
                        borderRadius: 12,
                        fontSize: 12,
                        color: colors.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{formatNumber(totalEngagement)}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted }}>signals</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                {engagement.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: item.color }} />
                    <span style={{ color: colors.textMuted, flex: 1 }}>{item.name}</span>
                    <span style={{ fontWeight: 700 }}>{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState label="No engagement recorded yet" />
          )}
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.85fr) minmax(0, 0.9fr)', gap: 16, marginBottom: 16 }}>
        <SectionCard title="Top performing posts" subtitle="Ranked by views, likes, saves, comments and shares">
          {topPosts.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPosts.map((post, index) => (
                <div
                  key={post.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '9px 10px',
                    borderRadius: radii.md,
                    background: index === 0 ? colors.primarySoft : colors.surfaceAlt,
                    border: `1px solid ${index === 0 ? colors.primaryBorder : 'transparent'}`,
                  }}
                >
                  <span style={{ width: 18, fontSize: 11, fontWeight: 800, color: index === 0 ? colors.primary : colors.textDim }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Avatar name={post.name} src={post.video_thumbnail || post.images} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.name}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                      {post.author?.full_name || 'Unknown creator'} · {post.category || 'General'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{formatNumber(post.like_count)}</div>
                    <div style={{ fontSize: 9, color: colors.textDim }}>likes</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{formatNumber(post.view_count)}</div>
                    <div style={{ fontSize: 9, color: colors.textDim }}>views</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No posts yet" />
          )}
        </SectionCard>

        <SectionCard title="Top categories" subtitle="Where content is clustering">
          {topCategories.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topCategories.map((category) => {
                const max = topCategories[0]?.count || 1;
                return (
                  <div key={category.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: colors.textMuted, fontWeight: 600 }}>{category.name}</span>
                      <span style={{ fontWeight: 700 }}>{formatNumber(category.count)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(6, (category.count / max) * 100)}%`,
                          height: '100%',
                          borderRadius: 99,
                          background: `linear-gradient(90deg, ${colors.primary}, ${colors.purple})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState label="No categories yet" />
          )}
        </SectionCard>

        <SectionCard title="Community map" subtitle={`${mapUsers.length} members · ${mapShops.length} shops located`}>
          {mapUsers.length || mapShops.length ? (
            <div style={{ height: 262, borderRadius: radii.md, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
              <MapContainer center={mapCenter} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                {mapUsers.slice(0, 250).map((user) => (
                  <CircleMarker
                    key={`user-${user.id}`}
                    center={[user.latitude, user.longitude]}
                    radius={5}
                    pathOptions={{ color: colors.primary, fillColor: colors.primary, fillOpacity: 0.7, weight: 1 }}
                  >
                    <Popup>
                      <strong>{user.name}</strong>
                      <br />
                      {user.city || 'Member'}
                    </Popup>
                  </CircleMarker>
                ))}
                {mapShops.slice(0, 120).map((shop) => (
                  <CircleMarker
                    key={`shop-${shop.id}`}
                    center={[shop.latitude, shop.longitude]}
                    radius={6}
                    pathOptions={{ color: colors.success, fillColor: colors.success, fillOpacity: 0.7, weight: 1 }}
                  >
                    <Popup>
                      <strong>{shop.name}</strong>
                      <br />
                      {shop.city || 'Shop'}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <EmptyState label="No location data yet" />
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: colors.textMuted }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: colors.primary }} /> Members
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: colors.textMuted }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: colors.success }} /> Shops
            </span>
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        <SectionCard title="Recent activity" subtitle="Latest people, posts and interactions">
          {activity.length ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 0',
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  <Avatar name={entry.title} src={entry.avatar} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.title}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.meta}
                    </div>
                  </div>
                  <span style={{ ...badgeStyle(entry.tone), fontSize: 9 }}>{entry.type}</span>
                  <span style={{ fontSize: 9, color: colors.textDim, flexShrink: 0, width: 58, textAlign: 'right' }}>
                    {timeAgo(entry.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No activity yet" />
          )}
        </SectionCard>

        <SectionCard
          title="Featured spotlight"
          subtitle={activeFeatured.length ? `${activeFeatured.length} active curated placements` : 'No active placements · showing trending fallback'}
          action={<span style={badgeStyle(activeFeatured.length ? 'success' : 'warning')}>{activeFeatured.length ? 'Curated' : 'Fallback'}</span>}
        >
          {spotlight.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {spotlight.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: radii.md,
                    background: colors.surfaceAlt,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: entry.itemType === 'trending' ? colors.warningSoft : colors.purpleSoft,
                      color: entry.itemType === 'trending' ? colors.warning : colors.purple,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {entry.itemType === 'trending' ? <FiTrendingUp size={15} /> : <FiZap size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.label}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>
                      {entry.itemType} · priority {entry.priority ?? 0}
                    </div>
                  </div>
                  {entry.item ? (
                    <span style={{ fontSize: 10, color: colors.textDim }}>{formatNumber(entry.item.like_count)} likes</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No featured items yet" />
          )}
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, marginTop: 16 }}>
        <SectionCard title="Wallet & trust snapshot" subtitle="Keep money and verification visible as the platform scales">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Wallet float</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{formatMoney(walletTotal)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lifetime savings</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{formatMoney(savingsTotal)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>KYC verified</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: colors.success }}>{formatNumber(verified)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tx volume</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{formatMoney(transactionVolume)}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.textMuted, marginBottom: 6 }}>
              <span>Verification coverage</span>
              <span>{state.users.length ? Math.round((verified / state.users.length) * 100) : 0}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${state.users.length ? Math.min(100, (verified / state.users.length) * 100) : 0}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${colors.success}, ${colors.primary})`,
                }}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Audience shape" subtitle="Roles and where members are based">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Roles</div>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roles} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: -22 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: colors.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{
                        background: colors.surface,
                        border: `1px solid ${colors.borderStrong}`,
                        borderRadius: 12,
                        fontSize: 12,
                        color: colors.text,
                      }}
                    />
                    <Bar dataKey="count" name="Members" fill={colors.primary} radius={[0, 6, 6, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Locations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {cities.length ? (
                  cities.map((city) => (
                    <div key={city.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
                      <FiMapPin size={12} style={{ color: colors.primary, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {city.name}
                      </span>
                      <span style={{ fontWeight: 700 }}>{city.count}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: colors.textDim }}>No location data</span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
