// src/pages/HeroSliders.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HeroSliders() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    cta_text: 'Learn More',
    cta_link: '/',
    image_url: '',
    bg_color: 'from-blue-600 to-primary',
    text_color: 'text-white',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => { fetchSlides(); }, []);

  const fetchSlides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setSlides(data);
    setLoading(false);
  };

  const filteredSlides = slides.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: slides.length,
    active: slides.filter(s => s.is_active).length,
    inactive: slides.filter(s => !s.is_active).length,
  };

  const statCards = [
    { label: 'Total Slides', value: stats.total, icon: '📊', color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Active', value: stats.active, icon: '✅', color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Inactive', value: stats.inactive, icon: '⏸️', color: '#FF9800', bg: '#FFF3E0' },
  ];

  const handleAddSlide = async () => {
    if (!formData.title.trim() || !formData.image_url.trim()) {
      alert('Please fill in title and image URL');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('hero_slides')
      .insert({
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        cta_text: formData.cta_text.trim(),
        cta_link: formData.cta_link.trim(),
        image_url: formData.image_url.trim(),
        bg_color: formData.bg_color,
        text_color: formData.text_color,
        is_active: formData.is_active,
        sort_order: formData.sort_order || slides.length + 1
      });

    if (!error) {
      fetchSlides();
      setShowAddModal(false);
      resetForm();
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleUpdateSlide = async () => {
    if (!selectedSlide) return;
    setSaving(true);
    const { error } = await supabase
      .from('hero_slides')
      .update({
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        cta_text: formData.cta_text.trim(),
        cta_link: formData.cta_link.trim(),
        image_url: formData.image_url.trim(),
        bg_color: formData.bg_color,
        text_color: formData.text_color,
        is_active: formData.is_active,
        sort_order: formData.sort_order
      })
      .eq('id', selectedSlide.id);

    if (!error) {
      fetchSlides();
      setShowEditModal(false);
      setSelectedSlide(null);
      resetForm();
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDeleteSlide = async () => {
    if (!selectedSlide) return;
    setSaving(true);
    const { error } = await supabase
      .from('hero_slides')
      .delete()
      .eq('id', selectedSlide.id);

    if (!error) {
      fetchSlides();
      setShowDeleteConfirm(false);
      setSelectedSlide(null);
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleToggleStatus = async (slide) => {
    const { error } = await supabase
      .from('hero_slides')
      .update({ is_active: !slide.is_active })
      .eq('id', slide.id);

    if (!error) {
      fetchSlides();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleMoveSlide = async (slide, direction) => {
    const newOrder = slide.sort_order + direction;
    const targetSlide = slides.find(s => s.sort_order === newOrder);
    if (!targetSlide) return;

    setSaving(true);
    // Swap sort orders
    const { error: error1 } = await supabase
      .from('hero_slides')
      .update({ sort_order: newOrder })
      .eq('id', slide.id);

    const { error: error2 } = await supabase
      .from('hero_slides')
      .update({ sort_order: slide.sort_order })
      .eq('id', targetSlide.id);

    if (!error1 && !error2) {
      fetchSlides();
    }
    setSaving(false);
  };

  const openEdit = (slide) => {
    setSelectedSlide(slide);
    setFormData({
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      cta_text: slide.cta_text || 'Learn More',
      cta_link: slide.cta_link || '/',
      image_url: slide.image_url || '',
      bg_color: slide.bg_color || 'from-blue-600 to-primary',
      text_color: slide.text_color || 'text-white',
      is_active: slide.is_active ?? true,
      sort_order: slide.sort_order || 0
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      cta_text: 'Learn More',
      cta_link: '/',
      image_url: '',
      bg_color: 'from-blue-600 to-primary',
      text_color: 'text-white',
      is_active: true,
      sort_order: 0
    });
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main Content */}
      <div style={{ flex: selectedSlide && !showEditModal && !showDeleteConfirm ? '1' : '1' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Hero Sliders</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Hero Sliders</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Manage home page hero slider content.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              placeholder="Search slides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 260, fontSize: 13 }}
            />
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              style={{ padding: '10px 20px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >+ Add Slide</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #EEF3FF' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#8E99B3', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading slides...</div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  <th style={th}>#</th>
                  <th style={th}>Slide</th>
                  <th style={th}>Title</th>
                  <th style={th}>CTA</th>
                  <th style={th}>Status</th>
                  <th style={th}>Order</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlides.map((slide, index) => {
                  const isSelected = selectedSlide?.id === slide.id;
                  return (
                    <tr
                      key={slide.id}
                      onClick={() => setSelectedSlide(isSelected ? null : slide)}
                      style={{
                        borderBottom: '1px solid #F5F6FA',
                        cursor: 'pointer',
                        background: isSelected ? '#F8FAFF' : '#FFFFFF',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={td}>{index + 1}</td>
                      <td style={td}>
                        <img
                          src={slide.image_url}
                          alt={slide.title}
                          style={{ width: 60, height: 40, borderRadius: 8, objectFit: 'cover' }}
                          onError={(e) => e.target.src = 'https://placehold.co/60x40/4A7DFF/FFFFFF?text=Slide'}
                        />
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{slide.title}</div>
                        <div style={{ fontSize: 11, color: '#8E99B3' }}>{slide.subtitle}</div>
                      </td>
                      <td style={td}>
                        <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#E3F2FD', color: '#1976D2' }}>
                          {slide.cta_text} →
                        </span>
                      </td>
                      <td style={td}>
                        <span
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(slide); }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: slide.is_active ? '#E8F5E9' : '#FFEBEE',
                            color: slide.is_active ? '#4CAF50' : '#F44336',
                          }}
                        >
                          {slide.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveSlide(slide, -1); }}
                            disabled={slide.sort_order === 1 || saving}
                            style={{ ...smallBtn, opacity: slide.sort_order === 1 ? 0.4 : 1 }}
                          >↑</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveSlide(slide, 1); }}
                            disabled={slide.sort_order === slides.length || saving}
                            style={{ ...smallBtn, opacity: slide.sort_order === slides.length ? 0.4 : 1 }}
                          >↓</button>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(slide)} style={smallBtn}>✏️</button>
                        <button
                          onClick={() => { setSelectedSlide(slide); setShowDeleteConfirm(true); }}
                          style={{ ...smallBtn, background: '#FFEBEE', color: '#F44336' }}
                        >🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #EEF3FF' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>{filteredSlides.length} slides</span>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {selectedSlide && !showEditModal && !showDeleteConfirm && (
        <div style={sidePanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Slide Preview</h3>
            <button onClick={() => setSelectedSlide(null)} style={closeBtn}>✕</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <img
              src={selectedSlide.image_url}
              alt={selectedSlide.title}
              style={{ width: '100%', height: 140, borderRadius: 12, objectFit: 'cover' }}
              onError={(e) => e.target.src = 'https://placehold.co/400x140/4A7DFF/FFFFFF?text=Image'}
            />
          </div>

          <div>
            <div style={detailRow}>
              <span style={detailLabel}>Title</span>
              <span style={detailValue}>{selectedSlide.title}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Subtitle</span>
              <span style={detailValue}>{selectedSlide.subtitle || '—'}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>CTA Button</span>
              <span style={detailValue}>{selectedSlide.cta_text}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Link</span>
              <span style={detailValue}>{selectedSlide.cta_link}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Status</span>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: selectedSlide.is_active ? '#E8F5E9' : '#FFEBEE', color: selectedSlide.is_active ? '#4CAF50' : '#F44336' }}>
                {selectedSlide.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Order</span>
              <span style={detailValue}>{selectedSlide.sort_order}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Created</span>
              <span style={detailValue}>{formatDate(selectedSlide.created_at)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF3FF' }}>
              <button onClick={() => openEdit(selectedSlide)} style={primaryBtn}>✏️ Edit Slide</button>
              <button onClick={() => setShowDeleteConfirm(true)} style={dangerBtn}>🗑️ Delete Slide</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>Add New Slide</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={flabel}>Title *</label>
                <input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={finput}
                  placeholder="e.g. Welcome to Munolink"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={flabel}>Subtitle</label>
                <input
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  style={finput}
                  placeholder="e.g. Your trusted local marketplace"
                />
              </div>
              <div>
                <label style={flabel}>CTA Text</label>
                <input
                  value={formData.cta_text}
                  onChange={e => setFormData({ ...formData, cta_text: e.target.value })}
                  style={finput}
                  placeholder="e.g. Get Started"
                />
              </div>
              <div>
                <label style={flabel}>CTA Link</label>
                <input
                  value={formData.cta_link}
                  onChange={e => setFormData({ ...formData, cta_link: e.target.value })}
                  style={finput}
                  placeholder="e.g. /register"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={flabel}>Image URL *</label>
                <input
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  style={finput}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <div>
                <label style={flabel}>Background Color</label>
                <select
                  value={formData.bg_color}
                  onChange={e => setFormData({ ...formData, bg_color: e.target.value })}
                  style={finput}
                >
                  <option value="from-blue-600 to-primary">Blue to Navy</option>
                  <option value="from-green-600 to-teal-600">Green to Teal</option>
                  <option value="from-orange-500 to-red-500">Orange to Red</option>
                  <option value="from-purple-600 to-pink-600">Purple to Pink</option>
                </select>
              </div>
              <div>
                <label style={flabel}>Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  style={finput}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...flabel, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={cancelBtn}>Cancel</button>
              <button
                onClick={handleAddSlide}
                disabled={saving || !formData.title.trim() || !formData.image_url.trim()}
                style={{ ...primaryBtn, opacity: (saving || !formData.title.trim() || !formData.image_url.trim()) ? 0.6 : 1 }}
              >
                {saving ? 'Adding...' : 'Add Slide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSlide && (
        <div style={modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>Edit Slide</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={flabel}>Title *</label>
                <input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={finput}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={flabel}>Subtitle</label>
                <input
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  style={finput}
                />
              </div>
              <div>
                <label style={flabel}>CTA Text</label>
                <input
                  value={formData.cta_text}
                  onChange={e => setFormData({ ...formData, cta_text: e.target.value })}
                  style={finput}
                />
              </div>
              <div>
                <label style={flabel}>CTA Link</label>
                <input
                  value={formData.cta_link}
                  onChange={e => setFormData({ ...formData, cta_link: e.target.value })}
                  style={finput}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={flabel}>Image URL *</label>
                <input
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  style={finput}
                />
              </div>
              <div>
                <label style={flabel}>Background Color</label>
                <select
                  value={formData.bg_color}
                  onChange={e => setFormData({ ...formData, bg_color: e.target.value })}
                  style={finput}
                >
                  <option value="from-blue-600 to-primary">Blue to Navy</option>
                  <option value="from-green-600 to-teal-600">Green to Teal</option>
                  <option value="from-orange-500 to-red-500">Orange to Red</option>
                  <option value="from-purple-600 to-pink-600">Purple to Pink</option>
                </select>
              </div>
              <div>
                <label style={flabel}>Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  style={finput}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...flabel, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={cancelBtn}>Cancel</button>
              <button
                onClick={handleUpdateSlide}
                disabled={saving || !formData.title.trim() || !formData.image_url.trim()}
                style={{ ...primaryBtn, opacity: (saving || !formData.title.trim() || !formData.image_url.trim()) ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && selectedSlide && (
        <div style={modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, width: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 8px' }}>
              Delete "{selectedSlide.title}"?
            </h2>
            <p style={{ color: '#8E99B3', fontSize: 13, marginBottom: 20 }}>
              This will permanently remove this slide from the home page.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleDeleteSlide} disabled={saving} style={dangerBtn}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== STYLES ==============

const th = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 11,
  color: '#8E99B3',
  fontWeight: 600,
  textTransform: 'uppercase'
};

const td = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#1F2F5F'
};

const smallBtn = {
  padding: '6px 10px',
  borderRadius: 8,
  border: 'none',
  fontSize: 12,
  cursor: 'pointer',
  background: '#EEF3FF',
  color: '#4A7DFF',
  marginRight: 4
};

const primaryBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  background: '#4A7DFF',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer'
};

const dangerBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  background: '#F44336',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer'
};

const cancelBtn = {
  padding: '10px 24px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer'
};

const sidePanel = {
  width: 380,
  flexShrink: 0,
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #EEF3FF',
  padding: 20,
  position: 'sticky',
  top: 100,
  alignSelf: 'flex-start',
  maxHeight: 'calc(100vh - 140px)',
  overflowY: 'auto'
};

const closeBtn = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: '#8E99B3'
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #F5F6FA'
};

const detailLabel = {
  fontSize: 12,
  color: '#8E99B3',
  fontWeight: 500
};

const detailValue = {
  fontSize: 12,
  color: '#1F2F5F',
  fontWeight: 600,
  textAlign: 'right',
  maxWidth: '55%'
};

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200
};

const modalContent = {
  background: '#FFFFFF',
  borderRadius: 16,
  padding: 28,
  width: 500,
  maxHeight: '80vh',
  overflow: 'auto'
};

const flabel = {
  fontSize: 12,
  fontWeight: 600,
  color: '#1F2F5F',
  display: 'block',
  marginBottom: 5
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
  boxSizing: 'border-box'
};