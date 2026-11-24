import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiImage,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiTag,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  category: '',
  subcategory: '',
  brand: '',
  description: '',
  price: '',
  price_type: 'fixed',
  location: '',
  status: 'active',
  is_active: true,
  duration: '',
  images: [],
  tags: [],
  specifications: {},
  user_id: '',
};

const selectStyle = {
  ...input,
  width: 'auto',
  minWidth: 150,
  cursor: 'pointer',
};

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => (typeof image === 'string' ? image : image?.url || image?.publicUrl))
    .filter(Boolean);
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function normalizeSpecs(specs) {
  if (!specs) return {};
  if (typeof specs === 'object' && !Array.isArray(specs)) return specs;
  return {};
}

function itemName(item) {
  return item?.name || 'Untitled content';
}

function itemImage(item) {
  return normalizeImages(item?.images)[0] || item?.video_thumbnail || '';
}

export default function Content() {
  const { user } = useAuth();
  const { formatMoney, dataSourceLabel } = useAppSettings();
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);

  const table = tab === 'posts' ? 'catalog' : 'service_catalog';
  const items = tab === 'posts' ? posts : services;

  const setItems = (updater) => {
    if (tab === 'posts') setPosts(updater);
    else setServices(updater);
  };

  const flash = (tone, text) => {
    setNotice({ tone, text });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postResult, serviceResult, userResult] = await Promise.all([
        db('catalog').select('*').order('created_at', { ascending: false }).limit(2000),
        db('service_catalog').select('*').order('created_at', { ascending: false }).limit(2000),
        db('users').select('id,full_name,email,avatar_url').limit(2000),
      ]);

      if (postResult.error) throw new Error(postResult.error.message);
      if (serviceResult.error) throw new Error(serviceResult.error.message);

      setPosts(postResult.data || []);
      setServices(serviceResult.data || []);
      setUsers(userResult.data || []);
    } catch (error) {
      flash('danger', error.message || 'Could not load content.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelected(null);
    setPage(1);
    setCategoryFilter('all');
    setStatusFilter('all');
  }, [tab]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((member) => map.set(member.id, member));
    return map;
  }, [users]);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
    [items]
  );

  const stats = useMemo(() => {
    const totalViews = posts.reduce((sum, post) => sum + Number(post.view_count || 0), 0);
    const totalLikes = posts.reduce((sum, post) => sum + Number(post.like_count || 0), 0);
    const totalSaves = posts.reduce((sum, post) => sum + Number(post.save_count || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + Number(post.comment_count || 0), 0);
    return {
      posts: posts.length,
      services: services.length,
      active:
        posts.filter((post) => post.is_active !== false).length +
        services.filter((service) => service.is_active !== false).length,
      categories: new Set([
        ...posts.map((post) => post.category),
        ...services.map((service) => service.category),
      ].filter(Boolean)).size,
      views: totalViews,
      engagement: totalLikes + totalSaves + totalComments,
    };
  }, [posts, services]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const author = userMap.get(item.user_id);
        const haystack = [
          item.name,
          item.category,
          item.subcategory,
          item.brand,
          item.description,
          ...normalizeTags(item.tags),
          author?.full_name,
          author?.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = !query || haystack.includes(query);
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && item.is_active !== false) ||
          (statusFilter === 'inactive' && item.is_active === false) ||
          item.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === 'name') return itemName(a).localeCompare(itemName(b));
        if (sort === 'views') return Number(b.view_count || 0) - Number(a.view_count || 0);
        if (sort === 'engagement') {
          const score = (item) =>
            Number(item.like_count || 0) +
            Number(item.save_count || 0) +
            Number(item.comment_count || 0) +
            Number(item.share_count || 0);
          return score(b) - score(a);
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [items, search, categoryFilter, statusFilter, sort, userMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, user_id: user?.id || '' });
    setSpecKey('');
    setSpecValue('');
    setTagInput('');
    setImageInput('');
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      brand: item.brand || '',
      description: item.description || '',
      price: item.price ?? '',
      price_type: item.price_type || 'fixed',
      location: item.location || '',
      status: item.status || 'active',
      is_active: item.is_active !== false,
      duration: item.duration || '',
      images: normalizeImages(item.images),
      tags: normalizeTags(item.tags),
      specifications: normalizeSpecs(item.specifications),
      user_id: item.user_id || '',
    });
    setSpecKey('');
    setSpecValue('');
    setTagInput('');
    setImageInput('');
    setFormOpen(true);
  };

  const addSpec = () => {
    if (!specKey.trim()) return;
    setForm((current) => ({
      ...current,
      specifications: {
        ...current.specifications,
        [specKey.trim()]: specValue.trim(),
      },
    }));
    setSpecKey('');
    setSpecValue('');
  };

  const removeSpec = (key) => {
    setForm((current) => {
      const next = { ...current.specifications };
      delete next[key];
      return { ...current, specifications: next };
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    setForm((current) =>
      current.tags.includes(tag)
        ? current
        : { ...current, tags: [...current.tags, tag] }
    );
    setTagInput('');
  };

  const addImageUrl = () => {
    const url = imageInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      flash('danger', 'Enter a valid image URL.');
      return;
    }
    setForm((current) => ({ ...current, images: [...current.images, url] }));
    setImageInput('');
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const folder = tab === 'posts' ? 'posts' : 'services';
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const { error } = await supabase.storage
        .from('catalog-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('catalog-images').getPublicUrl(path);
      if (data?.publicUrl) {
        setForm((current) => ({
          ...current,
          images: [...current.images, data.publicUrl],
        }));
      }
    } catch (error) {
      flash('danger', `Upload failed: ${error.message}`);
    }
    setUploading(false);
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      flash('danger', 'Content name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || 'General',
        subcategory: form.subcategory.trim() || null,
        description: form.description.trim() || null,
        images: form.images,
        tags: form.tags,
        specifications: form.specifications,
        is_active: form.is_active,
        price_type: form.price_type || null,
      };

      if (tab === 'posts') {
        payload.brand = form.brand.trim() || null;
        payload.price = Number(form.price || 0);
        payload.location = form.location.trim() || null;
        payload.status = form.status || 'active';
        if (form.user_id) payload.user_id = form.user_id;
      } else {
        payload.duration = form.duration.trim() || null;
        payload.brand = form.brand.trim() || null;
      }

      if (editing) {
        const { data, error } = await db(table)
          .update(payload)
          .eq('id', editing.id)
          .select('*')
          .maybeSingle();
        if (error) throw new Error(error.message);
        const updated = data || { ...editing, ...payload };
        setItems((current) =>
          current.map((item) => (item.id === editing.id ? updated : item))
        );
        setSelected((current) => (current?.id === editing.id ? updated : current));
        flash('success', `${itemName(updated)} updated.`);
      } else {
        const { data, error } = await db(table).insert(payload).select('*').maybeSingle();
        if (error) throw new Error(error.message);
        if (data) setItems((current) => [data, ...current]);
        flash('success', `${itemName(data || payload)} added to ${tab === 'posts' ? 'content' : 'services'}.`);
      }

      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      flash('danger', error.message || 'Could not save content.');
    }
    setSaving(false);
  };

  const toggleActive = async (item) => {
    const next = item.is_active === false;
    const { error } = await db(table).update({ is_active: next }).eq('id', item.id);
    if (error) {
      flash('danger', error.message);
      return;
    }
    const updated = { ...item, is_active: next };
    setItems((current) => current.map((row) => (row.id === item.id ? updated : row)));
    setSelected((current) => (current?.id === item.id ? updated : current));
    flash('success', `${itemName(item)} is now ${next ? 'active' : 'inactive'}.`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await db(table).delete().eq('id', deleteTarget.id);
    if (error) {
      flash('danger', error.message);
    } else {
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      flash('success', `${itemName(deleteTarget)} deleted.`);
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const statusBadge = (item) => {
    if (item.is_active === false) return <span style={badgeStyle('danger')}>Inactive</span>;
    if (item.status === 'draft') return <span style={badgeStyle('warning')}>Draft</span>;
    if (item.status === 'archived') return <span style={badgeStyle('neutral')}>Archived</span>;
    return <span style={badgeStyle('success')}>Active</span>;
  };

  const authorFor = (item) => {
    const author = userMap.get(item.user_id);
    return {
      name: author?.full_name || author?.email || 'Munolink member',
      email: author?.email || '',
      avatar: author?.avatar_url || '',
    };
  };

  return (
    <div style={{ padding: '30px 32px' }}>
      <PageHeader
        eyebrow="Community / Content"
        title="Content"
        subtitle="Manage catalog posts, services, media and engagement from one workspace."
        actions={
          <>
            <button type="button" onClick={fetchData} style={ghostButton} disabled={loading}>
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={openAdd} style={primaryButton}>
              <FiPlus size={15} /> Add {tab === 'posts' ? 'post' : 'service'}
            </button>
          </>
        }
      />

      {notice ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={FiFileText} label="Catalog posts" value={formatNumber(stats.posts)} detail="Buyer-facing content" tone="primary" />
        <StatCard icon={FiLayers} label="Services" value={formatNumber(stats.services)} detail="Bookable service catalog" tone="teal" />
        <StatCard icon={FiCheckCircle} label="Active" value={formatNumber(stats.active)} detail={`${formatNumber(stats.posts + stats.services)} total items`} tone="success" />
        <StatCard icon={FiTag} label="Categories" value={formatNumber(stats.categories)} detail="Across posts and services" tone="purple" />
        <StatCard icon={FiEye} label="Post views" value={formatNumber(stats.views)} detail={`${formatNumber(stats.engagement)} engagement actions`} tone="warning" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { key: 'posts', label: `Posts (${posts.length})` },
          { key: 'services', label: `Services (${services.length})` },
        ].map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            style={{
              padding: '9px 16px',
              borderRadius: radii.md,
              border: `1px solid ${tab === entry.key ? colors.primaryBorder : colors.border}`,
              background: tab === entry.key ? colors.primarySoft : colors.surface,
              color: tab === entry.key ? colors.primary : colors.textMuted,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {entry.label}
          </button>
        ))}
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
          placeholder="Search name, category, tags, author…"
          style={{ flex: 1, minWidth: 240 }}
        />
        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          style={selectStyle}
        >
          <option value="newest">Newest first</option>
          <option value="engagement">Most engaging</option>
          <option value="views">Most viewed</option>
          <option value="name">Name A–Z</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>
          {formatNumber(filtered.length)} items
        </span>
      </Toolbar>

      {loading ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
          Loading content…
        </div>
      ) : paged.length === 0 ? (
        <div style={cardStyle}>
          <EmptyState
            icon={FiBookOpen}
            title="No content matches your filters"
            description="Try a different search, category or status. You can also add a new post or service."
            action={<button type="button" onClick={openAdd} style={primaryButton}><FiPlus size={14} /> Add content</button>}
          />
        </div>
      ) : (
        <TableShell>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Content</Th>
                {tab === 'posts' ? <Th>Author</Th> : <Th>Duration</Th>}
                <Th>{tab === 'posts' ? 'Price' : 'Type'}</Th>
                <Th>{tab === 'posts' ? 'Engagement' : 'Category'}</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th style={{ textAlign: 'right' }}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => {
                const image = itemImage(item);
                const author = authorFor(item);
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    style={{ cursor: 'pointer' }}
                    className="table-row"
                  >
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={thumbStyle}>
                          {image ? (
                            <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FiImage size={17} color={colors.textDim} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                            {itemName(item)}
                          </div>
                          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                            {item.category || 'General'}
                            {item.subcategory ? ` · ${item.subcategory}` : ''}
                            {item.brand ? ` · ${item.brand}` : ''}
                          </div>
                        </div>
                      </div>
                    </Td>
                    {tab === 'posts' ? (
                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={avatarStyle}>{author.avatar ? <img src={author.avatar} alt="" style={avatarImageStyle} /> : initials(author.name)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{author.name}</div>
                            <div style={{ fontSize: 9.5, color: colors.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{author.email || 'No email'}</div>
                          </div>
                        </div>
                      </Td>
                    ) : (
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: colors.textMuted }}>
                          <FiClock size={12} /> {item.duration || item.specifications?.duration || 'Flexible'}
                        </span>
                      </Td>
                    )}
                    <Td>
                      {tab === 'posts' ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(item.price)}</div>
                          <div style={{ fontSize: 9.5, color: colors.textDim }}>{item.price_type || 'fixed'}</div>
                        </div>
                      ) : (
                        <span style={badgeStyle('purple')}>{item.price_type || 'Service'}</span>
                      )}
                    </Td>
                    <Td>
                      {tab === 'posts' ? (
                        <div style={{ display: 'flex', gap: 9, fontSize: 10, color: colors.textMuted }}>
                          <span title="Views"><FiEye size={11} /> {formatNumber(item.view_count)}</span>
                          <span title="Likes"><FiActivity size={11} /> {formatNumber(item.like_count)}</span>
                          <span title="Saves"><FiBookOpen size={11} /> {formatNumber(item.save_count)}</span>
                        </div>
                      ) : (
                        <span style={badgeStyle('neutral')}>{item.category || 'General'}</span>
                      )}
                    </Td>
                    <Td>{statusBadge(item)}</Td>
                    <Td>
                      <span style={{ fontSize: 10.5, color: colors.textMuted }}>{timeAgo(item.created_at)}</span>
                    </Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 5 }} onClick={(event) => event.stopPropagation()}>
                        <IconButton title="View" onClick={() => setSelected(item)}><FiEye size={13} /></IconButton>
                        <IconButton title={item.is_active === false ? 'Activate' : 'Deactivate'} onClick={() => toggleActive(item)}>
                          {item.is_active === false ? <FiEye size={13} /> : <FiEyeOff size={13} />}
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
            Page {currentPage} of {totalPages} · {formatNumber(filtered.length)} items
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
          title={itemName(selected)}
          subtitle={`${tab === 'posts' ? 'Catalog post' : 'Service listing'} · ${selected.category || 'General'}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <button type="button" onClick={() => setDeleteTarget(selected)} style={dangerButton}>
                <FiTrash2 size={14} /> Delete
              </button>
              <button type="button" onClick={() => openEdit(selected)} style={primaryButton}>
                <FiEdit2 size={14} /> Edit content
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ ...thumbStyle, width: 72, height: 72, borderRadius: 14 }}>
              {itemImage(selected) ? (
                <img src={itemImage(selected)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FiImage size={22} color={colors.textDim} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 7 }}>
                {statusBadge(selected)}
                <span style={badgeStyle('neutral')}>{selected.category || 'General'}</span>
                {tab === 'posts' ? <span style={badgeStyle('primary')}>{selected.price_type || 'fixed'}</span> : null}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>
                Created {timeAgo(selected.created_at)} · Updated {timeAgo(selected.updated_at)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 18 }}>
            <DetailTile label={tab === 'posts' ? 'Price' : 'Duration'} value={tab === 'posts' ? formatMoney(selected.price) : selected.duration || 'Flexible'} />
            <DetailTile label={tab === 'posts' ? 'Location' : 'Price type'} value={tab === 'posts' ? selected.location || 'Not set' : selected.price_type || 'Not set'} />
            <DetailTile label="Images" value={formatNumber(normalizeImages(selected.images).length)} />
            <DetailTile label="Tags" value={formatNumber(normalizeTags(selected.tags).length)} />
          </div>

          {tab === 'posts' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
              <MiniMetric label="Views" value={selected.view_count} />
              <MiniMetric label="Likes" value={selected.like_count} />
              <MiniMetric label="Saves" value={selected.save_count} />
              <MiniMetric label="Comments" value={selected.comment_count} />
            </div>
          ) : null}

          <SectionTitle icon={FiFileText} title="Description" />
          <p style={{ margin: '0 0 18px', fontSize: 11.5, color: colors.textMuted, lineHeight: 1.65 }}>
            {selected.description || 'No description has been added yet.'}
          </p>

          <SectionTitle icon={FiTag} title="Tags" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {normalizeTags(selected.tags).length ? (
              normalizeTags(selected.tags).map((tag) => (
                <span key={tag} style={badgeStyle('neutral')}>{tag}</span>
              ))
            ) : (
              <span style={{ fontSize: 11, color: colors.textDim }}>No tags</span>
            )}
          </div>

          <SectionTitle icon={FiLayers} title="Specifications" />
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            {Object.entries(normalizeSpecs(selected.specifications)).length ? (
              Object.entries(normalizeSpecs(selected.specifications)).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 12px', borderBottom: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10.5, color: colors.textMuted }}>{key}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'right' }}>{String(value)}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: 14, fontSize: 11, color: colors.textDim }}>No specifications</div>
            )}
          </div>

          <SectionTitle icon={FiImage} title="Media" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {normalizeImages(selected.images).length ? (
              normalizeImages(selected.images).map((image, index) => (
                <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                  <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </a>
              ))
            ) : (
              <span style={{ fontSize: 11, color: colors.textDim }}>No media uploaded</span>
            )}
          </div>
        </Drawer>
      ) : null}

      {formOpen ? (
        <Modal
          title={editing ? `Edit ${tab === 'posts' ? 'post' : 'service'}` : `Add ${tab === 'posts' ? 'post' : 'service'}`}
          subtitle="Changes are written through the active data source."
          onClose={() => setFormOpen(false)}
          width={700}
          footer={
            <>
              <button type="button" onClick={() => setFormOpen(false)} style={ghostButton}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving || uploading} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create content'}
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Solar installation kit" style={input} />
              </Field>
            </div>
            <Field label="Category">
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Home & Living" style={input} />
            </Field>
            <Field label="Subcategory">
              <input value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} placeholder="Solar" style={input} />
            </Field>
            <Field label="Brand">
              <input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Optional" style={input} />
            </Field>
            {tab === 'posts' ? (
              <>
                <Field label="Price">
                  <input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0" style={input} />
                </Field>
                <Field label="Price type">
                  <select value={form.price_type} onChange={(event) => setForm({ ...form, price_type: event.target.value })} style={input}>
                    <option value="fixed">Fixed</option>
                    <option value="negotiable">Negotiable</option>
                    <option value="free">Free</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </Field>
                <Field label="Location">
                  <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Kampala" style={input} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} style={input}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Author">
                  <select value={form.user_id} onChange={(event) => setForm({ ...form, user_id: event.target.value })} style={input}>
                    <option value="">Signed-in admin</option>
                    {users.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email || member.id}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Duration">
                  <input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="30 minutes" style={input} />
                </Field>
                <Field label="Price type">
                  <input value={form.price_type} onChange={(event) => setForm({ ...form, price_type: event.target.value })} placeholder="quote / fixed" style={input} />
                </Field>
              </>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Description">
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should members know?" style={{ ...input, minHeight: 92, resize: 'vertical' }} />
              </Field>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Toggle
                checked={form.is_active}
                onChange={(checked) => setForm({ ...form, is_active: checked })}
                label="Visible in the app"
                description="Inactive content stays in the catalog but is hidden from members."
              />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <SectionTitle icon={FiImage} title="Images" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
              {form.images.map((image, index) => (
                <div key={`${image}-${index}`} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                  <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, imageIndex) => imageIndex !== index) })} style={removeImageStyle} aria-label="Remove image">
                    <FiX size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={imageInput} onChange={(event) => setImageInput(event.target.value)} placeholder="Paste image URL" style={{ ...input, flex: 1, minWidth: 180 }} />
              <button type="button" onClick={addImageUrl} style={ghostButton}>Add URL</button>
              <button type="button" onClick={() => fileRef.current?.click()} style={ghostButton} disabled={uploading}>
                <FiUploadCloud size={14} /> {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <SectionTitle icon={FiTag} title="Tags" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {form.tags.map((tag) => (
                <span key={tag} style={{ ...badgeStyle('primary'), gap: 5 }}>
                  {tag}
                  <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((entry) => entry !== tag) })} style={inlineRemoveStyle} aria-label={`Remove ${tag}`}>
                    <FiX size={9} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} placeholder="Add a tag" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={addTag} style={ghostButton}>Add</button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <SectionTitle icon={FiLayers} title="Specifications" />
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 9 }}>
              {Object.entries(form.specifications).length ? (
                Object.entries(form.specifications).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 11px', borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ fontSize: 10.5, color: colors.textMuted }}>{key}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600 }}>{String(value)}</span>
                    <button type="button" onClick={() => removeSpec(key)} style={inlineRemoveStyle} aria-label={`Remove ${key}`}><FiX size={11} /></button>
                  </div>
                ))
              ) : (
                <div style={{ padding: 12, fontSize: 10.5, color: colors.textDim }}>No specifications added</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={specKey} onChange={(event) => setSpecKey(event.target.value)} placeholder="Key" style={{ ...input, flex: 1 }} />
              <input value={specValue} onChange={(event) => setSpecValue(event.target.value)} placeholder="Value" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={addSpec} style={ghostButton}>Add</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete ${itemName(deleteTarget)}?`}
          description="This removes the item from the content catalog and cannot be undone."
          confirmLabel="Delete content"
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
        width: 27,
        height: 27,
        borderRadius: 8,
        border: `1px solid ${tone === 'danger' ? 'rgba(231,76,60,0.25)' : colors.border}`,
        background: tone === 'danger' ? colors.dangerSoft : colors.surfaceAlt,
        color: tone === 'danger' ? colors.danger : colors.textMuted,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function DetailTile({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: radii.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 700, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div style={{ padding: '9px 10px', borderRadius: 10, background: colors.bgSoft, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{formatNumber(value)}</div>
      <div style={{ fontSize: 9, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
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
  borderRadius: 10,
  overflow: 'hidden',
  background: colors.surfaceAlt,
  border: `1px solid ${colors.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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

const avatarImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const removeImageStyle = {
  position: 'absolute',
  top: 3,
  right: 3,
  width: 18,
  height: 18,
  borderRadius: 999,
  border: 'none',
  background: 'rgba(0,0,0,0.7)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const inlineRemoveStyle = {
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  opacity: 0.8,
};
