import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/theme';

export default function OpportunityEngine() {
  const [activeTab, setActiveTab] = useState('featured');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Featured Opportunities State
  const [featuredItems, setFeaturedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [showAddFeatured, setShowAddFeatured] = useState(false);
  const [newFeatured, setNewFeatured] = useState({
    item_id: '',
    item_type: 'product',
    priority: 0,
    custom_label: '',
    badge_style: 'default',
    end_date: ''
  });

  // Scene Customization State
  const [sceneSettings, setSceneSettings] = useState({
    product: { scene_order: ['hero', 'details', 'trust', 'gallery', 'action'], auto_play: 6000 },
    service: { scene_order: ['hero', 'details', 'trust', 'gallery', 'action'], auto_play: 6000 },
  });
  const [editingSceneType, setEditingSceneType] = useState('product');

  // Trust Signals State
  const [trustSignals, setTrustSignals] = useState([]);
  const [showAddTrustSignal, setShowAddTrustSignal] = useState(false);
  const [newTrustSignal, setNewTrustSignal] = useState({
    label: '',
    icon: '✅',
    color: '#4A7DFF',
    show_on_scenes: ['hero', 'trust'],
    is_active: true,
  });

  // Badges State
  const [badges, setBadges] = useState([]);
  const [showAddBadge, setShowAddBadge] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: '',
    label: '',
    icon: '🏷️',
    color: '#4A7DFF',
    badge_style: 'default',
    is_active: true,
  });

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: '',
    scene_config: {},
    trust_signals: [],
    actions: [],
    is_default: false,
  });

  // Algorithm Settings State
  const [algorithmSettings, setAlgorithmSettings] = useState({
    watch_time_weight: 40,
    engagement_weight: 30,
    relevance_weight: 20,
    popularity_weight: 5,
    novelty_weight: 5,
    exploration_rate: 30,
    min_rating: 3.0,
  });

  // Flash Deals State
  const [flashDeals, setFlashDeals] = useState([]);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    item_id: '',
    item_type: 'product',
    original_price: '',
    deal_price: '',
    discount_percentage: 0,
    start_time: '',
    end_time: '',
    stock_limit: '',
  });

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [sceneAnalytics, setSceneAnalytics] = useState([]);
  const [analyticsDateRange, setAnalyticsDateRange] = useState('30d');

  // Moderation State
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [moderationNote, setModerationNote] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch(activeTab) {
        case 'featured':
          await fetchFeaturedData();
          break;
        case 'scenes':
          await fetchSceneSettings();
          await fetchTrustSignals();
          break;
        case 'templates':
          await fetchTemplates();
          break;
        case 'trustbadges':
          await fetchTrustSignals();
          await fetchBadges();
          break;
        case 'algorithm':
          await fetchAlgorithmSettings();
          break;
        case 'flashdeals':
          await fetchFlashDeals();
          break;
        case 'analytics':
          await fetchAnalytics();
          await fetchSceneAnalytics();
          break;
        case 'moderation':
          await fetchModerationData();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  // --- Featured Opportunities Functions ---
  const fetchFeaturedData = async () => {
    const { data: featured } = await supabase
      .from('featured_opportunities')
      .select('*')
      .order('priority', { ascending: true });

    setFeaturedItems(featured || []);

    const { data: products } = await supabase
      .from('catalog')
      .select('id, name, category, images')
      .eq('is_active', true)
      .limit(20);

    const { data: services } = await supabase
      .from('service_catalog')
      .select('id, name, category, images')
      .eq('is_active', true)
      .limit(20);

    const available = [
      ...(products || []).map(p => ({ ...p, type: 'product' })),
      ...(services || []).map(s => ({ ...s, type: 'service' }))
    ];
    setAvailableItems(available);
  };

  const handleAddFeatured = async () => {
    if (!newFeatured.item_id) return;
    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('featured_opportunities')
        .insert({
          item_id: newFeatured.item_id,
          item_type: newFeatured.item_type,
          priority: newFeatured.priority || 0,
          custom_label: newFeatured.custom_label || null,
          badge_style: newFeatured.badge_style || 'default',
          end_date: newFeatured.end_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setFeaturedItems([...featuredItems, data]);
      setShowAddFeatured(false);
      setNewFeatured({
        item_id: '',
        item_type: 'product',
        priority: 0,
        custom_label: '',
        badge_style: 'default',
        end_date: ''
      });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleRemoveFeatured = async (id) => {
    if (!confirm('Remove this item from featured?')) return;
    
    try {
      const { error } = await supabase
        .from('featured_opportunities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFeaturedItems(featuredItems.filter(item => item.id !== id));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateFeaturedPriority = async (id, newPriority) => {
    try {
      const { error } = await supabase
        .from('featured_opportunities')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) throw error;
      setFeaturedItems(featuredItems.map(item => 
        item.id === id ? { ...item, priority: newPriority } : item
      ));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // --- Scene Customization Functions ---
  const fetchSceneSettings = async () => {
    const { data } = await supabase
      .from('scene_settings')
      .select('*');

    if (data) {
      const settings = { 
        product: { scene_order: ['hero', 'details', 'trust', 'gallery', 'action'], auto_play: 6000 },
        service: { scene_order: ['hero', 'details', 'trust', 'gallery', 'action'], auto_play: 6000 },
      };
      data.forEach(row => {
        if (settings[row.opportunity_type]) {
          settings[row.opportunity_type] = row.scene_config || settings[row.opportunity_type];
        }
      });
      setSceneSettings(settings);
    }
  };

  const handleSaveSceneSettings = async () => {
    setSaving(true);
    try {
      for (const [type, config] of Object.entries(sceneSettings)) {
        const { error } = await supabase
          .from('scene_settings')
          .upsert({
            opportunity_type: type,
            scene_config: config,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'opportunity_type' });

        if (error) throw error;
      }
      alert('Scene settings saved successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  // --- Trust Signals Functions ---
  const fetchTrustSignals = async () => {
    const { data } = await supabase
      .from('trust_signals')
      .select('*')
      .order('sort_order', { ascending: true });

    setTrustSignals(data || []);
  };

  const handleAddTrustSignal = async () => {
    if (!newTrustSignal.label.trim()) {
      alert('Please enter a label');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('trust_signals')
        .insert({
          label: newTrustSignal.label.trim(),
          icon: newTrustSignal.icon || '✅',
          color: newTrustSignal.color || '#4A7DFF',
          show_on_scenes: newTrustSignal.show_on_scenes || ['hero', 'trust'],
          is_active: newTrustSignal.is_active !== undefined ? newTrustSignal.is_active : true,
          sort_order: trustSignals.length + 1,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTrustSignals([...trustSignals, data]);
      setShowAddTrustSignal(false);
      setNewTrustSignal({
        label: '',
        icon: '✅',
        color: '#4A7DFF',
        show_on_scenes: ['hero', 'trust'],
        is_active: true,
      });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDeleteTrustSignal = async (id) => {
    if (!confirm('Delete this trust signal?')) return;
    
    try {
      const { error } = await supabase
        .from('trust_signals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTrustSignals(trustSignals.filter(signal => signal.id !== id));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleToggleTrustSignal = async (id, active) => {
    try {
      const { error } = await supabase
        .from('trust_signals')
        .update({ is_active: active })
        .eq('id', id);

      if (error) throw error;
      setTrustSignals(trustSignals.map(signal => 
        signal.id === id ? { ...signal, is_active: active } : signal
      ));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // --- Badges Functions ---
  const fetchBadges = async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: false });

    setBadges(data || []);
  };

  const handleAddBadge = async () => {
    if (!newBadge.name.trim() || !newBadge.label.trim()) {
      alert('Please enter name and label');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('badges')
        .insert({
          name: newBadge.name.trim(),
          label: newBadge.label.trim(),
          icon: newBadge.icon || '🏷️',
          color: newBadge.color || '#4A7DFF',
          badge_style: newBadge.badge_style || 'default',
          is_active: newBadge.is_active !== undefined ? newBadge.is_active : true,
        })
        .select()
        .single();

      if (error) throw error;
      
      setBadges([...badges, data]);
      setShowAddBadge(false);
      setNewBadge({
        name: '',
        label: '',
        icon: '🏷️',
        color: '#4A7DFF',
        badge_style: 'default',
        is_active: true,
      });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDeleteBadge = async (id) => {
    if (!confirm('Delete this badge?')) return;
    
    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBadges(badges.filter(badge => badge.id !== id));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleToggleBadge = async (id, active) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({ is_active: active })
        .eq('id', id);

      if (error) throw error;
      setBadges(badges.map(badge => 
        badge.id === id ? { ...badge, is_active: active } : badge
      ));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // --- Templates Functions ---
  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('opportunity_templates')
      .select('*')
      .order('created_at', { ascending: false });

    setTemplates(data || []);
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.category.trim()) {
      alert('Please enter name and category');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('opportunity_templates')
        .insert({
          name: newTemplate.name.trim(),
          category: newTemplate.category.trim(),
          scene_config: newTemplate.scene_config || {},
          trust_signals: newTemplate.trust_signals || [],
          actions: newTemplate.actions || [],
          is_default: newTemplate.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTemplates([...templates, data]);
      setShowAddTemplate(false);
      setNewTemplate({
        name: '',
        category: '',
        scene_config: {},
        trust_signals: [],
        actions: [],
        is_default: false,
      });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    
    try {
      const { error } = await supabase
        .from('opportunity_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(templates.filter(template => template.id !== id));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleApplyTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const updatedSettings = {
      ...sceneSettings,
      product: {
        ...sceneSettings.product,
        scene_order: template.scene_config?.scene_order || sceneSettings.product.scene_order,
      },
      service: {
        ...sceneSettings.service,
        scene_order: template.scene_config?.scene_order || sceneSettings.service.scene_order,
      },
    };

    setSceneSettings(updatedSettings);
    alert('Template applied successfully!');
  };

  // --- Algorithm Settings Functions ---
  const fetchAlgorithmSettings = async () => {
    const { data } = await supabase
      .from('algorithm_settings')
      .select('*');

    if (data) {
      const settings = { watch_time_weight: 40, engagement_weight: 30, relevance_weight: 20, popularity_weight: 5, novelty_weight: 5, exploration_rate: 30, min_rating: 3.0 };
      data.forEach(row => {
        if (row.name in settings) {
          settings[row.name] = row.weight;
        }
      });
      setAlgorithmSettings(settings);
    }
  };

  const handleSaveAlgorithmSettings = async () => {
    setSaving(true);
    try {
      for (const [name, weight] of Object.entries(algorithmSettings)) {
        const { error } = await supabase
          .from('algorithm_settings')
          .upsert({
            name: name,
            weight: weight,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'name' });

        if (error) throw error;
      }
      alert('Algorithm settings saved successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  // --- Flash Deals Functions ---
  const fetchFlashDeals = async () => {
    const { data } = await supabase
      .from('flash_deals')
      .select('*')
      .order('created_at', { ascending: false });

    setFlashDeals(data || []);
  };

  const handleCreateFlashDeal = async () => {
    if (!newDeal.item_id || !newDeal.deal_price) return;
    setSaving(true);
    
    try {
      const discount = ((newDeal.original_price - newDeal.deal_price) / newDeal.original_price * 100).toFixed(0);
      
      const { data, error } = await supabase
        .from('flash_deals')
        .insert({
          item_id: newDeal.item_id,
          item_type: newDeal.item_type,
          original_price: parseFloat(newDeal.original_price),
          deal_price: parseFloat(newDeal.deal_price),
          discount_percentage: parseInt(discount),
          start_time: newDeal.start_time || new Date().toISOString(),
          end_time: newDeal.end_time,
          stock_limit: parseInt(newDeal.stock_limit) || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      
      setFlashDeals([data, ...flashDeals]);
      setShowAddDeal(false);
      setNewDeal({
        item_id: '',
        item_type: 'product',
        original_price: '',
        deal_price: '',
        discount_percentage: 0,
        start_time: '',
        end_time: '',
        stock_limit: '',
      });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleToggleFlashDeal = async (id, active) => {
    try {
      const { error } = await supabase
        .from('flash_deals')
        .update({ is_active: active })
        .eq('id', id);

      if (error) throw error;
      setFlashDeals(flashDeals.map(deal => 
        deal.id === id ? { ...deal, is_active: active } : deal
      ));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // --- Analytics Functions ---
  const fetchAnalytics = async () => {
    const days = analyticsDateRange === '7d' ? 7 : analyticsDateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('opportunity_analytics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    setAnalyticsData(data || []);
  };

  const fetchSceneAnalytics = async () => {
    const days = analyticsDateRange === '7d' ? 7 : analyticsDateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('scene_analytics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    setSceneAnalytics(data || []);
  };

  // --- Moderation Functions ---
  const fetchModerationData = async () => {
    const { data } = await supabase
      .from('content_reports')
      .select('*, users(full_name)')
      .order('created_at', { ascending: false });

    setReports(data || []);
  };

  const handleModerateReport = async (id, status) => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ 
          status: status,
          reviewed_at: new Date().toISOString(),
          notes: moderationNote || null
        })
        .eq('id', id);

      if (error) throw error;
      
      setReports(reports.map(report => 
        report.id === id ? { ...report, status: status } : report
      ));
      setSelectedReport(null);
      setModerationNote('');
      alert('Report moderated successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // --- Render Functions ---
  
  // Render Featured Tab
  const renderFeaturedTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>⭐ Featured Opportunities</h2>
        <button onClick={() => setShowAddFeatured(true)} style={primaryBtn}>
          + Add Featured Item
        </button>
      </div>

      {featuredItems.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <div style={emptyTitle}>No featured items yet</div>
          <div style={emptySubtext}>Feature products or services to highlight them on the feed</div>
        </div>
      ) : (
        <div style={featuredGrid}>
          {featuredItems.map((item, index) => {
            const availableItem = availableItems.find(a => a.id === item.item_id);
            return (
              <div key={item.id} style={featuredCard}>
                <div style={featuredCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={featuredPriority}>{item.priority || index + 1}</div>
                    <div>
                      <div style={featuredItemName}>{availableItem?.name || 'Unknown Item'}</div>
                      <div style={featuredItemType}>{item.item_type}</div>
                    </div>
                  </div>
                  {item.custom_label && (
                    <span style={featuredLabel}>{item.custom_label}</span>
                  )}
                </div>
                <div style={featuredCardBody}>
                  <div style={featuredBadge}>
                    Badge: {item.badge_style || 'default'}
                  </div>
                  <div style={featuredEndDate}>
                    {item.end_date ? `Ends: ${new Date(item.end_date).toLocaleDateString()}` : 'No expiry'}
                  </div>
                </div>
                <div style={featuredCardActions}>
                  <input
                    type="number"
                    value={item.priority || 0}
                    onChange={(e) => handleUpdateFeaturedPriority(item.id, parseInt(e.target.value))}
                    style={priorityInput}
                    min="0"
                    max="100"
                  />
                  <button onClick={() => handleRemoveFeatured(item.id)} style={dangerSmallBtn}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Featured Modal */}
      {showAddFeatured && (
        <div style={modalOverlay} onClick={() => setShowAddFeatured(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Add Featured Item</h3>
            <div style={formGroup}>
              <label style={formLabel}>Item Type</label>
              <select
                value={newFeatured.item_type}
                onChange={(e) => setNewFeatured({ ...newFeatured, item_type: e.target.value })}
                style={formInput}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Select Item</label>
              <select
                value={newFeatured.item_id}
                onChange={(e) => setNewFeatured({ ...newFeatured, item_id: e.target.value })}
                style={formInput}
              >
                <option value="">Select an item...</option>
                {availableItems.filter(a => a.type === newFeatured.item_type).map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                ))}
              </select>
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Priority (lower = higher)</label>
              <input
                type="number"
                value={newFeatured.priority}
                onChange={(e) => setNewFeatured({ ...newFeatured, priority: parseInt(e.target.value) })}
                style={formInput}
                min="0"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Custom Label (optional)</label>
              <input
                type="text"
                value={newFeatured.custom_label}
                onChange={(e) => setNewFeatured({ ...newFeatured, custom_label: e.target.value })}
                style={formInput}
                placeholder="e.g. 🔥 Trending"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Badge Style</label>
              <select
                value={newFeatured.badge_style}
                onChange={(e) => setNewFeatured({ ...newFeatured, badge_style: e.target.value })}
                style={formInput}
              >
                <option value="default">Default</option>
                <option value="popular">⭐ Popular</option>
                <option value="trending">🔥 Trending</option>
                <option value="new">🆕 New</option>
                <option value="featured">🎯 Featured</option>
              </select>
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Expiry Date (optional)</label>
              <input
                type="datetime-local"
                value={newFeatured.end_date}
                onChange={(e) => setNewFeatured({ ...newFeatured, end_date: e.target.value })}
                style={formInput}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddFeatured(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleAddFeatured} disabled={saving} style={primaryBtn}>
                {saving ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Scenes Tab
  const renderScenesTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>🎨 Scene Customization</h2>
        <button onClick={handleSaveSceneSettings} disabled={saving} style={primaryBtn}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div style={sceneTypeTabs}>
        <button
          onClick={() => setEditingSceneType('product')}
          style={{
            ...sceneTypeTab,
            background: editingSceneType === 'product' ? '#4A7DFF' : '#F5F6FA',
            color: editingSceneType === 'product' ? '#FFFFFF' : '#1F2F5F',
          }}
        >
          📦 Products
        </button>
        <button
          onClick={() => setEditingSceneType('service')}
          style={{
            ...sceneTypeTab,
            background: editingSceneType === 'service' ? '#4A7DFF' : '#F5F6FA',
            color: editingSceneType === 'service' ? '#FFFFFF' : '#1F2F5F',
          }}
        >
          🔧 Services
        </button>
      </div>

      <div style={sceneEditor}>
        <div style={sceneOrderSection}>
          <h4 style={sectionSubtitle}>Scene Order (Drag to reorder)</h4>
          <div style={sceneOrderList}>
            {sceneSettings[editingSceneType]?.scene_order.map((scene, index) => (
              <div key={scene} style={sceneOrderItem}>
                <span style={{ fontSize: 16, marginRight: 8 }}>☰</span>
                <span style={{ flex: 1 }}>
                  {scene.charAt(0).toUpperCase() + scene.slice(1)}
                </span>
                <span style={sceneOrderBadge}>{index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={sceneConfigSection}>
          <h4 style={sectionSubtitle}>Auto-play Settings</h4>
          <div style={formGroup}>
            <label style={formLabel}>Auto-play Speed (ms)</label>
            <input
              type="number"
              value={sceneSettings[editingSceneType]?.auto_play || 6000}
              onChange={(e) => setSceneSettings({
                ...sceneSettings,
                [editingSceneType]: {
                  ...sceneSettings[editingSceneType],
                  auto_play: parseInt(e.target.value)
                }
              })}
              style={formInput}
              min="2000"
              max="15000"
              step="500"
            />
            <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 4 }}>
              Current: {(sceneSettings[editingSceneType]?.auto_play || 6000) / 1000} seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Templates Tab
  const renderTemplatesTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>📦 Opportunity Templates</h2>
        <button onClick={() => setShowAddTemplate(true)} style={primaryBtn}>
          + Create Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={emptyTitle}>No templates yet</div>
          <div style={emptySubtext}>Create templates to quickly configure scene settings for different categories</div>
        </div>
      ) : (
        <div style={templatesGrid}>
          {templates.map(template => (
            <div key={template.id} style={templateCard}>
              <div style={templateHeader}>
                <div>
                  <div style={templateName}>{template.name}</div>
                  <div style={templateCategory}>Category: {template.category}</div>
                </div>
                {template.is_default && (
                  <span style={defaultBadge}>⭐ Default</span>
                )}
              </div>
              <div style={templateBody}>
                <div style={templateStats}>
                  <span>📋 {Object.keys(template.scene_config || {}).length} scenes</span>
                  <span>🏷️ {(template.trust_signals || []).length} trust signals</span>
                </div>
              </div>
              <div style={templateActions}>
                <button onClick={() => handleApplyTemplate(template.id)} style={primarySmallBtn}>
                  Apply Template
                </button>
                <button onClick={() => handleDeleteTemplate(template.id)} style={dangerSmallBtn}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Template Modal */}
      {showAddTemplate && (
        <div style={modalOverlay} onClick={() => setShowAddTemplate(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Create Template</h3>
            <div style={formGroup}>
              <label style={formLabel}>Template Name *</label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                style={formInput}
                placeholder="e.g. Electronics Template"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Category *</label>
              <input
                type="text"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                style={formInput}
                placeholder="e.g. electronics"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Default Template</label>
              <input
                type="checkbox"
                checked={newTemplate.is_default}
                onChange={(e) => setNewTemplate({ ...newTemplate, is_default: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              <span style={{ fontSize: 13, color: '#8E99B3' }}>Set as default template for this category</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddTemplate(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleAddTemplate} disabled={saving} style={primaryBtn}>
                {saving ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Trust & Badges Tab
  const renderTrustBadgesTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>🏷️ Trust Signals & Badges</h2>
      </div>

      {/* Trust Signals Section */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <h3 style={sectionTitle}>Trust Signals</h3>
          <button onClick={() => setShowAddTrustSignal(true)} style={primaryBtn}>
            + Add Trust Signal
          </button>
        </div>

        <div style={trustSignalsGrid}>
          {trustSignals.map(signal => (
            <div key={signal.id} style={trustSignalCard}>
              <div style={trustSignalIcon} style={{ color: signal.color }}>
                {signal.icon}
              </div>
              <div style={trustSignalInfo}>
                <div style={trustSignalLabel}>{signal.label}</div>
                <div style={trustSignalScenes}>
                  Shows on: {signal.show_on_scenes?.join(', ') || 'All'}
                </div>
              </div>
              <div style={trustSignalActions}>
                <button
                  onClick={() => handleToggleTrustSignal(signal.id, !signal.is_active)}
                  style={signal.is_active ? activeBtn : inactiveBtn}
                >
                  {signal.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDeleteTrustSignal(signal.id)} style={dangerSmallBtn}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges Section */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <h3 style={sectionTitle}>Badges</h3>
          <button onClick={() => setShowAddBadge(true)} style={primaryBtn}>
            + Add Badge
          </button>
        </div>

        <div style={badgesGrid}>
          {badges.map(badge => (
            <div key={badge.id} style={badgeCard}>
              <div style={badgePreview}>
                <span style={{ fontSize: 24 }}>{badge.icon}</span>
                <span style={{ 
                  ...badgeStyle, 
                  background: badge.color,
                  color: '#FFFFFF'
                }}>
                  {badge.label}
                </span>
              </div>
              <div style={badgeInfo}>
                <div style={badgeName}>{badge.name}</div>
                <div style={badgeType}>Style: {badge.badge_style}</div>
              </div>
              <div style={badgeActions}>
                <button
                  onClick={() => handleToggleBadge(badge.id, !badge.is_active)}
                  style={badge.is_active ? activeBtn : inactiveBtn}
                >
                  {badge.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDeleteBadge(badge.id)} style={dangerSmallBtn}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Trust Signal Modal */}
      {showAddTrustSignal && (
        <div style={modalOverlay} onClick={() => setShowAddTrustSignal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Add Trust Signal</h3>
            <div style={formGroup}>
              <label style={formLabel}>Label *</label>
              <input
                type="text"
                value={newTrustSignal.label}
                onChange={(e) => setNewTrustSignal({ ...newTrustSignal, label: e.target.value })}
                style={formInput}
                placeholder="e.g. Verified Provider"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Icon</label>
              <input
                type="text"
                value={newTrustSignal.icon}
                onChange={(e) => setNewTrustSignal({ ...newTrustSignal, icon: e.target.value })}
                style={formInput}
                placeholder="e.g. ✅"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Color</label>
              <input
                type="color"
                value={newTrustSignal.color}
                onChange={(e) => setNewTrustSignal({ ...newTrustSignal, color: e.target.value })}
                style={{ ...formInput, padding: 4, height: 40 }}
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Show on Scenes</label>
              <select
                multiple
                value={newTrustSignal.show_on_scenes}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions, option => option.value);
                  setNewTrustSignal({ ...newTrustSignal, show_on_scenes: options });
                }}
                style={{ ...formInput, height: 80 }}
              >
                <option value="hero">Hero</option>
                <option value="details">Details</option>
                <option value="trust">Trust</option>
                <option value="gallery">Gallery</option>
                <option value="action">Action</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddTrustSignal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleAddTrustSignal} disabled={saving} style={primaryBtn}>
                {saving ? 'Adding...' : 'Add Signal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Badge Modal */}
      {showAddBadge && (
        <div style={modalOverlay} onClick={() => setShowAddBadge(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Add Badge</h3>
            <div style={formGroup}>
              <label style={formLabel}>Name *</label>
              <input
                type="text"
                value={newBadge.name}
                onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                style={formInput}
                placeholder="e.g. Popular"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Label *</label>
              <input
                type="text"
                value={newBadge.label}
                onChange={(e) => setNewBadge({ ...newBadge, label: e.target.value })}
                style={formInput}
                placeholder="e.g. 🔥 Popular"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Icon</label>
              <input
                type="text"
                value={newBadge.icon}
                onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })}
                style={formInput}
                placeholder="e.g. 🔥"
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Color</label>
              <input
                type="color"
                value={newBadge.color}
                onChange={(e) => setNewBadge({ ...newBadge, color: e.target.value })}
                style={{ ...formInput, padding: 4, height: 40 }}
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Badge Style</label>
              <select
                value={newBadge.badge_style}
                onChange={(e) => setNewBadge({ ...newBadge, badge_style: e.target.value })}
                style={formInput}
              >
                <option value="default">Default</option>
                <option value="popular">Popular</option>
                <option value="new">New</option>
                <option value="deal">Deal</option>
                <option value="trending">Trending</option>
                <option value="premium">Premium</option>
                <option value="limited">Limited</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddBadge(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleAddBadge} disabled={saving} style={primaryBtn}>
                {saving ? 'Adding...' : 'Add Badge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Algorithm Tab
  const renderAlgorithmTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>🤖 Algorithm Settings</h2>
        <button onClick={handleSaveAlgorithmSettings} disabled={saving} style={primaryBtn}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div style={algorithmGrid}>
        <div style={algorithmCard}>
          <div style={algorithmLabel}>Watch Time Weight</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmSettings.watch_time_weight}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, watch_time_weight: parseInt(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.watch_time_weight}%</span>
          </div>
          <div style={algorithmDesc}>How much the algorithm values watch time</div>
        </div>

        <div style={algorithmCard}>
          <div style={algorithmLabel}>Engagement Weight</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmSettings.engagement_weight}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, engagement_weight: parseInt(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.engagement_weight}%</span>
          </div>
          <div style={algorithmDesc}>Saves, shares, comments, likes</div>
        </div>

        <div style={algorithmCard}>
          <div style={algorithmLabel}>Relevance Weight</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmSettings.relevance_weight}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, relevance_weight: parseInt(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.relevance_weight}%</span>
          </div>
          <div style={algorithmDesc}>Category and interest matching</div>
        </div>

        <div style={algorithmCard}>
          <div style={algorithmLabel}>Popularity Weight</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmSettings.popularity_weight}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, popularity_weight: parseInt(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.popularity_weight}%</span>
          </div>
          <div style={algorithmDesc}>How much to show popular items</div>
        </div>

        <div style={algorithmCard}>
          <div style={algorithmLabel}>Novelty Weight</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmSettings.novelty_weight}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, novelty_weight: parseInt(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.novelty_weight}%</span>
          </div>
          <div style={algorithmDesc}>Show new/diverse content</div>
        </div>

        <div style={algorithmCard}>
          <div style={algorithmLabel}>Exploration Rate</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmSettings.exploration_rate}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, exploration_rate: parseInt(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.exploration_rate}%</span>
          </div>
          <div style={algorithmDesc}>Show content outside known interests</div>
        </div>

        <div style={algorithmCard}>
          <div style={algorithmLabel}>Minimum Rating Threshold</div>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={algorithmSettings.min_rating}
              onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, min_rating: parseFloat(e.target.value) })}
              style={slider}
            />
            <span style={sliderValue}>{algorithmSettings.min_rating}★</span>
          </div>
          <div style={algorithmDesc}>Only show items with rating above this</div>
        </div>
      </div>
    </div>
  );

  // Render Flash Deals Tab
  const renderFlashDealsTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>🏷️ Flash Deals</h2>
        <button onClick={() => setShowAddDeal(true)} style={primaryBtn}>
          + Create Flash Deal
        </button>
      </div>

      {flashDeals.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <div style={emptyTitle}>No flash deals yet</div>
          <div style={emptySubtext}>Create time-limited promotions for products and services</div>
        </div>
      ) : (
        <div style={flashDealGrid}>
          {flashDeals.map(deal => (
            <div key={deal.id} style={flashDealCard}>
              <div style={flashDealHeader}>
                <div>
                  <div style={flashDealName}>{deal.item_type}: {deal.item_id.slice(0, 8)}...</div>
                  <div style={flashDealDiscount}>🔥 {deal.discount_percentage}% OFF</div>
                </div>
                <div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: deal.is_active ? '#E8F5E9' : '#FFEBEE',
                    color: deal.is_active ? '#2E7D32' : '#C62828'
                  }}>
                    {deal.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div style={flashDealBody}>
                <div style={flashDealPrice}>
                  <span style={flashDealOriginal}>{formatMoney(deal.original_price)}</span>
                  <span style={flashDealNew}>{formatMoney(deal.deal_price)}</span>
                </div>
                <div style={flashDealDates}>
                  <span>🕐 {new Date(deal.start_time).toLocaleDateString()}</span>
                  <span>→</span>
                  <span>⏳ {new Date(deal.end_time).toLocaleDateString()}</span>
                </div>
                {deal.stock_limit && (
                  <div style={flashDealStock}>📦 {deal.sold_count || 0}/{deal.stock_limit} sold</div>
                )}
              </div>
              <div style={flashDealActions}>
                <button
                  onClick={() => handleToggleFlashDeal(deal.id, !deal.is_active)}
                  style={deal.is_active ? suspendBtn : primarySmallBtn}
                >
                  {deal.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Flash Deal Modal */}
      {showAddDeal && (
        <div style={modalOverlay} onClick={() => setShowAddDeal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Create Flash Deal</h3>
            <div style={formGroup}>
              <label style={formLabel}>Item Type</label>
              <select
                value={newDeal.item_type}
                onChange={(e) => setNewDeal({ ...newDeal, item_type: e.target.value })}
                style={formInput}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Select Item</label>
              <select
                value={newDeal.item_id}
                onChange={(e) => setNewDeal({ ...newDeal, item_id: e.target.value })}
                style={formInput}
              >
                <option value="">Select an item...</option>
                {availableItems.filter(a => a.type === newDeal.item_type).map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                ))}
              </select>
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Original Price</label>
              <input
                type="number"
                value={newDeal.original_price}
                onChange={(e) => setNewDeal({ ...newDeal, original_price: e.target.value })}
                style={formInput}
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Deal Price</label>
              <input
                type="number"
                value={newDeal.deal_price}
                onChange={(e) => setNewDeal({ ...newDeal, deal_price: e.target.value })}
                style={formInput}
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Start Time</label>
              <input
                type="datetime-local"
                value={newDeal.start_time}
                onChange={(e) => setNewDeal({ ...newDeal, start_time: e.target.value })}
                style={formInput}
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>End Time</label>
              <input
                type="datetime-local"
                value={newDeal.end_time}
                onChange={(e) => setNewDeal({ ...newDeal, end_time: e.target.value })}
                style={formInput}
              />
            </div>
            <div style={formGroup}>
              <label style={formLabel}>Stock Limit (optional)</label>
              <input
                type="number"
                value={newDeal.stock_limit}
                onChange={(e) => setNewDeal({ ...newDeal, stock_limit: e.target.value })}
                style={formInput}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddDeal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleCreateFlashDeal} disabled={saving} style={primaryBtn}>
                {saving ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Analytics Tab
  const renderAnalyticsTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>📊 Opportunity Analytics</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={analyticsDateRange}
            onChange={(e) => { setAnalyticsDateRange(e.target.value); fetchAnalytics(); }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #DCE5FF', fontSize: 13 }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button style={exportBtn}>📥 Export</button>
        </div>
      </div>

      {analyticsData.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={emptyTitle}>No analytics data yet</div>
          <div style={emptySubtext}>Data will appear once users start interacting with opportunities</div>
        </div>
      ) : (
        <div style={analyticsTableContainer}>
          <table style={analyticsTable}>
            <thead>
              <tr>
                <th style={analyticsTh}>Item</th>
                <th style={analyticsTh}>Type</th>
                <th style={analyticsTh}>Views</th>
                <th style={analyticsTh}>Shares</th>
                <th style={analyticsTh}>Saves</th>
                <th style={analyticsTh}>CTR</th>
                <th style={analyticsTh}>Date</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.map((item, index) => (
                <tr key={index} style={analyticsTr}>
                  <td style={analyticsTd}>{item.item_id.slice(0, 8)}...</td>
                  <td style={analyticsTd}>{item.item_type}</td>
                  <td style={analyticsTd}>{item.views || 0}</td>
                  <td style={analyticsTd}>{item.shares || 0}</td>
                  <td style={analyticsTd}>{item.saves || 0}</td>
                  <td style={analyticsTd}>{item.conversion_rate || 0}%</td>
                  <td style={analyticsTd}>{new Date(item.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render Moderation Tab
  const renderModerationTab = () => (
    <div>
      <div style={tabHeaderStyles}>
        <h2 style={tabTitle}>🛡️ Content Moderation</h2>
        <div style={{ fontSize: 12, color: '#8E99B3' }}>
          {reports.filter(r => r.status === 'pending').length} pending reports
        </div>
      </div>

      {reports.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={emptyTitle}>No reports</div>
          <div style={emptySubtext}>All content is clean and moderated</div>
        </div>
      ) : (
        <div style={reportsList}>
          {reports.map(report => (
            <div key={report.id} style={reportCard}>
              <div style={reportHeader}>
                <div>
                  <div style={reportItem}>Reported: {report.item_id.slice(0, 8)}...</div>
                  <div style={reportReason}>Reason: {report.reason}</div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  background: report.status === 'pending' ? '#FFF3E0' : report.status === 'reviewed' ? '#E3F2FD' : '#E8F5E9',
                  color: report.status === 'pending' ? '#E65100' : report.status === 'reviewed' ? '#1565C0' : '#2E7D32'
                }}>
                  {report.status || 'pending'}
                </span>
              </div>
              <div style={reportBody}>
                <div style={reportDescription}>{report.description || 'No description provided'}</div>
                <div style={reportMeta}>
                  <span>👤 {report.users?.full_name || 'Anonymous'}</span>
                  <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {report.status === 'pending' && (
                <div style={reportActions}>
                  <input
                    type="text"
                    placeholder="Add moderation notes..."
                    value={selectedReport === report.id ? moderationNote : ''}
                    onChange={(e) => {
                      setSelectedReport(report.id);
                      setModerationNote(e.target.value);
                    }}
                    style={moderationInput}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleModerateReport(report.id, 'actioned')} style={primarySmallBtn}>
                      ✅ Approve
                    </button>
                    <button onClick={() => handleModerateReport(report.id, 'dismissed')} style={suspendBtn}>
                      ❌ Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Main Render ---
  const tabs = [
    { key: 'featured', label: '⭐ Featured' },
    { key: 'scenes', label: '🎨 Scenes' },
    { key: 'templates', label: '📦 Templates' },
    { key: 'trustbadges', label: '🏷️ Trust & Badges' },
    { key: 'algorithm', label: '🤖 Algorithm' },
    { key: 'flashdeals', label: '🏷️ Flash Deals' },
    { key: 'analytics', label: '📊 Analytics' },
    { key: 'moderation', label: '🛡️ Moderation' },
  ];

  return (
    <div style={{ padding: '30px 32px' }}>
      <div style={headerContainer}>
        <div>
          <div style={breadcrumb}>Dashboard &gt; Opportunity Engine</div>
          <h1 style={pageTitle}>⚙️ Opportunity Engine</h1>
          <p style={pageSubtitle}>Configure how opportunities appear in the feed, manage promotions, and customize the user experience.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabsContainer}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...tabStyle,
              background: activeTab === tab.key ? '#4A7DFF' : 'transparent',
              color: activeTab === tab.key ? '#FFFFFF' : '#8E99B3',
              borderBottom: activeTab === tab.key ? 'none' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={tabContent}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8E99B3' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
            Loading...
          </div>
        ) : (
          <>
            {activeTab === 'featured' && renderFeaturedTab()}
            {activeTab === 'scenes' && renderScenesTab()}
            {activeTab === 'templates' && renderTemplatesTab()}
            {activeTab === 'trustbadges' && renderTrustBadgesTab()}
            {activeTab === 'algorithm' && renderAlgorithmTab()}
            {activeTab === 'flashdeals' && renderFlashDealsTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
            {activeTab === 'moderation' && renderModerationTab()}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const headerContainer = {
  marginBottom: 28
};

const breadcrumb = {
  fontSize: 12,
  color: '#8E99B3',
  marginBottom: 4
};

const pageTitle = {
  fontSize: 26,
  fontWeight: 800,
  color: '#1F2F5F',
  margin: 0
};

const pageSubtitle = {
  color: '#8E99B3',
  fontSize: 14,
  marginTop: 4
};

const tabsContainer = {
  display: 'flex',
  gap: 4,
  borderBottom: '1px solid #EEF3FF',
  marginBottom: 24
};

const tabStyle = {
  padding: '12px 20px',
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  background: 'transparent',
  color: '#8E99B3',
};

const tabContent = {
  minHeight: 400
};

const tabHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20
};

const tabTitle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#1F2F5F',
  margin: 0
};

const emptyState = {
  textAlign: 'center',
  padding: 60,
  color: '#8E99B3',
  background: '#FAFBFF',
  borderRadius: 16,
  border: '1px solid #EEF3FF'
};

const emptyTitle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#1F2F5F',
  marginBottom: 4
};

const emptySubtext = {
  fontSize: 13,
  color: '#8E99B3'
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

const primarySmallBtn = {
  padding: '6px 14px',
  borderRadius: 8,
  background: '#4A7DFF',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 600,
  fontSize: 12,
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

const dangerSmallBtn = {
  padding: '6px 14px',
  borderRadius: 8,
  background: '#FFEBEE',
  color: '#C62828',
  border: 'none',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer'
};

const suspendBtn = {
  padding: '6px 14px',
  borderRadius: 8,
  background: '#FFF3E0',
  color: '#E65100',
  border: 'none',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer'
};

const exportBtn = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid #DCE5FF',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer'
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

const modalTitle = {
  fontSize: 20,
  fontWeight: 800,
  color: '#1F2F5F',
  margin: '0 0 20px 0'
};

const formGroup = {
  marginBottom: 16
};

const formLabel = {
  fontSize: 12,
  fontWeight: 600,
  color: '#1F2F5F',
  display: 'block',
  marginBottom: 5
};

const formInput = {
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

// Featured styles
const featuredGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16
};

const featuredCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  border: '1px solid #EEF3FF'
};

const featuredCardHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8
};

const featuredPriority = {
  width: 30,
  height: 30,
  borderRadius: 15,
  background: '#4A7DFF',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 12
};

const featuredItemName = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1F2F5F'
};

const featuredItemType = {
  fontSize: 11,
  color: '#8E99B3'
};

const featuredLabel = {
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 600,
  background: '#FFF8E1',
  color: '#F57F17'
};

const featuredCardBody = {
  display: 'flex',
  gap: 12,
  marginBottom: 8,
  fontSize: 11,
  color: '#8E99B3'
};

const featuredBadge = {
  padding: '2px 8px',
  borderRadius: 10,
  background: '#F5F6FA'
};

const featuredEndDate = {
  padding: '2px 8px',
  borderRadius: 10,
  background: '#F5F6FA'
};

const featuredCardActions = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  paddingTop: 8,
  borderTop: '1px solid #EEF3FF'
};

const priorityInput = {
  width: 60,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #DCE5FF',
  fontSize: 12
};

// Scene styles
const sceneTypeTabs = {
  display: 'flex',
  gap: 8,
  marginBottom: 20
};

const sceneTypeTab = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const sceneEditor = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 24
};

const sceneOrderSection = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #EEF3FF'
};

const sceneOrderList = {
  marginTop: 12
};

const sceneOrderItem = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  marginBottom: 6,
  background: '#F8FAFF',
  borderRadius: 8,
  border: '1px solid #EEF3FF',
  cursor: 'grab'
};

const sceneOrderBadge = {
  padding: '2px 8px',
  borderRadius: 10,
  background: '#4A7DFF',
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: 600
};

const sceneConfigSection = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #EEF3FF'
};

const sectionSubtitle = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1F2F5F',
  margin: '0 0 12px 0'
};

// Algorithm styles
const algorithmGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16
};

const algorithmCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  border: '1px solid #EEF3FF'
};

const algorithmLabel = {
  fontSize: 13,
  fontWeight: 600,
  color: '#1F2F5F',
  marginBottom: 8
};

const sliderContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: 12
};

const slider = {
  flex: 1,
  height: 4,
  WebkitAppearance: 'none',
  background: '#DCE5FF',
  borderRadius: 2,
  outline: 'none'
};

const sliderValue = {
  minWidth: 40,
  fontSize: 14,
  fontWeight: 600,
  color: '#4A7DFF',
  textAlign: 'right'
};

const algorithmDesc = {
  fontSize: 11,
  color: '#8E99B3',
  marginTop: 6
};

// Flash Deals styles
const flashDealGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 16
};

const flashDealCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  border: '1px solid #EEF3FF'
};

const flashDealHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8
};

const flashDealName = {
  fontSize: 13,
  fontWeight: 600,
  color: '#1F2F5F'
};

const flashDealDiscount = {
  fontSize: 18,
  fontWeight: 800,
  color: '#F44336'
};

const flashDealBody = {
  marginBottom: 12
};

const flashDealPrice = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 6
};

const flashDealOriginal = {
  fontSize: 13,
  color: '#8E99B3',
  textDecoration: 'line-through'
};

const flashDealNew = {
  fontSize: 16,
  fontWeight: 700,
  color: '#4CAF50'
};

const flashDealDates = {
  display: 'flex',
  gap: 8,
  fontSize: 11,
  color: '#8E99B3',
  marginBottom: 4
};

const flashDealStock = {
  fontSize: 11,
  color: '#8E99B3'
};

const flashDealActions = {
  paddingTop: 12,
  borderTop: '1px solid #EEF3FF'
};

// Analytics styles
const analyticsTableContainer = {
  background: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #EEF3FF',
  overflow: 'hidden'
};

const analyticsTable = {
  width: '100%',
  borderCollapse: 'collapse'
};

const analyticsTh = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 11,
  color: '#8E99B3',
  fontWeight: 600,
  textTransform: 'uppercase',
  background: '#FAFBFF',
  borderBottom: '1px solid #EEF3FF'
};

const analyticsTd = {
  padding: '10px 16px',
  fontSize: 13,
  color: '#1F2F5F',
  borderBottom: '1px solid #F5F6FA'
};

const analyticsTr = {
  transition: 'background 0.2s'
};

// Moderation styles
const reportsList = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12
};

const reportCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  border: '1px solid #EEF3FF'
};

const reportHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8
};

const reportItem = {
  fontSize: 13,
  fontWeight: 600,
  color: '#1F2F5F'
};

const reportReason = {
  fontSize: 12,
  color: '#8E99B3'
};

const reportBody = {
  marginBottom: 12
};

const reportDescription = {
  fontSize: 12,
  color: '#1F2F5F',
  marginBottom: 6
};

const reportMeta = {
  display: 'flex',
  gap: 16,
  fontSize: 11,
  color: '#8E99B3'
};

const reportActions = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  paddingTop: 12,
  borderTop: '1px solid #EEF3FF',
  flexWrap: 'wrap'
};

const moderationInput = {
  flex: 1,
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #DCE5FF',
  fontSize: 12,
  minWidth: 150
};

// Additional styles
const sectionCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #EEF3FF',
  marginBottom: 24,
};

const sectionHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
};

const sectionTitle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#1F2F5F',
  margin: 0,
};

const trustSignalsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 12,
};

const trustSignalCard = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  background: '#F8FAFF',
  borderRadius: 8,
  border: '1px solid #EEF3FF',
};

const trustSignalIcon = {
  fontSize: 24,
  width: 40,
  textAlign: 'center',
};

const trustSignalInfo = {
  flex: 1,
};

const trustSignalLabel = {
  fontSize: 13,
  fontWeight: 600,
  color: '#1F2F5F',
};

const trustSignalScenes = {
  fontSize: 11,
  color: '#8E99B3',
};

const trustSignalActions = {
  display: 'flex',
  gap: 4,
};

const badgesGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: 12,
};

const badgeCard = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  background: '#F8FAFF',
  borderRadius: 8,
  border: '1px solid #EEF3FF',
};

const badgePreview = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minWidth: 60,
};

const badgeStyle = {
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 700,
};

const badgeInfo = {
  flex: 1,
};

const badgeName = {
  fontSize: 13,
  fontWeight: 600,
  color: '#1F2F5F',
};

const badgeType = {
  fontSize: 11,
  color: '#8E99B3',
};

const badgeActions = {
  display: 'flex',
  gap: 4,
};

const activeBtn = {
  padding: '4px 10px',
  borderRadius: 6,
  border: 'none',
  fontSize: 10,
  fontWeight: 600,
  background: '#E8F5E9',
  color: '#2E7D32',
  cursor: 'pointer',
};

const inactiveBtn = {
  padding: '4px 10px',
  borderRadius: 6,
  border: 'none',
  fontSize: 10,
  fontWeight: 600,
  background: '#FFEBEE',
  color: '#C62828',
  cursor: 'pointer',
};

const templatesGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16,
};

const templateCard = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  border: '1px solid #EEF3FF',
};

const templateHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8,
};

const templateName = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1F2F5F',
};

const templateCategory = {
  fontSize: 12,
  color: '#8E99B3',
};

const defaultBadge = {
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 600,
  background: '#FFF8E1',
  color: '#F57F17',
};

const templateBody = {
  marginBottom: 12,
};

const templateStats = {
  display: 'flex',
  gap: 12,
  fontSize: 12,
  color: '#8E99B3',
};

const templateActions = {
  display: 'flex',
  gap: 8,
  paddingTop: 12,
  borderTop: '1px solid #EEF3FF',
};