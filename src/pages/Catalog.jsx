import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [tab, setTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Rich form data
  const [formData, setFormData] = useState({
    name: '', category: '', subcategory: '', brand: '', description: '',
    duration: '', specifications: {}, images: [], tags: [],
  });
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('catalog').select('*').order('category');
    const { data: s } = await supabase.from('service_catalog').select('*').order('category');
    if (p) setProducts(p.map(item => ({ ...item, type: 'product' })));
    if (s) setServices(s.map(item => ({ ...item, type: 'service' })));
    setLoading(false);
  };

  const allItems = tab === 'products' ? products : services;
  const categories = [...new Set(allItems.map(item => item.category).filter(Boolean))];

  const filtered = allItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    totalProducts: products.length, totalServices: services.length,
    productCategories: [...new Set(products.map(p => p.category))].length,
    serviceCategories: [...new Set(services.map(s => s.category))].length,
    total: products.length + services.length,
  };

  const tableName = tab === 'products' ? 'catalog' : 'service_catalog';

  const resetForm = () => {
    setFormData({ name: '', category: '', subcategory: '', brand: '', description: '', duration: '', specifications: {}, images: [], tags: [] });
    setSpecKey(''); setSpecValue(''); setTagInput(''); setImageInput('');
    setEditingItem(null);
  };

  const handleOpenAdd = () => { resetForm(); setShowFormModal(true); };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      brand: item.brand || '',
      description: item.description || '',
      duration: item.duration || '',
      specifications: item.specifications || {},
      images: item.images || [],
      tags: item.tags || [],
    });
    setShowFormModal(true);
  };

  // Handle file upload to Supabase Storage
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from('catalog-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      alert('Upload failed: ' + error.message);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('catalog-images')
      .getPublicUrl(filePath);

    if (urlData?.publicUrl) {
      setFormData(prev => ({ ...prev, images: [...prev.images, urlData.publicUrl] }));
    }

    setUploading(false);
    e.target.value = '';
  };

  const addImageUrl = () => {
    if (!imageInput.trim()) return;
    setFormData({ ...formData, images: [...formData.images, imageInput.trim()] });
    setImageInput('');
  };

  const removeImage = (index) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  const addSpec = () => {
    if (!specKey.trim()) return;
    setFormData({ ...formData, specifications: { ...formData.specifications, [specKey.trim()]: specValue.trim() } });
    setSpecKey(''); setSpecValue('');
  };

  const removeSpec = (key) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    setFormData({ ...formData, specifications: newSpecs });
  };

  const addTag = () => {
    if (!tagInput.trim() || formData.tags.includes(tagInput.trim())) { setTagInput(''); return; }
    setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
    setTagInput('');
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim() || 'General',
      subcategory: formData.subcategory.trim() || null,
      description: formData.description.trim() || null,
      specifications: formData.specifications,
      images: formData.images,
      tags: formData.tags,
      updated_at: new Date(),
    };

    if (tab === 'products') {
      payload.brand = formData.brand.trim() || null;
    } else {
      payload.duration = formData.duration.trim() || null;
    }

    if (editingItem) {
      const { error } = await supabase.from(tableName).update(payload).eq('id', editingItem.id);
      if (!error) {
        const updated = { ...editingItem, ...payload, type: tab };
        if (tab === 'products') setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        else setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
        setSelectedItem(updated);
      }
    } else {
      const { data, error } = await supabase.from(tableName).insert({ ...payload, is_active: true }).select().single();
      if (!error && data) {
        const newItem = { ...data, type: tab };
        if (tab === 'products') setProducts(prev => [newItem, ...prev]);
        else setServices(prev => [newItem, ...prev]);
      }
    }
    setSaving(false);
    setShowFormModal(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSaving(true);
    const { error } = await supabase.from(tableName).delete().eq('id', selectedItem.id);
    if (!error) {
      if (tab === 'products') setProducts(prev => prev.filter(p => p.id !== selectedItem.id));
      else setServices(prev => prev.filter(s => s.id !== selectedItem.id));
      setSelectedItem(null);
      setShowDeleteConfirm(false);
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      <div style={{ flex: selectedItem ? '1' : '1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Catalog</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Catalog</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Manage products and services with images & specifications.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="Search name, category, tags..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={inputStyle} />
            <button onClick={handleOpenAdd} style={primaryBtn}>+ Add {tab === 'products' ? 'Product' : 'Service'}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Products', value: stats.totalProducts, icon: '📦', color: '#4A7DFF', bg: '#EEF3FF' },
            { label: 'Total Services', value: stats.totalServices, icon: '🔧', color: '#4CAF50', bg: '#E8F5E9' },
            { label: 'Prod Categories', value: stats.productCategories, icon: '📂', color: '#FF9800', bg: '#FFF3E0' },
            { label: 'Svc Categories', value: stats.serviceCategories, icon: '🏷️', color: '#9C27B0', bg: '#F3E5F5' },
            { label: 'Total Items', value: stats.total, icon: '📋', color: '#00BCD4', bg: '#E0F7FA' },
          ].map((s, i) => (
            <div key={i} style={statCardStyle}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#8E99B3', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ key: 'products', label: `Products (${products.length})` }, { key: 'services', label: `Services (${services.length})` }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedItem(null); setPage(1); setCategoryFilter('all'); }}
              style={{ ...tabBtn, background: tab === t.key ? '#4A7DFF' : '#FFFFFF', color: tab === t.key ? '#FFFFFF' : '#1F2F5F' }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>{filtered.length} items</span>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div> : (
          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  <th style={th}>Item</th>
                  <th style={th}>Category</th>
                  <th style={th}>Specs</th>
                  <th style={th}>Images</th>
                  <th style={th}>Tags</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map(item => {
                  const isSel = selectedItem?.id === item.id;
                  return (
                    <tr key={item.id} onClick={() => setSelectedItem(isSel ? null : item)}
                      style={{ borderBottom: '1px solid #F5F6FA', cursor: 'pointer', background: isSel ? '#F8FAFF' : '#FFFFFF' }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F6FA', overflow: 'hidden' }}>
                            {(item.images || []).length > 0 ? (
                              <img src={item.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 18 }}>
                                {item.type === 'service' ? '🔧' : '📦'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                            {item.brand && <div style={{ fontSize: 10, color: '#8E99B3' }}>{item.brand}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={td}><span style={badge}>{item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}</span></td>
                      <td style={td}><span style={{ fontSize: 11, color: '#8E99B3' }}>{Object.keys(item.specifications || {}).length} specs</span></td>
                      <td style={td}><span style={{ fontSize: 11, color: '#8E99B3' }}>{(item.images || []).length} images</span></td>
                      <td style={td}><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{(item.tags || []).slice(0, 3).map(t => <span key={t} style={tagBadge}>{t}</span>)}</div></td>
                      <td style={{ ...td, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleOpenEdit(item)} style={smallBtn}>✏️</button>
                        <button onClick={() => { setSelectedItem(item); setShowDeleteConfirm(true); }} style={{ ...smallBtn, background: '#FFEBEE', color: '#F44336' }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #EEF3FF' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>{pagedItems.length} of {filtered.length}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>→</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {selectedItem && (
        <div style={sidePanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>{selectedItem.name}</h3>
            <button onClick={() => setSelectedItem(null)} style={closeBtn}>✕</button>
          </div>
          {/* Show first image */}
          {(selectedItem.images || []).length > 0 && (
            <img src={selectedItem.images[0]} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['Overview', 'Specifications', 'Images'].map(t => (
              <button key={t} onClick={() => setDetailTab(t)} style={{ ...tabBtn, padding: '6px 14px', fontSize: 11, background: detailTab === t ? '#4A7DFF' : '#F5F6FA', color: detailTab === t ? '#FFFFFF' : '#8E99B3' }}>{t}</button>
            ))}
          </div>
          {detailTab === 'Overview' && (
            <div>
              <div style={dRow}><span style={dLabel}>Type</span><span style={badge}>{selectedItem.type === 'service' ? 'Service' : 'Product'}</span></div>
              <div style={dRow}><span style={dLabel}>Category</span><span style={dVal}>{selectedItem.category}{selectedItem.subcategory ? ` / ${selectedItem.subcategory}` : ''}</span></div>
              {selectedItem.brand && <div style={dRow}><span style={dLabel}>Brand</span><span style={dVal}>{selectedItem.brand}</span></div>}
              {selectedItem.duration && <div style={dRow}><span style={dLabel}>Duration</span><span style={dVal}>{selectedItem.duration}</span></div>}
              <div style={{ padding: '10px 0' }}><span style={dLabel}>Description</span><p style={{ fontSize: 12, color: '#8E99B3', marginTop: 6 }}>{selectedItem.description || 'No description'}</p></div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>{(selectedItem.tags || []).map(t => <span key={t} style={tagBadge}>{t}</span>)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF3FF' }}>
                <button onClick={() => handleOpenEdit(selectedItem)} style={primaryBtn}>✏️ Edit</button>
                <button onClick={() => setShowDeleteConfirm(true)} style={dangerBtn}>🗑️ Delete</button>
              </div>
            </div>
          )}
          {detailTab === 'Specifications' && (
            <div>
              {Object.keys(selectedItem.specifications || {}).length === 0 ? (
                <p style={{ color: '#8E99B3', fontSize: 13 }}>No specifications</p>
              ) : (
                Object.entries(selectedItem.specifications || {}).map(([k, v]) => (
                  <div key={k} style={dRow}><span style={{ ...dLabel, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span><span style={dVal}>{String(v)}</span></div>
                ))
              )}
            </div>
          )}
          {detailTab === 'Images' && (
            <div>
              {(selectedItem.images || []).length === 0 ? (
                <p style={{ color: '#8E99B3', fontSize: 13 }}>No images</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {(selectedItem.images || []).map((img, i) => (
                    <img key={i} src={img} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div style={modalOverlay} onClick={() => setShowFormModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>{editingItem ? 'Edit' : 'Add'} {tab === 'products' ? 'Product' : 'Service'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={flabel}>Name *</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={finput} />
              </div>
              <div>
                <label style={flabel}>Category *</label>
                <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={finput} />
              </div>
              <div>
                <label style={flabel}>Subcategory</label>
                <input value={formData.subcategory} onChange={e => setFormData({ ...formData, subcategory: e.target.value })} style={finput} />
              </div>
              {tab === 'products' ? (
                <div>
                  <label style={flabel}>Brand</label>
                  <input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} style={finput} />
                </div>
              ) : (
                <div>
                  <label style={flabel}>Duration</label>
                  <input value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} style={finput} placeholder="e.g. 1-2 hours" />
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={flabel}>Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ ...finput, minHeight: 70, resize: 'vertical' }} />
            </div>

            {/* Specifications */}
            <div style={{ marginBottom: 16 }}>
              <label style={flabel}>Specifications</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={specKey} onChange={e => setSpecKey(e.target.value)} placeholder="Key (e.g. color)" style={{ ...finput, flex: 1 }} />
                <input value={specValue} onChange={e => setSpecValue(e.target.value)} placeholder="Value" style={{ ...finput, flex: 1 }} />
                <button onClick={addSpec} style={{ ...primaryBtn, padding: '8px 14px', fontSize: 12 }}>+</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(formData.specifications).map(([k, v]) => (
                  <span key={k} style={specChip}><strong>{k}:</strong> {String(v)}
                    <button onClick={() => removeSpec(k)} style={chipX}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 16 }}>
              <label style={flabel}>Tags</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag..." style={{ ...finput, flex: 1 }} />
                <button onClick={addTag} style={{ ...primaryBtn, padding: '8px 14px', fontSize: 12 }}>+</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {formData.tags.map(t => (
                  <span key={t} style={tagBadge}>{t}
                    <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F44336', marginLeft: 4 }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Images — File Upload + URL */}
            <div style={{ marginBottom: 20 }}>
              <label style={flabel}>Images</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: '2px dashed #DCE5FF',
                    background: '#F8FAFF', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6, color: '#4A7DFF',
                  }}
                >
                  {uploading ? '⏳ Uploading...' : '📁 Upload Image'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: 11, color: '#8E99B3', alignSelf: 'center' }}>or paste URL:</span>
                <input value={imageInput} onChange={e => setImageInput(e.target.value)} placeholder="Image URL..." style={{ ...finput, flex: 1 }} />
                <button onClick={addImageUrl} style={{ ...primaryBtn, padding: '8px 14px', fontSize: 12 }}>+</button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {formData.images.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={img} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #EEF3FF' }} />
                    <button onClick={() => removeImage(i)} style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                      borderRadius: 10, background: '#F44336', color: '#FFFFFF',
                      border: 'none', fontSize: 12, cursor: 'pointer',
                    }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFormModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !formData.name.trim()} style={{ ...primaryBtn, opacity: (saving || !formData.name.trim()) ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && selectedItem && (
        <div style={modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, width: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 8px' }}>Delete {selectedItem.name}?</h2>
            <p style={{ color: '#8E99B3', fontSize: 13, marginBottom: 20 }}>This permanently removes this item from the catalog.</p>
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

// Styles
const th = { textAlign: 'left', padding: '12px 16px', fontSize: 11, color: '#8E99B3', fontWeight: 600, textTransform: 'uppercase' };
const td = { padding: '12px 16px', fontSize: 13, color: '#1F2F5F' };
const pageBtn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#FFFFFF', color: '#1F2F5F' };
const inputStyle = { padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 260, fontSize: 13 };
const selectStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#FFFFFF' };
const primaryBtn = { padding: '10px 20px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const dangerBtn = { padding: '10px 20px', borderRadius: 10, background: '#F44336', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const cancelBtn = { padding: '10px 24px', borderRadius: 10, border: '1px solid #DCE5FF', background: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const tabBtn = { padding: '10px 20px', borderRadius: 10, border: '1px solid #DCE5FF', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const smallBtn = { padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: '#EEF3FF', color: '#4A7DFF', marginRight: 4 };
const badge = { padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#EEF3FF', color: '#4A7DFF' };
const tagBadge = { padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#E8F5E9', color: '#4CAF50' };
const statCardStyle = { background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #EEF3FF' };
const cardStyle = { background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' };
const sidePanel = { width: 380, flexShrink: 0, background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, position: 'sticky', top: 100, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' };
const closeBtn = { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8E99B3' };
const dRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F6FA' };
const dLabel = { fontSize: 12, color: '#8E99B3', fontWeight: 500 };
const dVal = { fontSize: 12, color: '#1F2F5F', fontWeight: 600, textAlign: 'right', maxWidth: '55%' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const modalContent = { background: '#FFFFFF', borderRadius: 16, padding: 28, width: 640, maxHeight: '85vh', overflow: 'auto' };
const flabel = { fontSize: 12, fontWeight: 600, color: '#1F2F5F', display: 'block', marginBottom: 5 };
const finput = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#F8FAFF', outline: 'none', boxSizing: 'border-box' };
const specChip = { padding: '6px 10px', background: '#F5F6FA', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 };
const chipX = { background: 'none', border: 'none', cursor: 'pointer', color: '#F44336', fontSize: 14 };