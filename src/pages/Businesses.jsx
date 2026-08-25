import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Businesses() {
  // State for different data types
  const [individuals, setIndividuals] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('individuals');
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Detail panel states
  const [detailTab, setDetailTab] = useState('overview');
  const [reviews, setReviews] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [verificationNote, setVerificationNote] = useState('');

  // Fetch data when tab changes
  useEffect(() => {
    fetchData();
  }, [tab]);

  // Load details when a business is selected
  useEffect(() => {
    if (selectedItem) {
      loadBusinessDetails(selectedItem);
    }
  }, [selectedItem]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      if (tab === 'individuals') {
        const { data, error } = await supabase
          .from('individual_providers')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setIndividuals(data);
      } 
      else if (tab === 'institutions') {
        const { data, error } = await supabase
          .from('institutions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setInstitutions(data);
      } 
      else if (tab === 'shops') {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setShops(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessDetails = async (business) => {
    setLoadingDetails(true);
    setDetailTab('overview');
    
    try {
      // Load reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, customer:customer_id(full_name, phone_number)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      setReviews(reviewsData || []);

      // Load products/services based on type
      if (tab === 'shops') {
        // Load shop products
        const { data: productsData } = await supabase
          .from('shop_products')
          .select('*, catalog:catalog_id(id, name, description, images, specifications, category, brand)')
          .eq('shop_id', business.id);
        setOfferings(productsData || []);
      } else if (tab === 'individuals') {
        // Load provider services
        const { data: servicesData } = await supabase
          .from('provider_services')
          .select('*, service_catalog:service_id(id, name, description, images, duration, category, specifications)')
          .eq('user_id', business.id);
        setOfferings(servicesData || []);
      } else if (tab === 'institutions') {
        // Load institution services
        const { data: servicesData } = await supabase
          .from('provider_services')
          .select('*, service_catalog:service_id(id, name, description, images, duration, category, specifications)')
          .eq('institution_id', business.id);
        setOfferings(servicesData || []);
      }

      // Load documents
      const { data: docsData } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', business.id)
        .order('uploaded_at', { ascending: false });
      setDocuments(docsData || []);

    } catch (error) {
      console.error('Error loading business details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    if (tab === 'individuals') return individuals;
    if (tab === 'institutions') return institutions;
    return shops;
  };

  // Stats for each type
  const stats = {
    individuals: individuals.length,
    institutions: institutions.length,
    shops: shops.length,
  };

  // Search and filter
  const currentData = getCurrentData();
  const filtered = currentData.filter(item => {
    let name = '';
    if (tab === 'individuals') name = item.full_name || item.display_name || '';
    else if (tab === 'institutions') name = item.name || '';
    else if (tab === 'shops') name = item.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Tabs configuration
  const tabs = [
    { key: 'individuals', label: `Individual Providers (${stats.individuals})` },
    { key: 'institutions', label: `Institutions (${stats.institutions})` },
    { key: 'shops', label: `Shops (${stats.shops})` }
  ];

  // Get status badge for different types
  const getStatusBadge = (item) => {
    if (tab === 'individuals') {
      if (!item.is_verified) return { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' };
      if (!item.is_active) return { bg: '#FFEBEE', color: '#F44336', label: 'Inactive' };
      if (item.is_available_for_hire) return { bg: '#E8F5E9', color: '#4CAF50', label: 'Available' };
      return { bg: '#E3F2FD', color: '#1976D2', label: 'Active' };
    } else if (tab === 'institutions') {
      if (!item.is_verified) return { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' };
      if (!item.is_open) return { bg: '#FFEBEE', color: '#F44336', label: 'Closed' };
      return { bg: '#E8F5E9', color: '#4CAF50', label: 'Active' };
    } else {
      if (!item.is_verified) return { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' };
      if (!item.is_open) return { bg: '#FFEBEE', color: '#F44336', label: 'Closed' };
      if (item.is_anchor_partner) return { bg: '#E8F5E9', color: '#4CAF50', label: 'Partner' };
      return { bg: '#E8F5E9', color: '#4CAF50', label: 'Active' };
    }
  };

  // --- CRUD Operations ---
  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    setSaving(true);
    
    try {
      let table = '';
      if (tab === 'individuals') table = 'individual_providers';
      else if (tab === 'institutions') table = 'institutions';
      else table = 'shops';

      const { error } = await supabase
        .from(table)
        .update(formData)
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Update local state
      const updateData = (data) => data.map(item => 
        item.id === selectedItem.id ? { ...item, ...formData } : item
      );
      
      if (tab === 'individuals') setIndividuals(updateData);
      else if (tab === 'institutions') setInstitutions(updateData);
      else setShops(updateData);
      
      setSelectedItem({ ...selectedItem, ...formData });
      setShowEditModal(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleVerify = async () => {
    if (!selectedItem) return;
    setSaving(true);
    
    try {
      let table = '';
      if (tab === 'individuals') table = 'individual_providers';
      else if (tab === 'institutions') table = 'institutions';
      else table = 'shops';

      const newStatus = !selectedItem.is_verified;
      const { error } = await supabase
        .from(table)
        .update({ is_verified: newStatus })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Update local state
      const updateData = (data) => data.map(item => 
        item.id === selectedItem.id ? { ...item, is_verified: newStatus } : item
      );
      
      if (tab === 'individuals') setIndividuals(updateData);
      else if (tab === 'institutions') setInstitutions(updateData);
      else setShops(updateData);
      
      setSelectedItem({ ...selectedItem, is_verified: newStatus });
      setShowVerifyModal(false);
      setVerificationNote('');
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleSuspend = async () => {
    if (!selectedItem) return;
    setSaving(true);
    
    try {
      let table = '';
      let activeField = 'is_active';
      
      if (tab === 'individuals') {
        table = 'individual_providers';
        activeField = 'is_active';
      } else if (tab === 'institutions') {
        table = 'institutions';
        activeField = 'is_open';
      } else {
        table = 'shops';
        activeField = 'is_open';
      }

      const newStatus = !selectedItem[activeField];
      const { error } = await supabase
        .from(table)
        .update({ [activeField]: newStatus })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Update local state
      const updateData = (data) => data.map(item => 
        item.id === selectedItem.id ? { ...item, [activeField]: newStatus } : item
      );
      
      if (tab === 'individuals') setIndividuals(updateData);
      else if (tab === 'institutions') setInstitutions(updateData);
      else setShops(updateData);
      
      setSelectedItem({ ...selectedItem, [activeField]: newStatus });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSaving(true);
    
    try {
      let table = '';
      if (tab === 'individuals') table = 'individual_providers';
      else if (tab === 'institutions') table = 'institutions';
      else table = 'shops';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Update local state
      if (tab === 'individuals') setIndividuals(prev => prev.filter(i => i.id !== selectedItem.id));
      else if (tab === 'institutions') setInstitutions(prev => prev.filter(i => i.id !== selectedItem.id));
      else setShops(prev => prev.filter(i => i.id !== selectedItem.id));
      
      setSelectedItem(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  // Format date helper
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '—';

  // Format currency
  const formatCurrency = (amount) => {
    return `UGX ${Number(amount || 0).toLocaleString()}`;
  };

  // Render table row based on tab
  const renderTableRow = (item) => {
    if (tab === 'individuals') {
      return (
        <tr
          key={item.id}
          onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
          style={{
            borderBottom: '1px solid #F5F6FA',
            cursor: 'pointer',
            background: selectedItem?.id === item.id ? '#F8FAFF' : '#FFFFFF',
            transition: 'background 0.2s',
          }}
        >
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#E8F0FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#4A7DFF'
              }}>
                {item.profile_image ? (
                  <img 
                    src={item.profile_image} 
                    alt={item.full_name} 
                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                  />
                ) : (
                  item.full_name?.[0] || 'I'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.full_name}</div>
                <div style={{ fontSize: 10, color: '#8E99B3' }}>
                  {item.display_name || item.profession || 'Individual Provider'}
                </div>
              </div>
            </div>
          </td>
          <td style={td}>
            <span style={{
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              background: '#F3E5F5',
              color: '#7B1FA2'
            }}>
              {item.specialty || 'General'}
            </span>
          </td>
          <td style={td}>{item.city || '—'}</td>
          <td style={td}>
            <span style={{ fontWeight: 700, color: '#FF9800' }}>
              ⭐ {Number(item.rating || 0).toFixed(1)}
            </span>
            <span style={{ fontSize: 10, color: '#8E99B3', marginLeft: 4 }}>
              ({item.review_count || 0})
            </span>
          </td>
          <td style={td}>
            <span style={item.is_verified ? verifiedBadge : pendingBadge}>
              {item.is_verified ? '✅ Verified' : '⏳ Pending'}
            </span>
          </td>
          <td style={td}>{formatDate(item.created_at)}</td>
        </tr>
      );
    } 
    else if (tab === 'institutions') {
      return (
        <tr
          key={item.id}
          onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
          style={{
            borderBottom: '1px solid #F5F6FA',
            cursor: 'pointer',
            background: selectedItem?.id === item.id ? '#F8FAFF' : '#FFFFFF',
            transition: 'background 0.2s',
          }}
        >
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#E3F2FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#1976D2'
              }}>
                {item.logo ? (
                  <img 
                    src={item.logo} 
                    alt={item.name} 
                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                  />
                ) : (
                  item.name?.[0] || 'C'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: '#8E99B3' }}>
                  {item.type || 'Institution'} • {item.city || 'No city'}
                </div>
              </div>
            </div>
          </td>
          <td style={td}>
            <span style={item.is_verified ? verifiedBadge : pendingBadge}>
              {item.is_verified ? 'Verified' : 'Pending'}
            </span>
          </td>
          <td style={td}>{item.city || item.area || '—'}</td>
          <td style={td}>⭐ {Number(item.rating || 0).toFixed(1)}</td>
          <td style={td}>{formatDate(item.created_at)}</td>
        </tr>
      );
    } 
    else if (tab === 'shops') {
      const status = getStatusBadge(item);
      return (
        <tr
          key={item.id}
          onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
          style={{
            borderBottom: '1px solid #F5F6FA',
            cursor: 'pointer',
            background: selectedItem?.id === item.id ? '#F8FAFF' : '#FFFFFF',
            transition: 'background 0.2s',
          }}
        >
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#E8F5E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                color: '#4CAF50'
              }}>
                {item.name?.[0] || 'S'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: '#8E99B3' }}>{item.address || 'Jinja City'}</div>
              </div>
            </div>
          </td>
          <td style={td}>{item.category || '—'}</td>
          <td style={td}>⭐ {Number(item.rating || 0).toFixed(1)}</td>
          <td style={td}>
            <span style={item.is_verified ? verifiedBadge : pendingBadge}>
              {item.is_verified ? 'Verified' : 'Pending'}
            </span>
          </td>
          <td style={td}>{formatDate(item.created_at)}</td>
        </tr>
      );
    }
  };

  // Render Detail Panel
  const renderDetailPanel = () => {
    if (!selectedItem) return null;

    const businessName = selectedItem.full_name || selectedItem.name || 'Business';
    const isIndividual = tab === 'individuals';
    const isInstitution = tab === 'institutions';
    const isShop = tab === 'shops';

    return (
      <div style={panelStyles}>
        {/* Header */}
        <div style={panelHeader}>
          <div>
            <h3 style={panelTitle}>{businessName}</h3>
            <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2 }}>
              {isIndividual ? 'Individual Provider' : isInstitution ? 'Institution' : 'Shop'} • 
              ID: {selectedItem.id?.slice(0, 8)}...
            </div>
          </div>
          <button onClick={() => setSelectedItem(null)} style={closeBtn}>✕</button>
        </div>

        {/* Status Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: 12, 
            fontSize: 11, 
            fontWeight: 700,
            background: selectedItem.is_verified ? '#E8F5E9' : '#FFF3E0',
            color: selectedItem.is_verified ? '#2E7D32' : '#E65100'
          }}>
            {selectedItem.is_verified ? '✅ Verified' : '⏳ Pending'}
          </span>
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: 12, 
            fontSize: 11, 
            fontWeight: 700,
            background: (selectedItem.is_active || selectedItem.is_open) ? '#E8F5E9' : '#FFEBEE',
            color: (selectedItem.is_active || selectedItem.is_open) ? '#2E7D32' : '#C62828'
          }}>
            {(selectedItem.is_active || selectedItem.is_open) ? '🟢 Active' : '🔴 Inactive'}
          </span>
          {selectedItem.is_anchor_partner && (
            <span style={{ 
              padding: '4px 12px', 
              borderRadius: 12, 
              fontSize: 11, 
              fontWeight: 700,
              background: '#FFF8E1',
              color: '#F57F17'
            }}>
              ⭐ Partner
            </span>
          )}
        </div>

        {/* Detail Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['overview', 'products', 'reviews', 'documents'].map(t => (
            <button 
              key={t} 
              onClick={() => setDetailTab(t)} 
              style={{ 
                ...tabBtn, 
                background: detailTab === t ? '#4A7DFF' : '#F5F6FA', 
                color: detailTab === t ? '#FFFFFF' : '#8E99B3' 
              }}
            >
              {t === 'overview' ? '📋 Overview' : 
               t === 'products' ? (isShop ? '📦 Products' : '🛠️ Services') :
               t === 'reviews' ? '⭐ Reviews' : '📄 Documents'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {detailTab === 'overview' && renderOverview()}
        {detailTab === 'products' && renderOfferings()}
        {detailTab === 'reviews' && renderReviews()}
        {detailTab === 'documents' && renderDocuments()}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF3FF' }}>
          <button onClick={() => handleOpenEdit(selectedItem)} style={actionBtnPrimary}>✏️ Edit</button>
          <button onClick={() => setShowVerifyModal(true)} style={actionBtnSecondary}>
            {selectedItem.is_verified ? '⏳ Unverify' : '✅ Verify'}
          </button>
          <button onClick={handleSuspend} style={actionBtnDanger}>
            {(selectedItem.is_active || selectedItem.is_open) ? '🚫 Suspend' : '▶️ Activate'}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} style={{ ...actionBtnDanger, background: '#FFEBEE', color: '#C62828' }}>
            🗑️ Delete
          </button>
        </div>
      </div>
    );
  };

  // Render Overview Tab
  const renderOverview = () => {
    const item = selectedItem;
    if (!item) return null;

    return (
      <div>
        {loadingDetails ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#8E99B3' }}>Loading details...</div>
        ) : (
          <>
            {/* Basic Info */}
            <div style={detailRow}><span style={detailLabel}>Name</span><span style={detailValue}>{item.full_name || item.name || '—'}</span></div>
            {item.display_name && (
              <div style={detailRow}><span style={detailLabel}>Display Name</span><span style={detailValue}>{item.display_name}</span></div>
            )}
            {item.profession && (
              <div style={detailRow}><span style={detailLabel}>Profession</span><span style={detailValue}>{item.profession}</span></div>
            )}
            {item.specialty && (
              <div style={detailRow}><span style={detailLabel}>Specialty</span><span style={detailValue}>{item.specialty}</span></div>
            )}
            {item.category && (
              <div style={detailRow}><span style={detailLabel}>Category</span><span style={detailValue}>{item.category}</span></div>
            )}
            {item.type && (
              <div style={detailRow}><span style={detailLabel}>Type</span><span style={detailValue}>{item.type}</span></div>
            )}
            {item.experience_years !== undefined && (
              <div style={detailRow}><span style={detailLabel}>Experience</span><span style={detailValue}>{item.experience_years} years</span></div>
            )}
            {item.phone && (
              <div style={detailRow}><span style={detailLabel}>Phone</span><span style={detailValue}>{item.phone}</span></div>
            )}
            {item.email && (
              <div style={detailRow}><span style={detailLabel}>Email</span><span style={detailValue}>{item.email}</span></div>
            )}
            {item.address && (
              <div style={detailRow}><span style={detailLabel}>Address</span><span style={detailValue}>{item.address}</span></div>
            )}
            {item.area && (
              <div style={detailRow}><span style={detailLabel}>Area</span><span style={detailValue}>{item.area}</span></div>
            )}
            {item.city && (
              <div style={detailRow}><span style={detailLabel}>City</span><span style={detailValue}>{item.city}</span></div>
            )}
            {item.website && (
              <div style={detailRow}>
                <span style={detailLabel}>Website</span>
                <span style={detailValue}>
                  <a href={item.website} target="_blank" rel="noopener noreferrer" style={{ color: '#4A7DFF', textDecoration: 'none' }}>
                    🔗 Visit
                  </a>
                </span>
              </div>
            )}
            
            {/* Description/Bio */}
            {(item.description || item.bio) && (
              <div style={{ ...detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <span style={detailLabel}>Description</span>
                <span style={{ fontSize: 12, color: '#1F2F5F', lineHeight: 1.5 }}>
                  {item.description || item.bio}
                </span>
              </div>
            )}

            {/* Rating */}
            <div style={detailRow}>
              <span style={detailLabel}>Rating</span>
              <span style={detailValue}>⭐ {Number(item.rating || 0).toFixed(1)} ({item.review_count || 0} reviews)</span>
            </div>

            {/* Wallet Balance (for shops) */}
            {item.wallet_balance !== undefined && (
              <div style={detailRow}>
                <span style={detailLabel}>Wallet Balance</span>
                <span style={detailValue}>{formatCurrency(item.wallet_balance)}</span>
              </div>
            )}

            {/* Discount (for shops) */}
            {item.discount_percentage !== undefined && (
              <div style={detailRow}>
                <span style={detailLabel}>Discount</span>
                <span style={detailValue}>{item.discount_percentage || 0}%</span>
              </div>
            )}

            {/* Qualifications & Certifications */}
            {item.qualifications && item.qualifications.length > 0 && (
              <div style={{ ...detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <span style={detailLabel}>Qualifications</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.qualifications.map((q, i) => (
                    <span key={i} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: '#E3F2FD', color: '#1565C0' }}>
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {item.certifications && item.certifications.length > 0 && (
              <div style={{ ...detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <span style={detailLabel}>Certifications</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.certifications.map((c, i) => (
                    <span key={i} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: '#FFF3E0', color: '#E65100' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div style={{ ...detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <span style={detailLabel}>Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.tags.map((tag, i) => (
                    <span key={i} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: '#F3E5F5', color: '#7B1FA2' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Joined Date */}
            <div style={detailRow}>
              <span style={detailLabel}>Joined</span>
              <span style={detailValue}>{formatDate(item.created_at)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render Offerings (Products/Services)
  const renderOfferings = () => {
    if (loadingDetails) {
      return <div style={{ textAlign: 'center', padding: 20, color: '#8E99B3' }}>Loading...</div>;
    }

    if (offerings.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 30, color: '#8E99B3' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📭</div>
          <div>No {tab === 'shops' ? 'products' : 'services'} available</div>
        </div>
      );
    }

    return (
      <div>
        {offerings.map((item, index) => {
          const catalog = item.catalog || item.service_catalog || {};
          return (
            <div key={index} style={{ padding: '10px 0', borderBottom: '1px solid #F5F6FA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F' }}>
                  {catalog.name || item.name || 'Unnamed'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4A7DFF' }}>
                  {formatCurrency(item.regular_price || item.price || 0)}
                </span>
              </div>
              {catalog.category && (
                <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2 }}>Category: {catalog.category}</div>
              )}
              {catalog.duration && (
                <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2 }}>⏱️ {catalog.duration}</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {tab === 'shops' ? (
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: 10, 
                    fontSize: 9, 
                    fontWeight: 600,
                    background: item.in_stock ? '#E8F5E9' : '#FFEBEE',
                    color: item.in_stock ? '#2E7D32' : '#C62828'
                  }}>
                    {item.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                ) : (
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: 10, 
                    fontSize: 9, 
                    fontWeight: 600,
                    background: item.is_active ? '#E8F5E9' : '#FFEBEE',
                    color: item.is_active ? '#2E7D32' : '#C62828'
                  }}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Reviews
  const renderReviews = () => {
    if (loadingDetails) {
      return <div style={{ textAlign: 'center', padding: 20, color: '#8E99B3' }}>Loading...</div>;
    }

    if (reviews.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 30, color: '#8E99B3' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>⭐</div>
          <div>No reviews yet</div>
        </div>
      );
    }

    return (
      <div>
        {reviews.map((review, index) => (
          <div key={index} style={{ padding: '10px 0', borderBottom: '1px solid #F5F6FA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F' }}>
                  {review.customer?.full_name || 'Anonymous'}
                </span>
                <span style={{ fontSize: 11, color: '#8E99B3', marginLeft: 8 }}>
                  ⭐ {review.rating}/5
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#8E99B3' }}>{formatDate(review.created_at)}</span>
            </div>
            {review.title && (
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1F2F5F', marginTop: 4 }}>
                {review.title}
              </div>
            )}
            {review.comment && (
              <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2, lineHeight: 1.4 }}>
                {review.comment}
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: 10, 
                fontSize: 9, 
                fontWeight: 600,
                background: review.status === 'published' ? '#E8F5E9' : review.status === 'pending' ? '#FFF3E0' : '#FFEBEE',
                color: review.status === 'published' ? '#2E7D32' : review.status === 'pending' ? '#E65100' : '#C62828'
              }}>
                {review.status || 'pending'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Documents
  const renderDocuments = () => {
    if (loadingDetails) {
      return <div style={{ textAlign: 'center', padding: 20, color: '#8E99B3' }}>Loading...</div>;
    }

    if (documents.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 30, color: '#8E99B3' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📄</div>
          <div>No documents uploaded</div>
        </div>
      );
    }

    const openDocument = (doc) => {
      setSelectedDocument(doc);
      setShowDocumentModal(true);
    };

    return (
      <div>
        {documents.map((doc, index) => (
          <div 
            key={index} 
            style={{ 
              padding: '10px 0', 
              borderBottom: '1px solid #F5F6FA',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => openDocument(doc)}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFF'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4A7DFF' }}>
                    {doc.file_name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2 }}>
                  {doc.document_type?.replace('_', ' ').toUpperCase() || 'Document'}
                  {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: 10, 
                  fontSize: 9, 
                  fontWeight: 600,
                  background: doc.is_verified ? '#E8F5E9' : doc.status === 'pending' ? '#FFF3E0' : '#FFEBEE',
                  color: doc.is_verified ? '#2E7D32' : doc.status === 'pending' ? '#E65100' : '#C62828'
                }}>
                  {doc.is_verified ? '✅ Verified' : doc.status || 'Pending'}
                </span>
                <span style={{ fontSize: 9, color: '#8E99B3' }}>{formatDate(doc.uploaded_at)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Document View Modal */}
        {showDocumentModal && selectedDocument && (
          <div style={modalOverlay} onClick={() => setShowDocumentModal(false)}>
            <div style={{ ...modalContent, width: 600, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
              <div style={panelHeader}>
                <h3 style={panelTitle}>📄 {selectedDocument.file_name}</h3>
                <button onClick={() => setShowDocumentModal(false)} style={closeBtn}>✕</button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={detailRow}><span style={detailLabel}>Type</span><span style={detailValue}>{selectedDocument.document_type?.replace('_', ' ').toUpperCase()}</span></div>
                <div style={detailRow}><span style={detailLabel}>Uploaded</span><span style={detailValue}>{formatDate(selectedDocument.uploaded_at)}</span></div>
                <div style={detailRow}><span style={detailLabel}>Status</span>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: 12, 
                    fontSize: 11, 
                    fontWeight: 700,
                    background: selectedDocument.is_verified ? '#E8F5E9' : '#FFF3E0',
                    color: selectedDocument.is_verified ? '#2E7D32' : '#E65100'
                  }}>
                    {selectedDocument.is_verified ? '✅ Verified' : selectedDocument.status || 'Pending'}
                  </span>
                </div>
                {selectedDocument.rejection_reason && (
                  <div style={{ ...detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <span style={detailLabel}>Rejection Reason</span>
                    <span style={{ fontSize: 12, color: '#C62828' }}>{selectedDocument.rejection_reason}</span>
                  </div>
                )}
                {selectedDocument.file_url && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <a 
                      href={selectedDocument.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        display: 'inline-block',
                        padding: '10px 24px',
                        background: '#4A7DFF',
                        color: '#FFFFFF',
                        borderRadius: 8,
                        textDecoration: 'none',
                        fontWeight: 600
                      }}
                    >
                      📥 Open Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={headerStyles}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Businesses</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Businesses</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Manage all businesses, providers, institutions, and shops on the platform.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              placeholder={`Search ${tab === 'individuals' ? 'providers' : tab === 'institutions' ? 'institutions' : 'shops'}...`} 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
              style={searchInput} 
            />
            <button style={exportBtn}>📥 Export</button>
            <button style={addBtn}>
              + Add {tab === 'individuals' ? 'Provider' : tab === 'institutions' ? 'Institution' : 'Shop'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSelectedItem(null);
                setSearch('');
                setPage(1);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: tab === t.key ? 'none' : '1px solid #DCE5FF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: tab === t.key ? '#4A7DFF' : '#FFFFFF',
                color: tab === t.key ? '#FFFFFF' : '#1F2F5F',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
          <span style={{ fontSize: 12, color: '#8E99B3', marginLeft: 'auto' }}>
            {filtered.length} {tab === 'individuals' ? 'providers' : tab === 'institutions' ? 'institutions' : 'shops'} found
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
            Loading {tab === 'individuals' ? 'providers' : tab === 'institutions' ? 'institutions' : 'shops'}...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8E99B3', background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1F2F5F' }}>No {tab === 'individuals' ? 'providers' : tab === 'institutions' ? 'institutions' : 'shops'} found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          <div style={tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                  {tab === 'individuals' && (
                    <>
                      <th style={th}>Provider</th>
                      <th style={th}>Specialty</th>
                      <th style={th}>City</th>
                      <th style={th}>Rating</th>
                      <th style={th}>Status</th>
                      <th style={th}>Joined</th>
                    </>
                  )}
                  {tab === 'institutions' && (
                    <>
                      <th style={th}>Institution</th>
                      <th style={th}>Status</th>
                      <th style={th}>City</th>
                      <th style={th}>Rating</th>
                      <th style={th}>Joined</th>
                    </>
                  )}
                  {tab === 'shops' && (
                    <>
                      <th style={th}>Shop</th>
                      <th style={th}>Category</th>
                      <th style={th}>Rating</th>
                      <th style={th}>Status</th>
                      <th style={th}>Joined</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {pagedData.map((item) => renderTableRow(item))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={paginationStyles}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>
                Showing {pagedData.length} of {filtered.length} {tab === 'individuals' ? 'providers' : tab === 'institutions' ? 'institutions' : 'shops'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1} 
                  style={pageBtn}
                >
                  ← Prev
                </button>
                <span style={{ padding: '8px 14px', fontSize: 12, color: '#8E99B3' }}>
                  Page {page} of {totalPages || 1}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages || totalPages === 0} 
                  style={pageBtn}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedItem && renderDetailPanel()}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div style={modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>
              Edit {tab === 'individuals' ? 'Provider' : tab === 'institutions' ? 'Institution' : 'Shop'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.keys(formData).map(key => {
                if (key === 'id' || key === 'created_at' || key === 'updated_at') return null;
                if (typeof formData[key] === 'object') return null;
                
                let label = key.replace(/_/g, ' ').toUpperCase();
                let type = 'text';
                if (key === 'rating' || key === 'review_count' || key === 'discount_percentage' || key === 'wallet_balance') {
                  type = 'number';
                }
                if (key === 'is_active' || key === 'is_open' || key === 'is_verified' || key === 'is_available_for_hire') return null;
                
                return (
                  <div key={key}>
                    <label style={flabel}>{label}</label>
                    <input
                      type={type}
                      value={formData[key] || ''}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      style={finput}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowEditModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && selectedItem && (
        <div style={modalOverlay} onClick={() => setShowVerifyModal(false)}>
          <div style={{ ...modalContent, width: 450 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F', margin: '0 0 8px' }}>
              {selectedItem.is_verified ? 'Unverify' : 'Verify'} {selectedItem.name || selectedItem.full_name}
            </h2>
            <p style={{ color: '#8E99B3', fontSize: 13, marginBottom: 16 }}>
              {selectedItem.is_verified 
                ? 'This will remove the verification badge from this business.' 
                : 'This will mark this business as verified on the platform.'}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={flabel}>Notes (optional)</label>
              <textarea
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder="Add any notes about this verification..."
                style={{ ...finput, minHeight: 80, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVerifyModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleVerify} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Processing...' : (selectedItem.is_verified ? 'Unverify' : 'Verify')}
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
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 8px' }}>
              Delete {selectedItem.name || selectedItem.full_name}?
            </h2>
            <p style={{ color: '#8E99B3', fontSize: 13, marginBottom: 20 }}>
              This permanently removes this business and all associated data.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={cancelBtn}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} style={dangerBtn}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const th = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: 11,
  color: '#8E99B3',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5
};

const td = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#1F2F5F'
};

const verifiedBadge = {
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 700,
  background: '#E8F5E9',
  color: '#2E7D32'
};

const pendingBadge = {
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 700,
  background: '#FFF3E0',
  color: '#E65100'
};

const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 24
};

const searchInput = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  width: 260,
  fontSize: 13
};

const exportBtn = {
  padding: '10px 18px',
  borderRadius: 10,
  border: '1px solid #DCE5FF',
  background: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer'
};

const addBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  background: '#4A7DFF',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer'
};

const tableContainer = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #EEF3FF',
  overflow: 'hidden'
};

const paginationStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 20px',
  borderTop: '1px solid #EEF3FF'
};

const pageBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #DCE5FF',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#FFFFFF',
  color: '#1F2F5F'
};

const panelStyles = {
  width: 420,
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

const panelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 12
};

const panelTitle = {
  fontSize: 18,
  fontWeight: 800,
  color: '#1F2F5F',
  margin: 0
};

const closeBtn = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: '#8E99B3',
  padding: 4
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
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
  maxWidth: '60%'
};

const tabBtn = {
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const actionBtnPrimary = {
  padding: '10px',
  borderRadius: 10,
  background: '#4A7DFF',
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer'
};

const actionBtnSecondary = {
  padding: '10px',
  borderRadius: 10,
  background: '#F5F6FA',
  color: '#1F2F5F',
  border: '1px solid #DCE5FF',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer'
};

const actionBtnDanger = {
  padding: '10px',
  borderRadius: 10,
  background: '#FFEBEE',
  color: '#C62828',
  border: 'none',
  fontWeight: 700,
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