import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiCheckCircle,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiShield,
  FiStar,
  FiTarget,
  FiTrash2,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  RECOMMENDATION_WEIGHT_META,
  getRecommendationWeights,
  getVerificationApprovalMode,
  normalizeRecommendationWeights,
  saveRecommendationWeights,
} from '../lib/platformSettings';
import {
  badgeStyle,
  card,
  colors,
  ghostButton,
  input,
  primaryButton,
  radii,
} from '../lib/theme';
import {
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

const TABS = [
  { id: 'overview', label: 'Monitoring', icon: FiBarChart2 },
  { id: 'recommendation', label: 'Recommendation logic', icon: FiTarget },
  { id: 'featured', label: 'Featured approvals', icon: FiStar },
];

const number = (value) => Number(value || 0);

function engagementOf(item) {
  return (
    number(item.view_count) * 0.1 +
    number(item.like_count) * 3 +
    number(item.comment_count) * 4 +
    number(item.share_count) * 5 +
    number(item.save_count) * 6
  );
}

function freshnessOf(createdAt) {
  if (!createdAt) return 0.4;
  const days = Math.max(
    0,
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, 30 - days) / 30;
}

function formatDate(value) {
  if (!value) return 'No end date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No end date';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function itemImage(item) {
  const images = Array.isArray(item?.images) ? item.images : [];
  return images[0] || '';
}

function itemName(item) {
  return item?.name || item?.title || 'Untitled post';
}

export default function OpportunityEngine() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [featuredRows, setFeaturedRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [searches, setSearches] = useState([]);
  const [counts, setCounts] = useState({
    interactions: 0,
    searches: 0,
    reviews: 0,
    transactions: 0,
  });
  const [weights, setWeights] = useState(DEFAULT_RECOMMENDATION_WEIGHTS);
  const [verificationMode, setVerificationMode] = useState('manual');
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureForm, setFeatureForm] = useState({
    item_id: '',
    priority: 0,
    custom_label: 'Featured',
    badge_style: 'default',
    end_date: '',
  });
  const [featureSearch, setFeatureSearch] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        catalogResult,
        featuredResult,
        usersResult,
        interactionsResult,
        searchesResult,
        interactionCount,
        searchCount,
        reviewCount,
        transactionCount,
        storedWeights,
        storedMode,
      ] = await Promise.all([
        db('catalog')
          .select(
            'id,name,category,description,price,images,user_id,is_featured,status,created_at,view_count,like_count,share_count,comment_count,save_count,location'
          )
          .order('created_at', { ascending: false })
          .limit(600),
        db('featured_opportunities').select('*').order('priority', { ascending: true }).limit(200),
        db('users').select('id,full_name,email,kyc_verified').limit(600),
        db('user_interactions').select('*').order('created_at', { ascending: false }).limit(24),
        db('search_history').select('*').order('created_at', { ascending: false }).limit(24),
        db('user_interactions').select('*', { count: 'exact', head: true }),
        db('search_history').select('*', { count: 'exact', head: true }),
        db('reviews').select('*', { count: 'exact', head: true }),
        db('transactions').select('*', { count: 'exact', head: true }),
        getRecommendationWeights(),
        getVerificationApprovalMode(),
      ]);

      setCatalog(Array.isArray(catalogResult.data) ? catalogResult.data : []);
      setFeaturedRows(Array.isArray(featuredResult.data) ? featuredResult.data : []);
      setUsers(Array.isArray(usersResult.data) ? usersResult.data : []);
      setInteractions(Array.isArray(interactionsResult.data) ? interactionsResult.data : []);
      setSearches(Array.isArray(searchesResult.data) ? searchesResult.data : []);
      setCounts({
        interactions: interactionCount.count || 0,
        searches: searchCount.count || 0,
        reviews: reviewCount.count || 0,
        transactions: transactionCount.count || 0,
      });
      setWeights(storedWeights);
      setVerificationMode(storedMode);
    } catch (error) {
      setNotice({ tone: 'danger', message: error.message || 'Could not load engine data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog]
  );
  const usersById = useMemo(
    () => new Map(users.map((member) => [member.id, member])),
    [users]
  );
  const approvedFeatured = useMemo(
    () =>
      featuredRows
        .map((row) => ({
          ...row,
          item: catalogById.get(row.item_id) || null,
        }))
        .sort((a, b) => number(a.priority) - number(b.priority)),
    [featuredRows, catalogById]
  );
  const approvedIds = useMemo(
    () => new Set(featuredRows.map((row) => row.item_id)),
    [featuredRows]
  );
  const pendingFeatured = useMemo(
    () =>
      catalog
        .filter((item) => Boolean(item.is_featured) && !approvedIds.has(item.id))
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        ),
    [catalog, approvedIds]
  );
  const activeCatalog = useMemo(
    () => catalog.filter((item) => !item.status || item.status === 'active'),
    [catalog]
  );
  const verifiedCreators = useMemo(
    () => users.filter((member) => Boolean(member.kyc_verified)).length,
    [users]
  );
  const totalEngagement = useMemo(
    () => catalog.reduce((sum, item) => sum + engagementOf(item), 0),
    [catalog]
  );

  const topCategories = useMemo(() => {
    const map = new Map();
    for (const item of catalog) {
      const key = item.category || 'Uncategorised';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [catalog]);

  const topSearches = useMemo(() => {
    const map = new Map();
    for (const row of searches) {
      const query = String(row.query || '').trim();
      if (!query) continue;
      map.set(query, (map.get(query) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([query, count]) => ({ query, count }));
  }, [searches]);

  const rankedPreview = useMemo(() => {
    const maxEngagement = Math.max(1, ...catalog.map((item) => engagementOf(item)));
    return catalog
      .map((item) => {
        const owner = usersById.get(item.user_id);
        const featured = featuredRows.find((row) => row.item_id === item.id);
        const engagement = engagementOf(item) / maxEngagement;
        const score =
          engagement * weights.behavior +
          freshnessOf(item.created_at) * weights.freshness +
          (owner?.kyc_verified ? weights.verification : 0) +
          (featured ? weights.featured : 0) +
          weights.category * 0.45 +
          weights.rating * 0.45 +
          weights.proximity * 0.35;
        return {
          ...item,
          score: Math.round(score),
          isFeatured: Boolean(featured),
          isVerified: Boolean(owner?.kyc_verified),
          seller: owner?.full_name || 'Unknown seller',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [catalog, usersById, featuredRows, weights]);

  const featureCandidates = useMemo(() => {
    const needle = featureSearch.trim().toLowerCase();
    return catalog
      .filter((item) => !approvedIds.has(item.id))
      .filter((item) => {
        if (!needle) return true;
        return `${item.name || ''} ${item.category || ''}`.toLowerCase().includes(needle);
      })
      .slice(0, 30);
  }, [catalog, approvedIds, featureSearch]);

  const nextPriority = useMemo(() => {
    if (!approvedFeatured.length) return 0;
    return Math.max(...approvedFeatured.map((row) => number(row.priority))) + 10;
  }, [approvedFeatured]);

  const showNotice = (tone, message) => setNotice({ tone, message });

  const handleWeightChange = (key, value) => {
    setWeights((current) => ({ ...current, [key]: number(value) }));
  };

  const handleSaveWeights = async () => {
    setSaving(true);
    try {
      const result = await saveRecommendationWeights(weights);
      setWeights(normalizeRecommendationWeights(weights));
      showNotice(
        result.persisted ? 'success' : 'warning',
        result.persisted
          ? 'Recommendation weights saved. Mobile ranking will use the featured and verified boosts immediately.'
          : 'Saved locally. Create the platform_settings table to share this across admins and mobile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetWeights = async () => {
    setWeights(DEFAULT_RECOMMENDATION_WEIGHTS);
    setSaving(true);
    try {
      const result = await saveRecommendationWeights(DEFAULT_RECOMMENDATION_WEIGHTS);
      showNotice(
        result.persisted ? 'success' : 'warning',
        result.persisted
          ? 'Recommendation weights reset to defaults.'
          : 'Reset locally. Database persistence is unavailable.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openFeatureModal = (item = null) => {
    setFeatureSearch('');
    setFeatureForm({
      item_id: item?.id || '',
      priority: nextPriority,
      custom_label: 'Featured',
      badge_style: 'default',
      end_date: '',
    });
    setFeatureModalOpen(true);
  };

  const handleApproveFeatured = async () => {
    if (!featureForm.item_id) {
      showNotice('danger', 'Choose a post to feature.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        item_id: featureForm.item_id,
        item_type: 'product',
        priority: number(featureForm.priority),
        custom_label: featureForm.custom_label.trim() || 'Featured',
        badge_style: featureForm.badge_style || 'default',
        end_date: featureForm.end_date || null,
        created_by: user?.id || null,
      };
      const existing = featuredRows.find((row) => row.item_id === featureForm.item_id);
      const result = existing
        ? await db('featured_opportunities').update(payload).eq('id', existing.id)
        : await db('featured_opportunities').insert(payload);
      if (result.error) throw new Error(result.error.message);
      await db('catalog').update({ is_featured: true }).eq('id', featureForm.item_id);
      setFeatureModalOpen(false);
      showNotice('success', 'Post approved and published to the featured rail.');
      await loadData();
    } catch (error) {
      showNotice('danger', error.message || 'Could not approve this post.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePending = async (item) => {
    setSaving(true);
    try {
      const result = await db('featured_opportunities').insert({
        item_id: item.id,
        item_type: 'product',
        priority: nextPriority,
        custom_label: 'Featured',
        badge_style: 'default',
        end_date: null,
        created_by: user?.id || null,
      });
      if (result.error) throw new Error(result.error.message);
      await db('catalog').update({ is_featured: true }).eq('id', item.id);
      showNotice('success', `${itemName(item)} is now featured.`);
      await loadData();
    } catch (error) {
      showNotice('danger', error.message || 'Could not approve this post.');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectPending = async (item) => {
    setSaving(true);
    try {
      const result = await db('catalog').update({ is_featured: false }).eq('id', item.id);
      if (result.error) throw new Error(result.error.message);
      showNotice('success', `${itemName(item)} was removed from the featured queue.`);
      await loadData();
    } catch (error) {
      showNotice('danger', error.message || 'Could not reject this request.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFeatured = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      const result = await db('featured_opportunities').delete().eq('id', removeTarget.id);
      if (result.error) throw new Error(result.error.message);
      const remaining = featuredRows.filter(
        (row) => row.item_id === removeTarget.item_id && row.id !== removeTarget.id
      );
      if (!remaining.length) {
        await db('catalog').update({ is_featured: false }).eq('id', removeTarget.item_id);
      }
      setRemoveTarget(null);
      showNotice('success', 'Featured placement removed.');
      await loadData();
    } catch (error) {
      showNotice('danger', error.message || 'Could not remove this placement.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveFeatured = async (row, direction) => {
    const ordered = [...approvedFeatured];
    const index = ordered.findIndex((item) => item.id === row.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    setSaving(true);
    try {
      const next = [...ordered];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      await Promise.all(
        next.map((item, position) =>
          db('featured_opportunities')
            .update({ priority: position * 10 })
            .eq('id', item.id)
        )
      );
      showNotice('success', 'Featured order updated.');
      await loadData();
    } catch (error) {
      showNotice('danger', error.message || 'Could not reorder featured posts.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFeatureItem = catalogById.get(featureForm.item_id);

  const renderOverview = () => (
    <>
      <div style={styles.statsGrid}>
        <StatCard
          icon={FiActivity}
          label="Live catalog"
          value={activeCatalog.length}
          detail={`${catalog.length} total posts`}
          tone="primary"
        />
        <StatCard
          icon={FiStar}
          label="Featured live"
          value={approvedFeatured.length}
          detail={`${pendingFeatured.length} awaiting approval`}
          tone="warning"
        />
        <StatCard
          icon={FiShield}
          label="Blue-tick creators"
          value={verifiedCreators}
          detail="Verified providers, shops and institutions"
          tone="success"
        />
        <StatCard
          icon={FiTrendingUp}
          label="Engagement events"
          value={Math.round(totalEngagement)}
          detail={`${counts.interactions} tracked interactions`}
          tone="purple"
        />
      </div>

      <div style={styles.twoColumn}>
        <section style={{ ...card, padding: 18 }}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>Discovery</div>
              <h3 style={styles.sectionTitle}>What the feed is learning from</h3>
            </div>
            <FiTarget size={18} color={colors.primary} />
          </div>
          <div style={styles.categoryList}>
            {topCategories.length ? (
              topCategories.map((category) => {
                const max = topCategories[0]?.count || 1;
                return (
                  <div key={category.name} style={styles.categoryRow}>
                    <div style={styles.categoryMeta}>
                      <span>{category.name}</span>
                      <span style={styles.muted}>{category.count} posts</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${Math.max(6, (category.count / max) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.muted}>No catalog categories yet.</div>
            )}
          </div>
        </section>

        <section style={{ ...card, padding: 18 }}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>Search behaviour</div>
              <h3 style={styles.sectionTitle}>Recent demand signals</h3>
            </div>
            <FiSearch size={18} color={colors.teal} />
          </div>
          {topSearches.length ? (
            <div style={styles.signalList}>
              {topSearches.map((search) => (
                <div key={search.query} style={styles.signalRow}>
                  <span style={styles.signalName}>{search.query}</span>
                  <span style={styles.signalCount}>{search.count}×</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.muted}>No recent searches recorded.</div>
          )}
          <div style={styles.signalFooter}>
            <span>{counts.searches} total searches</span>
            <span>{counts.reviews} reviews</span>
            <span>{counts.transactions} transactions</span>
          </div>
        </section>
      </div>

      <div style={styles.twoColumn}>
        <section style={{ ...card, padding: 18 }}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>Featured policy</div>
              <h3 style={styles.sectionTitle}>Approval is required</h3>
            </div>
            <FiCheckCircle size={18} color={colors.success} />
          </div>
          <p style={styles.paragraph}>
            Featured posts are only published after an admin approves them here. Mobile and web
            rank approved featured posts above normal discovery, ordered by the priority you set.
          </p>
          <div style={styles.policyPills}>
            <span style={badgeStyle('success')}>Admin approved only</span>
            <span style={badgeStyle('primary')}>Featured-first ranking</span>
            <span style={badgeStyle(verificationMode === 'automatic' ? 'warning' : 'neutral')}>
              Verification: {verificationMode}
            </span>
          </div>
        </section>

        <section style={{ ...card, padding: 18 }}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>Recent activity</div>
              <h3 style={styles.sectionTitle}>App behaviour stream</h3>
            </div>
            <FiEye size={18} color={colors.purple} />
          </div>
          {interactions.length ? (
            <div style={styles.activityList}>
              {interactions.slice(0, 8).map((row) => {
                const item = catalogById.get(row.item_id);
                return (
                  <div key={row.id} style={styles.activityRow}>
                    <div style={styles.activityIcon}>
                      <FiZap size={13} />
                    </div>
                    <div style={styles.activityText}>
                      <strong>{row.interaction_type || row.action || 'interaction'}</strong>
                      <span style={styles.muted}>
                        {' '}
                        on {itemName(item) || row.item_id}
                      </span>
                    </div>
                    <span style={styles.activityTime}>{formatWhen(row.created_at)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.muted}>No interaction events recorded yet.</div>
          )}
        </section>
      </div>
    </>
  );

  const renderRecommendation = () => (
    <>
      <Notice tone="primary">
        These weights control the discovery logic. Admin-featured posts receive the featured boost
        and are ranked first; blue-tick sellers receive the verification boost. Weights are relative.
      </Notice>

      <div style={styles.recommendationLayout}>
        <section style={{ ...card, padding: 18 }}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>Ranking model</div>
              <h3 style={styles.sectionTitle}>Feed weights</h3>
            </div>
            <FiTarget size={18} color={colors.primary} />
          </div>

          <div style={styles.weightList}>
            {RECOMMENDATION_WEIGHT_META.map((meta) => (
              <div key={meta.key} style={styles.weightRow}>
                <div style={styles.weightHeader}>
                  <div>
                    <div style={styles.weightLabel}>{meta.label}</div>
                    <div style={styles.weightHint}>{meta.hint}</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[meta.key]}
                    onChange={(event) => handleWeightChange(meta.key, event.target.value)}
                    style={styles.numberInput}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights[meta.key]}
                  onChange={(event) => handleWeightChange(meta.key, event.target.value)}
                  style={styles.range}
                />
              </div>
            ))}
          </div>

          <div style={styles.actionsRow}>
            <button type="button" onClick={handleSaveWeights} disabled={saving} style={primaryButton}>
              <FiSave size={14} /> {saving ? 'Saving…' : 'Save weights'}
            </button>
            <button type="button" onClick={handleResetWeights} disabled={saving} style={ghostButton}>
              Reset defaults
            </button>
          </div>
        </section>

        <section style={{ ...card, padding: 18 }}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>Live preview</div>
              <h3 style={styles.sectionTitle}>Current top ranking</h3>
            </div>
            <FiBarChart2 size={18} color={colors.teal} />
          </div>
          <div style={styles.previewList}>
            {rankedPreview.length ? (
              rankedPreview.map((item, index) => (
                <div key={item.id} style={styles.previewRow}>
                  <span style={styles.previewRank}>{index + 1}</span>
                  <div style={styles.previewImageWrap}>
                    {itemImage(item) ? (
                      <img src={itemImage(item)} alt="" style={styles.previewImage} />
                    ) : (
                      <div style={styles.previewImageFallback}>
                        <FiStar size={14} />
                      </div>
                    )}
                  </div>
                  <div style={styles.previewInfo}>
                    <div style={styles.previewTitle}>{itemName(item)}</div>
                    <div style={styles.previewMeta}>
                      {item.seller} · {item.category || 'Uncategorised'}
                    </div>
                    <div style={styles.previewBadges}>
                      {item.isFeatured && <span style={badgeStyle('warning')}>Featured</span>}
                      {item.isVerified && <span style={badgeStyle('primary')}>Blue tick</span>}
                    </div>
                  </div>
                  <div style={styles.scoreWrap}>
                    <div style={styles.scoreValue}>{item.score}</div>
                    <div style={styles.scoreBar}>
                      <div
                        style={{
                          ...styles.scoreFill,
                          width: `${Math.min(100, Math.max(6, item.score))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={FiTarget}
                title="No catalog data"
                description="Add catalog posts to preview the recommendation ranking."
              />
            )}
          </div>
        </section>
      </div>
    </>
  );

  const renderFeatured = () => (
    <>
      <Notice tone="warning">
        A post can only appear in the featured rail after admin approval. Pending items are catalog
        posts marked as featured by sellers; approve them or reject the request.
      </Notice>

      <Toolbar>
        <button type="button" onClick={() => openFeatureModal()} style={primaryButton}>
          <FiPlus size={14} /> Add featured post
        </button>
        <button type="button" onClick={loadData} disabled={loading} style={ghostButton}>
          <FiRefreshCw size={14} /> Refresh
        </button>
        <span style={styles.toolbarMeta}>
          {approvedFeatured.length} live · {pendingFeatured.length} pending
        </span>
      </Toolbar>

      <section style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionEyebrow}>Approval queue</div>
            <h3 style={styles.sectionTitle}>Pending featured requests</h3>
          </div>
          <span style={badgeStyle(pendingFeatured.length ? 'warning' : 'neutral')}>
            {pendingFeatured.length} pending
          </span>
        </div>

        {pendingFeatured.length ? (
          <div style={styles.pendingGrid}>
            {pendingFeatured.slice(0, 12).map((item) => {
              const owner = usersById.get(item.user_id);
              return (
                <div key={item.id} style={styles.pendingCard}>
                  <div style={styles.pendingImageWrap}>
                    {itemImage(item) ? (
                      <img src={itemImage(item)} alt="" style={styles.pendingImage} />
                    ) : (
                      <div style={styles.pendingImageFallback}>
                        <FiStar size={18} />
                      </div>
                    )}
                  </div>
                  <div style={styles.pendingBody}>
                    <div style={styles.pendingTitle}>{itemName(item)}</div>
                    <div style={styles.pendingMeta}>
                      {owner?.full_name || 'Unknown seller'} · {item.category || 'Uncategorised'}
                    </div>
                    <div style={styles.pendingActions}>
                      <button
                        type="button"
                        onClick={() => handleApprovePending(item)}
                        disabled={saving}
                        style={{ ...primaryButton, padding: '7px 11px', fontSize: 11 }}
                      >
                        <FiCheckCircle size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openFeatureModal(item)}
                        style={{ ...ghostButton, padding: '7px 11px', fontSize: 11 }}
                      >
                        Configure
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectPending(item)}
                        disabled={saving}
                        style={{ ...ghostButton, padding: '7px 11px', fontSize: 11, color: colors.danger }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={FiCheckCircle}
            title="No pending requests"
            description="When a seller marks a catalog post as featured, it will appear here for approval."
          />
        )}
      </section>

      <section style={{ ...card, padding: 18 }}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionEyebrow}>Live placements</div>
            <h3 style={styles.sectionTitle}>Featured rail order</h3>
          </div>
          <span style={badgeStyle('success')}>{approvedFeatured.length} live</span>
        </div>

        {approvedFeatured.length ? (
          <TableShell>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Post</Th>
                  <Th>Seller</Th>
                  <Th>Label</Th>
                  <Th>Priority</Th>
                  <Th>Ends</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {approvedFeatured.map((row, index) => {
                  const owner = usersById.get(row.item?.user_id);
                  return (
                    <tr key={row.id}>
                      <Td>{index + 1}</Td>
                      <Td>
                        <div style={styles.tableItem}>
                          <div style={styles.tableImageWrap}>
                            {itemImage(row.item) ? (
                              <img src={itemImage(row.item)} alt="" style={styles.tableImage} />
                            ) : (
                              <div style={styles.tableImageFallback}>
                                <FiStar size={12} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={styles.tableTitle}>{itemName(row.item)}</div>
                            <div style={styles.muted}>
                              {row.item?.category || 'Uncategorised'}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>{owner?.full_name || 'Unknown seller'}</Td>
                      <Td>
                        <span style={badgeStyle(row.badge_style === 'default' ? 'primary' : 'warning')}>
                          {row.custom_label || 'Featured'}
                        </span>
                      </Td>
                      <Td>{number(row.priority)}</Td>
                      <Td>{formatDate(row.end_date)}</Td>
                      <Td>
                        <div style={styles.rowActions}>
                          <button
                            type="button"
                            onClick={() => handleMoveFeatured(row, 'up')}
                            disabled={saving || index === 0}
                            style={styles.iconButton}
                            title="Move up"
                          >
                            <FiArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFeatured(row, 'down')}
                            disabled={saving || index === approvedFeatured.length - 1}
                            style={styles.iconButton}
                            title="Move down"
                          >
                            <FiArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(row)}
                            disabled={saving}
                            style={{ ...styles.iconButton, color: colors.danger }}
                            title="Remove"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        ) : (
          <EmptyState
            icon={FiStar}
            title="No featured posts"
            description="Approve a pending request or add a catalog post to the featured rail."
            action={
              <button type="button" onClick={() => openFeatureModal()} style={primaryButton}>
                <FiPlus size={14} /> Add featured post
              </button>
            }
          />
        )}
      </section>
    </>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Platform intelligence"
        title="Opportunity Engine"
        subtitle="Monitor discovery behaviour, tune the recommendation logic and approve the featured posts that get premium placement."
        actions={
          <button type="button" onClick={loadData} disabled={loading} style={ghostButton}>
            <FiRefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {notice && (
        <div style={{ marginBottom: 14 }}>
          <Notice tone={notice.tone}>{notice.message}</Notice>
        </div>
      )}

      <div style={styles.tabBar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(active ? styles.tabButtonActive : null),
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'recommendation' && renderRecommendation()}
      {activeTab === 'featured' && renderFeatured()}

      {featureModalOpen && (
        <Modal
          title="Approve featured post"
          subtitle="Choose a catalog post and the placement details. It will be ranked first on mobile and web."
          onClose={() => setFeatureModalOpen(false)}
          width={620}
          footer={
            <>
              <button type="button" onClick={() => setFeatureModalOpen(false)} style={ghostButton}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveFeatured}
                disabled={saving || !featureForm.item_id}
                style={{ ...primaryButton, opacity: saving || !featureForm.item_id ? 0.6 : 1 }}
              >
                <FiCheckCircle size={14} /> {saving ? 'Saving…' : 'Approve featured'}
              </button>
            </>
          }
        >
          <div style={styles.modalBody}>
            <Field label="Search catalog" hint="Only posts not already featured are shown.">
              <SearchInput
                value={featureSearch}
                onChange={setFeatureSearch}
                placeholder="Search by name or category…"
              />
            </Field>

            <div style={styles.candidateList}>
              {featureCandidates.length ? (
                featureCandidates.map((item) => {
                  const owner = usersById.get(item.user_id);
                  const selected = featureForm.item_id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFeatureForm((current) => ({ ...current, item_id: item.id }))}
                      style={{
                        ...styles.candidateRow,
                        ...(selected ? styles.candidateRowSelected : null),
                      }}
                    >
                      <div style={styles.candidateImageWrap}>
                        {itemImage(item) ? (
                          <img src={itemImage(item)} alt="" style={styles.candidateImage} />
                        ) : (
                          <div style={styles.candidateImageFallback}>
                            <FiStar size={13} />
                          </div>
                        )}
                      </div>
                      <div style={styles.candidateInfo}>
                        <div style={styles.candidateTitle}>{itemName(item)}</div>
                        <div style={styles.muted}>
                          {owner?.full_name || 'Unknown seller'} · {item.category || 'Uncategorised'}
                        </div>
                      </div>
                      {selected && <FiCheckCircle size={16} color={colors.success} />}
                    </button>
                  );
                })
              ) : (
                <div style={styles.muted}>No matching catalog posts.</div>
              )}
            </div>

            {selectedFeatureItem && (
              <div style={styles.selectedFeature}>
                <div style={styles.selectedFeatureLabel}>Selected post</div>
                <div style={styles.selectedFeatureName}>{itemName(selectedFeatureItem)}</div>
              </div>
            )}

            <div style={styles.formGrid}>
              <Field label="Priority" hint="Lower numbers appear first.">
                <input
                  type="number"
                  value={featureForm.priority}
                  onChange={(event) =>
                    setFeatureForm((current) => ({ ...current, priority: event.target.value }))
                  }
                  style={input}
                />
              </Field>
              <Field label="Badge label">
                <input
                  value={featureForm.custom_label}
                  onChange={(event) =>
                    setFeatureForm((current) => ({ ...current, custom_label: event.target.value }))
                  }
                  style={input}
                  placeholder="Featured"
                />
              </Field>
              <Field label="Badge style">
                <select
                  value={featureForm.badge_style}
                  onChange={(event) =>
                    setFeatureForm((current) => ({ ...current, badge_style: event.target.value }))
                  }
                  style={input}
                >
                  <option value="default">Default</option>
                  <option value="premium">Premium</option>
                  <option value="spotlight">Spotlight</option>
                </select>
              </Field>
              <Field label="End date" hint="Leave empty for no expiry.">
                <input
                  type="date"
                  value={featureForm.end_date}
                  onChange={(event) =>
                    setFeatureForm((current) => ({ ...current, end_date: event.target.value }))
                  }
                  style={input}
                />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {removeTarget && (
        <Modal
          title="Remove featured placement?"
          subtitle="The post will stop receiving premium placement on mobile and web."
          onClose={() => setRemoveTarget(null)}
          width={430}
          footer={
            <>
              <button type="button" onClick={() => setRemoveTarget(null)} style={ghostButton}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveFeatured}
                disabled={saving}
                style={{ ...ghostButton, color: colors.danger }}
              >
                <FiTrash2 size={14} /> {saving ? 'Removing…' : 'Remove'}
              </button>
            </>
          }
        >
          <div style={styles.modalBody}>
            <Notice tone="danger">
              <strong>{itemName(removeTarget.item)}</strong> will no longer be featured.
            </Notice>
          </div>
        </Modal>
      )}

      {!loading && !catalog.length && activeTab !== 'recommendation' && (
        <div style={{ marginTop: 16 }}>
          <Notice tone="warning">
            <FiAlertCircle size={14} /> No catalog posts found. Check the data source or add posts
            from the Content page.
          </Notice>
        </div>
      )}
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: 4,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: colors.text,
  },
  paragraph: {
    margin: '0 0 14px',
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 1.65,
  },
  muted: {
    color: colors.textDim,
    fontSize: 11,
  },
  categoryList: {
    display: 'grid',
    gap: 11,
  },
  categoryRow: {
    display: 'grid',
    gap: 5,
  },
  categoryMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 12,
    color: colors.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    background: `linear-gradient(90deg, ${colors.primary}, ${colors.purple})`,
  },
  signalList: {
    display: 'grid',
    gap: 8,
  },
  signalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '9px 11px',
    borderRadius: radii.md,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    fontSize: 12,
  },
  signalName: {
    color: colors.text,
    fontWeight: 600,
  },
  signalCount: {
    color: colors.teal,
    fontWeight: 700,
  },
  signalFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    fontSize: 10,
    color: colors.textDim,
  },
  policyPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
  },
  activityList: {
    display: 'grid',
    gap: 8,
  },
  activityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  activityIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    color: colors.purple,
    background: colors.purpleSoft,
    flexShrink: 0,
  },
  activityText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  activityTime: {
    fontSize: 10,
    color: colors.textDim,
    whiteSpace: 'nowrap',
  },
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: 6,
    marginBottom: 16,
    borderRadius: radii.lg,
    background: colors.bgSoft,
    border: `1px solid ${colors.border}`,
  },
  tabButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 13px',
    borderRadius: radii.md,
    border: '1px solid transparent',
    background: 'transparent',
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  tabButtonActive: {
    background: colors.primarySoft,
    border: `1px solid ${colors.primaryBorder}`,
    color: colors.text,
  },
  recommendationLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 16,
    marginTop: 16,
  },
  weightList: {
    display: 'grid',
    gap: 15,
  },
  weightRow: {
    display: 'grid',
    gap: 7,
  },
  weightHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  weightLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
  },
  weightHint: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textDim,
    lineHeight: 1.4,
  },
  numberInput: {
    width: 58,
    padding: '7px 8px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  range: {
    width: '100%',
    accentColor: colors.primary,
  },
  actionsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  previewList: {
    display: 'grid',
    gap: 9,
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '9px',
    borderRadius: radii.md,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
  },
  previewRank: {
    width: 18,
    fontSize: 10,
    fontWeight: 800,
    color: colors.textDim,
    textAlign: 'center',
  },
  previewImageWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    background: colors.bg,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  previewImageFallback: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: colors.textDim,
  },
  previewInfo: {
    flex: 1,
    minWidth: 0,
  },
  previewTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: colors.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  previewMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textDim,
  },
  previewBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  scoreWrap: {
    width: 58,
    textAlign: 'right',
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: 800,
    color: colors.primary,
  },
  scoreBar: {
    height: 4,
    marginTop: 4,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 999,
    background: colors.primary,
  },
  toolbarMeta: {
    marginLeft: 'auto',
    fontSize: 10,
    color: colors.textDim,
  },
  pendingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 10,
  },
  pendingCard: {
    display: 'flex',
    gap: 10,
    padding: 10,
    borderRadius: radii.md,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
  },
  pendingImageWrap: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    background: colors.bg,
  },
  pendingImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  pendingImageFallback: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: colors.textDim,
  },
  pendingBody: {
    minWidth: 0,
    flex: 1,
  },
  pendingTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: colors.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pendingMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textDim,
  },
  pendingActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 720,
  },
  tableItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tableImageWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    background: colors.bg,
    flexShrink: 0,
  },
  tableImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  tableImageFallback: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: colors.textDim,
  },
  tableTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: colors.text,
  },
  rowActions: {
    display: 'flex',
    gap: 5,
  },
  iconButton: {
    width: 27,
    height: 27,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 7,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
    color: colors.textMuted,
    cursor: 'pointer',
  },
  modalBody: {
    display: 'grid',
    gap: 14,
    padding: '18px 20px 20px',
  },
  candidateList: {
    display: 'grid',
    gap: 6,
    maxHeight: 260,
    overflowY: 'auto',
    paddingRight: 4,
  },
  candidateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: 8,
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
    color: colors.text,
    textAlign: 'left',
    cursor: 'pointer',
  },
  candidateRowSelected: {
    border: `1px solid ${colors.primaryBorder}`,
    background: colors.primarySoft,
  },
  candidateImageWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    background: colors.bg,
    flexShrink: 0,
  },
  candidateImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  candidateImageFallback: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: colors.textDim,
  },
  candidateInfo: {
    flex: 1,
    minWidth: 0,
  },
  candidateTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  selectedFeature: {
    padding: 10,
    borderRadius: radii.md,
    background: colors.successSoft,
    border: '1px solid rgba(46,204,113,0.25)',
  },
  selectedFeatureLabel: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.success,
  },
  selectedFeatureName: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  },
};
