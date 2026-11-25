import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { formatMoney } from '../lib/theme';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Reports() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0, businesses: 0, payouts: 0, profit: 0 });
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('7d');
  const [exportFormat, setExportFormat] = useState('pdf');


  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { count: users } = await db('users').select('*', { count: 'exact', head: true });
      const { count: shops } = await db('shops').select('*', { count: 'exact', head: true });
      const { data: txn } = await db('transactions').select('amount, discount_applied');

      const revenue = txn?.reduce((s, t) => s + Number(t.amount || 0), 0) || 0;

      setStats({
        revenue,
        orders: txn?.length || 0,
        customers: users || 0,
        businesses: shops || 0,
        payouts: Math.round(revenue * 0.7),
        profit: Math.round(revenue * 0.3),
      });
    } catch (err) { console.error(err); }
  };

  const statCards = [
    { label: 'Total Revenue', value: formatMoney(stats.revenue), icon: '💰', color: '#4A7DFF', bg: '#EEF3FF', change: '+18.2%' },
    { label: 'Total Orders', value: stats.orders, icon: '📦', color: '#4CAF50', bg: '#E8F5E9', change: '+12.5%' },
    { label: 'Total Customers', value: stats.customers, icon: '👥', color: '#FF9800', bg: '#FFF3E0', change: '+24.8%' },
    { label: 'Total Businesses', value: stats.businesses, icon: '🏪', color: '#9C27B0', bg: '#F3E5F5', change: '+8.3%' },
    { label: 'Total Payouts', value: formatMoney(stats.payouts), icon: '💸', color: '#00BCD4', bg: '#E0F7FA', change: '+15.7%' },
    { label: 'Platform Profit', value: formatMoney(stats.profit), icon: '📈', color: '#F44336', bg: '#FFEBEE', change: '+22.1%' },
  ];

  const quickReports = [
    { icon: '📊', label: 'Sales Report', color: '#4A7DFF' },
    { icon: '🏪', label: 'Business Report', color: '#4CAF50' },
    { icon: '👥', label: 'Customer Report', color: '#FF9800' },
    { icon: '📦', label: 'Product Report', color: '#9C27B0' },
    { icon: '💸', label: 'Payout Report', color: '#00BCD4' },
    { icon: '⚙️', label: 'Custom Report', color: '#F44336' },
  ];

  const scheduledReports = [
    { name: 'Weekly Sales Report', schedule: 'Every Monday 8AM', status: 'Active' },
    { name: 'Monthly Business Report', schedule: '1st of every month', status: 'Active' },
    { name: 'Payout Summary', schedule: 'Every Friday 5PM', status: 'Active' },
    { name: 'Customer Growth Report', schedule: 'Every 15th', status: 'Paused' },
  ];

  const popularReports = [
    { name: 'Monthly Revenue Summary', count: 245 },
    { name: 'Business Performance', count: 189 },
    { name: 'Customer Acquisition', count: 156 },
    { name: 'Product Sales Analysis', count: 134 },
  ];

  const revenueData = [
    { day: 'Mon', revenue: 120 }, { day: 'Tue', revenue: 180 }, { day: 'Wed', revenue: 140 },
    { day: 'Thu', revenue: 210 }, { day: 'Fri', revenue: 190 }, { day: 'Sat', revenue: 250 }, { day: 'Sun', revenue: 220 },
  ];

  const ordersData = [
    { day: 'Mon', orders: 45 }, { day: 'Tue', orders: 62 }, { day: 'Wed', orders: 51 },
    { day: 'Thu', orders: 78 }, { day: 'Fri', orders: 70 }, { day: 'Sat', orders: 85 }, { day: 'Sun', orders: 72 },
  ];

  const customersData = [
    { day: 'Mon', customers: 25 }, { day: 'Tue', customers: 38 }, { day: 'Wed', customers: 30 },
    { day: 'Thu', customers: 45 }, { day: 'Fri', customers: 42 }, { day: 'Sat', customers: 55 }, { day: 'Sun', customers: 48 },
  ];

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Reports</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Reports</h1>
            <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Generate and analyze platform performance reports.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select style={filterStyle}>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #EEF3FF' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2F5F' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#8E99B3', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600, marginTop: 4 }}>↑ {s.change} vs last period</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Revenue Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4A7DFF" stopOpacity={0.3} /><stop offset="95%" stopColor="#4A7DFF" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F6FA" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E99B3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8E99B3' }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#4A7DFF" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Orders Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F6FA" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E99B3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8E99B3' }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#4CAF50" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #EEF3FF' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>New Customers</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={customersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F6FA" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E99B3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8E99B3' }} />
                <Tooltip />
                <Line type="monotone" dataKey="customers" stroke="#FF9800" strokeWidth={3} dot={{ r: 5, fill: '#FF9800' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Reports */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 12px' }}>Quick Reports</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {quickReports.map((r, i) => (
              <button key={i} style={{ padding: '14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #EEF3FF', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFF'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{r.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2F5F' }}>{r.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Reports Table */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF3FF' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: 0 }}>Recent Reports</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #EEF3FF' }}>
                <th style={th}>Report Name</th>
                <th style={th}>Type</th>
                <th style={th}>Date Range</th>
                <th style={th}>Generated</th>
                <th style={th}>Format</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Weekly Sales Summary', type: 'Sales', range: 'Jul 1 - Jul 7', date: '2026-07-07', format: 'PDF', status: 'Completed' },
                { name: 'Business Performance Q2', type: 'Business', range: 'Apr 1 - Jun 30', date: '2026-07-05', format: 'Excel', status: 'Completed' },
                { name: 'Customer Growth Analysis', type: 'Customer', range: 'Jan 1 - Jun 30', date: '2026-07-03', format: 'PDF', status: 'Completed' },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F5F6FA' }}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{r.name}</span></td>
                  <td style={td}><span style={{ padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#EEF3FF', color: '#4A7DFF' }}>{r.type}</span></td>
                  <td style={td}>{r.range}</td>
                  <td style={td}>{r.date}</td>
                  <td style={td}>{r.format}</td>
                  <td style={td}><span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#E8F5E9', color: '#4CAF50' }}>{r.status}</span></td>
                  <td style={td}><button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #DCE5FF', background: '#FFFFFF', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>📥 Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel */}
      <div style={{ width: 360, flexShrink: 0 }}>
        {/* Report Generator */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Generate Report</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8E99B3', display: 'block', marginBottom: 6 }}>Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ ...filterStyle, width: '100%' }}>
              <option value="sales">Sales Report</option>
              <option value="business">Business Report</option>
              <option value="customer">Customer Report</option>
              <option value="product">Product Report</option>
              <option value="payout">Payout Report</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8E99B3', display: 'block', marginBottom: 6 }}>Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ ...filterStyle, width: '100%' }}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8E99B3', display: 'block', marginBottom: 6 }}>Export Format</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['pdf', 'excel'].map(f => (
                <button key={f} onClick={() => setExportFormat(f)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #DCE5FF', background: exportFormat === f ? '#4A7DFF' : '#FFFFFF', color: exportFormat === f ? '#FFFFFF' : '#1F2F5F', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{f === 'pdf' ? '📄 PDF' : '📊 Excel'}</button>
              ))}
            </div>
          </div>
          <button style={{ width: '100%', padding: '14px', borderRadius: 10, background: '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Generate Report</button>
        </div>

        {/* Scheduled Reports */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 14px' }}>Scheduled Reports</h3>
          {scheduledReports.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < scheduledReports.length - 1 ? '1px solid #F5F6FA' : 'none' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2F5F' }}>{r.name}</div>
                <div style={{ fontSize: 10, color: '#8E99B3', marginTop: 2 }}>{r.schedule}</div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: r.status === 'Active' ? '#E8F5E9' : '#FFF3E0', color: r.status === 'Active' ? '#4CAF50' : '#FF9800' }}>{r.status}</span>
            </div>
          ))}
        </div>

        {/* Popular Reports */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 14px' }}>Most Popular Reports</h3>
          {popularReports.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < popularReports.length - 1 ? '1px solid #F5F6FA' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#8E99B3', width: 20 }}>{i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1F2F5F' }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 11, color: '#8E99B3' }}>{r.count} runs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '12px 16px', fontSize: 11, color: '#8E99B3', fontWeight: 600, textTransform: 'uppercase' };
const td = { padding: '12px 16px', fontSize: 13, color: '#1F2F5F' };
const filterStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#FFFFFF' };