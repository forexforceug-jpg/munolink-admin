// src/pages/Dashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiUsers, 
  FiShoppingBag, 
  FiPackage, 
  FiTool, 
  FiDollarSign, 
  FiCheckCircle, 
  FiBell, 
  FiTrendingUp,
  FiClock,
  FiBarChart2,
} from 'react-icons/fi';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
};

export default function Dashboard() {
  // ============================================
  // ALL STATE DECLARATIONS
  // ============================================
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShops: 0,
    totalOrders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    pendingVerification: 0,
    totalProducts: 0,
    totalServices: 0,
    totalReviews: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [weeklyOrders, setWeeklyOrders] = useState([]);
  const [weeklyBookings, setWeeklyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ name: 'Admin', initials: 'AD' });
  const [mapCenter, setMapCenter] = useState([1.3733, 32.2903]);
  const [mapZoom, setMapZoom] = useState(6);

  const [locationMarkers, setLocationMarkers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapData, setMapData] = useState({
    shops: [],
    users: [],
    providers: [],
    institutions: [],
  });
  const [mapFilter, setMapFilter] = useState('all');
  const [searchLocation, setSearchLocation] = useState('');

  const [topUsers, setTopUsers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topShops, setTopShops] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [activeTab, setActiveTab] = useState('users');

  // ============================================
  // HELPER FUNCTIONS - Defined first
  // ============================================
  const timeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  };

  const getFilteredMarkers = () => {
    if (mapFilter === 'all') return locationMarkers;
    return locationMarkers.filter(m => m.type === mapFilter);
  };

  const getCounts = () => {
    const counts = { all: locationMarkers.length };
    const types = ['shop', 'user', 'provider', 'institution'];
    types.forEach(type => {
      counts[type] = locationMarkers.filter(m => m.type === type).length;
    });
    return counts;
  };

  const counts = getCounts();

  const zoomToLocation = (area) => {
    const marker = locationMarkers.find(m => m.area?.toLowerCase().includes(area.toLowerCase()));
    if (marker) {
      setMapCenter([marker.lat, marker.lng]);
      setMapZoom(12);
    }
  };

  // ============================================
  // FETCH FUNCTIONS - Defined before useEffect
  // ============================================
  const fetchAdminInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          const name = profile.full_name;
          const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          setAdminInfo({ name, initials });
        }
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
    }
  };

  const fetchLocationData = async () => {
    try {
      const { data: shops } = await supabase
        .from('shops')
        .select('id, name, area, district, city, latitude, longitude, rating, is_verified, category');

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, phone_number, created_at');

      const { data: providers } = await supabase
        .from('individual_providers')
        .select('id, full_name, city, address, rating, specialty');

      const { data: institutions } = await supabase
        .from('institutions')
        .select('id, name, city, area, rating, type');

      const markers = [];

      shops?.forEach(shop => {
        if (shop.latitude && shop.longitude) {
          markers.push({
            id: shop.id,
            type: 'shop',
            name: shop.name,
            lat: shop.latitude,
            lng: shop.longitude,
            area: shop.area || shop.city || shop.district || 'Unknown',
            rating: shop.rating,
            verified: shop.is_verified,
            category: shop.category,
            icon: '🏪',
            color: '#4CAF50',
          });
        }
      });

      const userLocations = [
        { lat: 0.3136, lng: 32.5811, area: 'Kampala' },
        { lat: 0.4244, lng: 33.2026, area: 'Jinja' },
        { lat: 0.0512, lng: 32.4637, area: 'Entebbe' },
        { lat: 0.3533, lng: 32.7553, area: 'Mukono' },
        { lat: 2.7737, lng: 32.2917, area: 'Gulu' },
        { lat: -0.6072, lng: 30.6545, area: 'Mbarara' },
        { lat: -0.3419, lng: 31.7246, area: 'Masaka' },
      ];

      users?.forEach((user, index) => {
        const loc = userLocations[index % userLocations.length];
        markers.push({
          id: user.id,
          type: 'user',
          name: user.full_name || 'User',
          lat: loc.lat + (Math.random() - 0.5) * 0.05,
          lng: loc.lng + (Math.random() - 0.5) * 0.05,
          area: loc.area,
          phone: user.phone_number,
          icon: '👤',
          color: '#4A7DFF',
        });
      });

      providers?.forEach(provider => {
        if (provider.city) {
          const cityCoords = {
            'Kampala': { lat: 0.3136, lng: 32.5811 },
            'Jinja': { lat: 0.4244, lng: 33.2026 },
            'Entebbe': { lat: 0.0512, lng: 32.4637 },
            'Mukono': { lat: 0.3533, lng: 32.7553 },
            'Gulu': { lat: 2.7737, lng: 32.2917 },
            'Mbarara': { lat: -0.6072, lng: 30.6545 },
            'Masaka': { lat: -0.3419, lng: 31.7246 },
          };
          const coords = cityCoords[provider.city] || { lat: 0.3136 + Math.random() * 0.1, lng: 32.5811 + Math.random() * 0.1 };
          markers.push({
            id: provider.id,
            type: 'provider',
            name: provider.full_name,
            lat: coords.lat,
            lng: coords.lng,
            area: provider.city,
            rating: provider.rating,
            specialty: provider.specialty,
            icon: '🔧',
            color: '#F1C40F',
          });
        }
      });

      institutions?.forEach(institution => {
        if (institution.city) {
          const cityCoords = {
            'Kampala': { lat: 0.3136, lng: 32.5811 },
            'Jinja': { lat: 0.4244, lng: 33.2026 },
            'Entebbe': { lat: 0.0512, lng: 32.4637 },
            'Mukono': { lat: 0.3533, lng: 32.7553 },
            'Gulu': { lat: 2.7737, lng: 32.2917 },
            'Mbarara': { lat: -0.6072, lng: 30.6545 },
          };
          const coords = cityCoords[institution.city] || { lat: 0.3136 + Math.random() * 0.1, lng: 32.5811 + Math.random() * 0.1 };
          markers.push({
            id: institution.id,
            type: 'institution',
            name: institution.name,
            lat: coords.lat,
            lng: coords.lng,
            area: institution.city,
            rating: institution.rating,
            type: institution.type,
            icon: '🏨',
            color: '#E74C3C',
          });
        }
      });

      setLocationMarkers(markers);

    } catch (error) {
      console.error('Error fetching location data:', error);
    }
  };

  const fetchTopAnalytics = async () => {
    try {
      const { data: topUsersData } = await supabase
        .from('transactions')
        .select('user_id, users(full_name, phone_number)')
        .limit(10);

      const { data: topProductsData } = await supabase
        .from('shop_products')
        .select('catalog_id, catalog(name, category), shop_id, shops(name), regular_price')
        .limit(10);

      const { data: topServicesData } = await supabase
        .from('provider_services')
        .select('service_id, service_catalog(name, category), user_id, price')
        .limit(10);

      const { data: topShopsData } = await supabase
        .from('transactions')
        .select('shop_id, shops(name), amount')
        .limit(10);

      const { data: topProvidersData } = await supabase
        .from('individual_providers')
        .select('full_name, specialty, rating, review_count')
        .order('rating', { ascending: false })
        .limit(10);

      setTopUsers(topUsersData || []);
      setTopProducts(topProductsData || []);
      setTopServices(topServicesData || []);
      setTopShops(topShopsData || []);
      setTopProviders(topProvidersData || []);

    } catch (error) {
      console.error('Error fetching top analytics:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities = [];
      const { data: recentUsers } = await supabase
        .from('users')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      recentUsers?.forEach(user => {
        if (user.full_name) {
          activities.push({
            icon: '👤',
            text: `${user.full_name} registered as a new user`,
            time: timeAgo(user.created_at),
            color: '#4A7DFF'
          });
        }
      });

      const { data: recentShops } = await supabase
        .from('shops')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      recentShops?.forEach(shop => {
        if (shop.name) {
          activities.push({
            icon: '🏪',
            text: `"${shop.name}" joined the platform`,
            time: timeAgo(shop.created_at),
            color: '#4CAF50'
          });
        }
      });

      const { data: recentTxns } = await supabase
        .from('transactions')
        .select('amount, type, created_at, reference')
        .order('created_at', { ascending: false })
        .limit(3);

      recentTxns?.forEach(txn => {
        const type = txn.type || 'order';
        activities.push({
          icon: type === 'service_booking' ? '📅' : '📦',
          text: `${type === 'service_booking' ? 'Booking' : 'Order'} ${txn.reference || '#' + txn.id?.slice(0, 6)} completed • UGX ${Number(txn.amount).toLocaleString()}`,
          time: timeAgo(txn.created_at),
          color: type === 'service_booking' ? '#9C27B0' : '#FF9800'
        });
      });

      const { data: recentVerifs } = await supabase
        .from('verification_requests')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      recentVerifs?.forEach(() => {
        activities.push({
          icon: '📋',
          text: 'New verification request submitted',
          time: 'Just now',
          color: '#F44336'
        });
      });

      return activities.sort((a, b) => {
        const aTime = a.time === 'Just now' ? 0 : parseInt(a.time) || 999;
        const bTime = b.time === 'Just now' ? 0 : parseInt(b.time) || 999;
        return aTime - bTime;
      }).slice(0, 5);

    } catch (error) {
      console.error('Error fetching activity:', error);
      return [];
    }
  };

  const fetchTopCategories = async () => {
    try {
      const { data: catalogItems } = await supabase
        .from('catalog')
        .select('category');

      const categoryCounts = {};
      catalogItems?.forEach(item => {
        if (item.category) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }
      });

      const total = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0) || 1;
      const sorted = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          pct: Math.round((count / total) * 100),
          color: ['#4A7DFF', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'][Math.floor(Math.random() * 5)]
        }));

      if (Object.keys(categoryCounts).length > 5) {
        const otherCount = Object.entries(categoryCounts)
          .slice(5)
          .reduce((sum, [, count]) => sum + count, 0);
        sorted.push({
          name: 'Others',
          pct: Math.round((otherCount / total) * 100),
          color: '#00BCD4'
        });
      }

      return sorted;

    } catch (error) {
      console.error('Error fetching categories:', error);
      return [
        { name: 'Pharmacy', pct: 35, color: '#4A7DFF' },
        { name: 'Grocery', pct: 25, color: '#4CAF50' },
        { name: 'Hardware', pct: 18, color: '#FF9800' },
        { name: 'Electronics', pct: 12, color: '#9C27B0' },
        { name: 'Others', pct: 10, color: '#00BCD4' },
      ];
    }
  };

  const fetchWeeklyData = async () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revenue = [0, 0, 0, 0, 0, 0, 0];
    const orders = [0, 0, 0, 0, 0, 0, 0];
    const bookings = [0, 0, 0, 0, 0, 0, 0];

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weekTxns } = await supabase
        .from('transactions')
        .select('amount, type, created_at')
        .gte('created_at', weekAgo.toISOString());

      weekTxns?.forEach(txn => {
        const date = new Date(txn.created_at);
        const dayIndex = date.getDay();
        const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        
        if (mappedIndex >= 0 && mappedIndex < 7) {
          revenue[mappedIndex] += Number(txn.amount || 0);
          
          if (txn.type === 'service_booking' || txn.type === 'booking') {
            bookings[mappedIndex]++;
          } else {
            orders[mappedIndex]++;
          }
        }
      });

      const maxRevenue = Math.max(...revenue, 1);
      const scaledRevenue = revenue.map(r => Math.round((r / maxRevenue) * 100));

      return {
        revenue: scaledRevenue,
        orders: orders,
        bookings: bookings,
      };

    } catch (error) {
      console.error('Error fetching weekly data:', error);
      return {
        revenue: [60, 85, 45, 95, 70, 120, 100],
        orders: [35, 50, 30, 60, 45, 75, 65],
        bookings: [15, 25, 12, 30, 20, 35, 28],
      };
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [
        { count: users },
        { count: shops },
        { count: pendingVerif },
        { count: products },
        { count: services },
        { count: reviews },
        { data: txnData },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('catalog').select('*', { count: 'exact', head: true }),
        supabase.from('service_catalog').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      const transactions = txnData || [];
      const orders = transactions.filter(t => t.type === 'order' || t.type === 'purchase' || !t.type);
      const bookings = transactions.filter(t => t.type === 'service_booking' || t.type === 'booking');
      const revenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalUsers: users || 0,
        totalShops: shops || 0,
        totalOrders: orders.length,
        totalBookings: bookings.length,
        totalRevenue: revenue,
        totalTransactions: transactions.length,
        pendingVerification: pendingVerif || 0,
        totalProducts: products || 0,
        totalServices: services || 0,
        totalReviews: reviews || 0,
      });

      setRecentTransactions(transactions.slice(0, 8));
      const activity = await fetchRecentActivity();
      setRecentActivity(activity);
      const categories = await fetchTopCategories();
      setTopCategories(categories);

      const weekly = await fetchWeeklyData();
      setWeeklyRevenue(weekly.revenue);
      setWeeklyOrders(weekly.orders);
      setWeeklyBookings(weekly.bookings);

    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      // ✅ IMPORTANT: Always set loading to false
      setLoading(false);
    }
  };

  // ============================================
  // useEffect - Now all functions are defined
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDashboardData(),
          fetchAdminInfo(),
          fetchLocationData(),
          fetchTopAnalytics(),
        ]);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderInteractiveMap = () => {
    const filteredMarkers = getFilteredMarkers();
    
    return (
      <div style={mapContainer}>
        <div style={mapHeader}>
          <div>
            <h3 style={mapTitle}>📍 East Africa Distribution Map</h3>
            <p style={mapSubtitle}>Click on markers to see details • Zoom in/out to explore</p>
          </div>
          <div style={mapControls}>
            <input
              type="text"
              placeholder="Search location..."
              value={searchLocation}
              onChange={(e) => {
                setSearchLocation(e.target.value);
                if (e.target.value.length > 2) {
                  zoomToLocation(e.target.value);
                }
              }}
              style={searchInputMap}
            />
            <select
              value={mapFilter}
              onChange={(e) => setMapFilter(e.target.value)}
              style={filterSelectMap}
            >
              <option value="all">All ({counts.all})</option>
              <option value="shop">🏪 Shops ({counts.shop})</option>
              <option value="user">👤 Users ({counts.user})</option>
              <option value="provider">🔧 Providers ({counts.provider})</option>
              <option value="institution">🏨 Institutions ({counts.institution})</option>
            </select>
          </div>
        </div>

        <div style={mapLegend}>
          <div style={legendItem}><span style={{ ...legendDot, background: '#4CAF50' }}></span> Shops</div>
          <div style={legendItem}><span style={{ ...legendDot, background: '#4A7DFF' }}></span> Users</div>
          <div style={legendItem}><span style={{ ...legendDot, background: '#F1C40F' }}></span> Providers</div>
          <div style={legendItem}><span style={{ ...legendDot, background: '#E74C3C' }}></span> Institutions</div>
        </div>

        <div style={mapWrapper}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={mapStyle}
            zoomControl={false}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <ZoomControl position="bottomright" />

            {filteredMarkers.map((marker, index) => {
              const markerColor = marker.color || '#4A7DFF';
              const popupContent = (
                <div style={popupStyle}>
                  <div style={popupHeader}>
                    <span style={popupIcon}>{marker.icon}</span>
                    <span style={popupName}>{marker.name}</span>
                  </div>
                  <div style={popupBody}>
                    <div><strong>Type:</strong> {marker.type}</div>
                    <div><strong>Area:</strong> {marker.area || 'Unknown'}</div>
                    {marker.rating && <div><strong>Rating:</strong> ⭐ {marker.rating?.toFixed(1)}</div>}
                    {marker.verified && <div><strong>Status:</strong> ✅ Verified</div>}
                    {marker.category && <div><strong>Category:</strong> {marker.category}</div>}
                    {marker.specialty && <div><strong>Specialty:</strong> {marker.specialty}</div>}
                    {marker.phone && <div><strong>Phone:</strong> {marker.phone}</div>}
                  </div>
                </div>
              );

              const radius = marker.type === 'shop' ? 10 : 
                           marker.type === 'user' ? 6 :
                           marker.type === 'provider' ? 8 : 12;

              return (
                <CircleMarker
                  key={marker.id || index}
                  center={[marker.lat, marker.lng]}
                  radius={radius}
                  fillColor={markerColor}
                  color={markerColor}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                >
                  <Popup>{popupContent}</Popup>
                  <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                    <span style={tooltipStyle}>{marker.name}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            <MapController center={mapCenter} zoom={mapZoom} />
          </MapContainer>
        </div>
      </div>
    );
  };

  const renderTopAnalytics = () => {
    const tabs = [
      { key: 'users', label: '👤 Top Users' },
      { key: 'products', label: '📦 Top Products' },
      { key: 'services', label: '🔧 Top Services' },
      { key: 'shops', label: '🏪 Top Shops' },
      { key: 'providers', label: '⭐ Top Providers' },
    ];

    return (
      <div style={analyticsContainer}>
        <div style={analyticsHeader}>
          <h3 style={analyticsTitle}>🏆 Top Performers</h3>
          <div style={analyticsTabs}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...analyticsTab,
                  background: activeTab === tab.key ? '#4A7DFF' : '#F5F6FA',
                  color: activeTab === tab.key ? '#FFFFFF' : '#8E99B3',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={analyticsTableWrap}>
          {activeTab === 'users' && (
            <table style={analyticsTable}>
              <thead>
                <tr>
                  <th style={analyticsTh}>#</th>
                  <th style={analyticsTh}>User</th>
                  <th style={analyticsTh}>Phone</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.slice(0, 10).map((user, i) => (
                  <tr key={i} style={analyticsTr}>
                    <td style={analyticsTd}>{i + 1}</td>
                    <td style={analyticsTd}>{user.users?.full_name || 'Unknown'}</td>
                    <td style={analyticsTd}>{user.users?.phone_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'products' && (
            <table style={analyticsTable}>
              <thead>
                <tr>
                  <th style={analyticsTh}>#</th>
                  <th style={analyticsTh}>Product</th>
                  <th style={analyticsTh}>Category</th>
                  <th style={analyticsTh}>Shop</th>
                  <th style={analyticsTh}>Price</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 10).map((product, i) => (
                  <tr key={i} style={analyticsTr}>
                    <td style={analyticsTd}>{i + 1}</td>
                    <td style={analyticsTd}>{product.catalog?.name || 'Unknown'}</td>
                    <td style={analyticsTd}>{product.catalog?.category || '—'}</td>
                    <td style={analyticsTd}>{product.shops?.name || '—'}</td>
                    <td style={analyticsTd}>UGX {Number(product.regular_price || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'services' && (
            <table style={analyticsTable}>
              <thead>
                <tr>
                  <th style={analyticsTh}>#</th>
                  <th style={analyticsTh}>Service</th>
                  <th style={analyticsTh}>Category</th>
                  <th style={analyticsTh}>Price</th>
                </tr>
              </thead>
              <tbody>
                {topServices.slice(0, 10).map((service, i) => (
                  <tr key={i} style={analyticsTr}>
                    <td style={analyticsTd}>{i + 1}</td>
                    <td style={analyticsTd}>{service.service_catalog?.name || 'Unknown'}</td>
                    <td style={analyticsTd}>{service.service_catalog?.category || '—'}</td>
                    <td style={analyticsTd}>UGX {Number(service.price || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'shops' && (
            <table style={analyticsTable}>
              <thead>
                <tr>
                  <th style={analyticsTh}>#</th>
                  <th style={analyticsTh}>Shop</th>
                  <th style={analyticsTh}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topShops.slice(0, 10).map((shop, i) => (
                  <tr key={i} style={analyticsTr}>
                    <td style={analyticsTd}>{i + 1}</td>
                    <td style={analyticsTd}>{shop.shops?.name || 'Unknown'}</td>
                    <td style={analyticsTd}>UGX {Number(shop.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'providers' && (
            <table style={analyticsTable}>
              <thead>
                <tr>
                  <th style={analyticsTh}>#</th>
                  <th style={analyticsTh}>Provider</th>
                  <th style={analyticsTh}>Specialty</th>
                  <th style={analyticsTh}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {topProviders.slice(0, 10).map((provider, i) => (
                  <tr key={i} style={analyticsTr}>
                    <td style={analyticsTd}>{i + 1}</td>
                    <td style={analyticsTd}>{provider.full_name || 'Unknown'}</td>
                    <td style={analyticsTd}>{provider.specialty || '—'}</td>
                    <td style={analyticsTd}>⭐ {Number(provider.rating || 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // STAT CARDS WITH ICONS
  // ============================================
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: FiUsers, color: '#4A7DFF', bg: '#EEF3FF' },
    { label: 'Total Businesses', value: stats.totalShops.toLocaleString(), icon: FiShoppingBag, color: '#4CAF50', bg: '#E8F5E9' },
    { label: 'Total Products', value: stats.totalProducts.toLocaleString(), icon: FiPackage, color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Total Services', value: stats.totalServices.toLocaleString(), icon: FiTool, color: '#9C27B0', bg: '#F3E5F5' },
    { label: 'Total Revenue', value: `UGX ${(stats.totalRevenue / 1000000).toFixed(1)}M`, icon: FiDollarSign, color: '#F44336', bg: '#FFEBEE' },
    { label: 'Pending Verification', value: stats.pendingVerification.toLocaleString(), icon: FiCheckCircle, color: '#FF9800', bg: '#FFF3E0' },
  ];

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F' }}>Dashboard</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: '#8E99B3' }}>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div style={{ padding: '30px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Overview of Munolink platform performance.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #DCE5FF', position: 'relative', cursor: 'pointer' }}>
            <FiBell size={20} color="#1F2F5F" />
            {stats.pendingVerification > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, background: '#F44336', color: '#FFFFFF', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {stats.pendingVerification}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4A7DFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>
              {adminInfo.initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F' }}>{adminInfo.name}</div>
              <div style={{ fontSize: 10, color: '#8E99B3' }}>Super Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 16, padding: 18, border: '1px solid #EEF3FF' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={22} color={stat.color} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2F5F', marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#8E99B3', fontWeight: 500 }}>{stat.label}</div>
              {stat.label === 'Pending Verification' && stats.pendingVerification > 0 && (
                <div style={{ fontSize: 11, color: '#FF9800', fontWeight: 600, marginTop: 6 }}>⚠️ Action required</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Map */}
      {renderInteractiveMap()}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: 0 }}>Revenue Overview</h3>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#1F2F5F', margin: '4px 0 0' }}>UGX {(stats.totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingTop: 20 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const height = weeklyRevenue[i] || 10;
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: '100%', maxWidth: 40, height: Math.max(height, 5), background: 'linear-gradient(180deg, #4A7DFF, #2E5FE6)', borderRadius: '8px 8px 4px 4px' }} />
                  <span style={{ fontSize: 10, color: '#8E99B3', fontWeight: 500 }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Orders & Bookings Overview</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, paddingTop: 20 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const orderHeight = Math.max((weeklyOrders[i] || 0) * 2, 5);
              const bookingHeight = Math.max((weeklyBookings[i] || 0) * 2, 5);
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 16, height: Math.min(orderHeight, 120), background: '#4A7DFF', borderRadius: '4px 4px 2px 2px' }} />
                    <div style={{ width: 16, height: Math.min(bookingHeight, 120), background: '#4CAF50', borderRadius: '4px 4px 2px 2px' }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#8E99B3', fontWeight: 500 }}>{day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#4A7DFF' }} /><span style={{ fontSize: 11, color: '#8E99B3' }}>Orders</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#4CAF50' }} /><span style={{ fontSize: 11, color: '#8E99B3' }}>Bookings</span></div>
          </div>
        </div>
      </div>

      {/* Top Analytics */}
      {renderTopAnalytics()}

      {/* Bottom Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 16, marginTop: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>
            <FiClock size={16} style={{ marginRight: 8 }} /> Recent Transactions
          </h3>
          {recentTransactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8E99B3', padding: 20 }}>No transactions yet</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EEF3FF' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: '#8E99B3', fontWeight: 600 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((txn) => (
                  <tr key={txn.id} style={{ borderBottom: '1px solid #F5F6FA' }}>
                    <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, color: '#4A7DFF' }}>{txn.reference?.slice(-8) || txn.id?.slice(-8) || '---'}</td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: '#1F2F5F' }}>{txn.type || 'order'}</td>
                    <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, color: '#1F2F5F' }}>UGX {Number(txn.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 12, 
                        fontSize: 10, 
                        fontWeight: 700, 
                        background: txn.status === 'completed' ? '#E8F5E9' : txn.status === 'pending' ? '#FFF3E0' : '#FFEBEE',
                        color: txn.status === 'completed' ? '#4CAF50' : txn.status === 'pending' ? '#FF9800' : '#F44336'
                      }}>
                        {txn.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 11, color: '#8E99B3', textAlign: 'right' }}>
                      {txn.created_at ? timeAgo(txn.created_at) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>
            <FiTrendingUp size={16} style={{ marginRight: 8 }} /> Platform Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8E99B3', padding: 20 }}>No recent activity</p>
          ) : (
            recentActivity.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid #F5F6FA' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#1F2F5F', fontWeight: 500 }}>{item.text}</div>
                  <div style={{ fontSize: 10, color: '#8E99B3', marginTop: 2 }}>{item.time}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>
            <FiBarChart2 size={16} style={{ marginRight: 8 }} /> Top Categories
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topCategories.map((cat) => (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1F2F5F' }}>{cat.name}</span>
                  <span style={{ fontSize: 11, color: '#8E99B3' }}>{cat.pct}%</span>
                </div>
                <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F5F6FA', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.pct}%`, height: '100%', borderRadius: 3, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0', marginTop: 24, borderTop: '1px solid #EEF3FF', color: '#8E99B3', fontSize: 12 }}>
        © 2025 Munolink. All rights reserved. · Version 1.0.0
      </div>
    </div>
  );
}

// ============================================
// MAP STYLES (UNCHANGED)
// ============================================
const mapContainer = {
  background: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  border: '1px solid #EEF3FF',
  marginBottom: 24,
  overflow: 'hidden',
};

const mapHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 12,
  flexWrap: 'wrap',
  gap: 12,
};

const mapTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1F2F5F',
  margin: 0,
};

const mapSubtitle = {
  fontSize: 12,
  color: '#8E99B3',
  marginTop: 2,
};

const mapControls = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const searchInputMap = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #DCE5FF',
  fontSize: 13,
  width: 200,
  outline: 'none',
};

const filterSelectMap = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #DCE5FF',
  fontSize: 13,
  background: '#FFFFFF',
  cursor: 'pointer',
};

const mapLegend = {
  display: 'flex',
  gap: 16,
  marginBottom: 12,
  flexWrap: 'wrap',
};

const legendItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: '#1F2F5F',
};

const legendDot = {
  width: 12,
  height: 12,
  borderRadius: '50%',
};

const mapWrapper = {
  height: 500,
  borderRadius: 12,
  overflow: 'hidden',
  position: 'relative',
};

const mapStyle = {
  height: '100%',
  width: '100%',
};

const popupStyle = {
  minWidth: 200,
  maxWidth: 300,
  padding: 4,
};

const popupHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  borderBottom: '1px solid #EEF3FF',
  paddingBottom: 6,
};

const popupIcon = {
  fontSize: 18,
};

const popupName = {
  fontSize: 14,
  fontWeight: 700,
  color: '#1F2F5F',
};

const popupBody = {
  fontSize: 12,
  color: '#1F2F5F',
  lineHeight: 1.6,
};

const tooltipStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#1F2F5F',
  background: '#FFFFFF',
  padding: '2px 8px',
  borderRadius: 4,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

// ============================================
// ANALYTICS STYLES (UNCHANGED)
// ============================================
const analyticsContainer = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #EEF3FF',
  overflow: 'hidden',
  marginBottom: 24,
};

const analyticsHeader = {
  padding: '16px 20px',
  borderBottom: '1px solid #EEF3FF',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
};

const analyticsTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1F2F5F',
  margin: 0,
};

const analyticsTabs = {
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
};

const analyticsTab = {
  padding: '6px 14px',
  borderRadius: 8,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const analyticsTableWrap = {
  padding: '0 20px 20px',
  overflowX: 'auto',
};

const analyticsTable = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: 16,
};

const analyticsTh = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  color: '#8E99B3',
  fontWeight: 600,
  textTransform: 'uppercase',
  borderBottom: '2px solid #EEF3FF',
};

const analyticsTd = {
  padding: '10px 12px',
  fontSize: 13,
  color: '#1F2F5F',
  borderBottom: '1px solid #F5F6FA',
};

const analyticsTr = {
  transition: 'background 0.2s',
  ':hover': { background: '#F8FAFF' },
};