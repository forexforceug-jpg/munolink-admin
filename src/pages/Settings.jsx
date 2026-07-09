import React, { useState } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('General');
  const [saved, setSaved] = useState(false);

  const tabs = ['General', 'Security', 'Notifications', 'Payments', 'Localization', 'Email', 'Appearance', 'Integrations', 'Audit Logs'];

  const [general, setGeneral] = useState({
    platformName: 'Munolink',
    description: 'Local commerce platform connecting buyers, shops, and service providers.',
    tagline: 'For Better Connections',
    website: 'https://munolink.com',
    supportEmail: 'support@munolink.com',
    supportPhone: '+256 700 000000',
    timezone: 'Africa/Kampala',
    dateFormat: 'DD/MM/YYYY',
  });

  const [business, setBusiness] = useState({
    registration: true,
    verification: true,
    autoApproval: false,
    commission: true,
    commissionRate: 10,
    featuredLimit: 20,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const systemInfo = {
    version: '1.0.0',
    database: 'PostgreSQL 15',
    environment: 'Production',
    serverStatus: 'Online',
    lastBackup: '2026-07-05 03:00 AM',
    uptime: '99.9%',
  };

  return (
    <div style={{ padding: '30px 32px', display: 'flex', gap: 20 }}>
      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#8E99B3', marginBottom: 4 }}>Dashboard &gt; Settings</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F2F5F', margin: 0 }}>Settings</h1>
              <p style={{ color: '#8E99B3', fontSize: 14, marginTop: 4 }}>Configure platform settings and preferences.</p>
            </div>
            <input placeholder="Search settings..." style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #DCE5FF', width: 240, fontSize: 13 }} />
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: activeTab === tab ? '#4A7DFF' : '#F5F6FA',
                color: activeTab === tab ? '#FFFFFF' : '#8E99B3',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >{tab}</button>
          ))}
        </div>

        {/* General Settings */}
        {activeTab === 'General' && (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>General Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Platform Name', key: 'platformName' },
                { label: 'Platform Tagline', key: 'tagline' },
                { label: 'Website URL', key: 'website' },
                { label: 'Support Email', key: 'supportEmail' },
                { label: 'Support Phone', key: 'supportPhone' },
                { label: 'Time Zone', key: 'timezone' },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <input
                    value={general[field.key]}
                    onChange={e => setGeneral({ ...general, [field.key]: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Platform Description</label>
                <textarea
                  value={general.description}
                  onChange={e => setGeneral({ ...general, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                />
              </div>
            </div>
            <button onClick={handleSave} style={{ marginTop: 20, padding: '12px 32px', borderRadius: 10, background: saved ? '#4CAF50' : '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saved ? '✅ Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'Security' && (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>Security Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Two-Factor Authentication', desc: 'Require 2FA for all admin accounts', enabled: false },
                { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity', enabled: true },
                { label: 'IP Whitelisting', desc: 'Restrict admin access to specific IPs', enabled: false },
                { label: 'Login Alerts', desc: 'Send email alerts on new admin logins', enabled: true },
                { label: 'Password Policy', desc: 'Enforce strong password requirements', enabled: true },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F8FAFF', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <div style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: item.enabled ? '#4CAF50' : '#E0E0E0',
                    position: 'relative', cursor: 'pointer',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: item.enabled ? 22 : 2,
                      width: 20, height: 20, borderRadius: 10, background: '#FFFFFF',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSave} style={{ marginTop: 20, padding: '12px 32px', borderRadius: 10, background: saved ? '#4CAF50' : '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saved ? '✅ Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Other tabs placeholder */}
        {!['General', 'Security'].includes(activeTab) && (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 60, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2F5F', margin: '0 0 8px' }}>{activeTab} Settings</h3>
            <p style={{ color: '#8E99B3', fontSize: 13 }}>This settings section will be available in a future update.</p>
          </div>
        )}

        {/* Business Settings */}
        {activeTab === 'General' && (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2F5F', margin: '0 0 20px' }}>Business Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Business Registration', desc: 'Allow new businesses to register', key: 'registration' },
                { label: 'Require Verification', desc: 'Businesses must be verified before appearing', key: 'verification' },
                { label: 'Automatic Approval', desc: 'Auto-approve verified businesses', key: 'autoApproval' },
                { label: 'Platform Commission', desc: 'Charge commission on transactions', key: 'commission' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F8FAFF', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2F5F' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#8E99B3', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <div style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: business[item.key] ? '#4CAF50' : '#E0E0E0',
                    position: 'relative', cursor: 'pointer',
                  }} onClick={() => setBusiness({ ...business, [item.key]: !business[item.key] })}>
                    <div style={{
                      position: 'absolute', top: 2, left: business[item.key] ? 22 : 2,
                      width: 20, height: 20, borderRadius: 10, background: '#FFFFFF',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              ))}
              {business.commission && (
                <div style={{ padding: '14px 16px', background: '#F8FAFF', borderRadius: 10 }}>
                  <label style={labelStyle}>Commission Rate (%)</label>
                  <input
                    type="number"
                    value={business.commissionRate}
                    onChange={e => setBusiness({ ...business, commissionRate: parseInt(e.target.value) || 0 })}
                    style={{ ...inputStyle, width: 120 }}
                  />
                </div>
              )}
            </div>
            <button onClick={handleSave} style={{ marginTop: 20, padding: '12px 32px', borderRadius: 10, background: saved ? '#4CAF50' : '#4A7DFF', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saved ? '✅ Saved!' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <div style={{ width: 340, flexShrink: 0 }}>
        {/* System Information */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>System Information</h3>
          {[
            { label: 'Version', value: systemInfo.version },
            { label: 'Database', value: systemInfo.database },
            { label: 'Environment', value: systemInfo.environment },
            { label: 'Server Status', value: systemInfo.serverStatus, color: '#4CAF50' },
            { label: 'Last Backup', value: systemInfo.lastBackup },
            { label: 'Uptime', value: systemInfo.uptime },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F5F6FA' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: item.color || '#1F2F5F' }}>
                {item.value}
                {item.label === 'Server Status' && <span style={{ marginLeft: 4, fontSize: 10 }}>🟢</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Admin Account */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #EEF3FF', padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2F5F', margin: '0 0 16px' }}>Admin Account</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#4A7DFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: 18 }}>MA</div>
            <div>
              <div style={{ fontWeight: 700, color: '#1F2F5F', fontSize: 14 }}>Munolink Admin</div>
              <div style={{ fontSize: 11, color: '#8E99B3' }}>Super Admin</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F6FA' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>Email</span>
              <span style={{ fontSize: 12, color: '#1F2F5F', fontWeight: 500 }}>admin@munolink.com</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: 12, color: '#8E99B3' }}>Last Login</span>
              <span style={{ fontSize: 12, color: '#1F2F5F', fontWeight: 500 }}>Today, 9:41 AM</span>
            </div>
          </div>
          <button style={{ width: '100%', marginTop: 14, padding: '10px', borderRadius: 8, background: '#F5F6FA', border: '1px solid #DCE5FF', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: '#1F2F5F' }}>Update Profile</button>
        </div>

        {/* Danger Zone */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #FFCDD2', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F44336', margin: '0 0 12px' }}>⚠️ Danger Zone</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '10px', borderRadius: 8, background: '#FFF3E0', border: '1px solid #FFE0B2', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: '#FF9800' }}>Reset Admin Password</button>
            <button style={{ padding: '10px', borderRadius: 8, background: '#FFF3E0', border: '1px solid #FFE0B2', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: '#FF9800' }}>Backup Database</button>
            <button style={{ padding: '10px', borderRadius: 8, background: '#FFEBEE', border: '1px solid #FFCDD2', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: '#F44336', marginTop: 4 }}>Reset Platform</button>
            <p style={{ fontSize: 10, color: '#F44336', marginTop: 4, lineHeight: 1.5 }}>Resetting the platform permanently deletes all data including users, businesses, orders, and transactions. This action cannot be undone.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#8E99B3', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #DCE5FF', fontSize: 13, color: '#1F2F5F', background: '#FFFFFF' };