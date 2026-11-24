import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiDollarSign,
  FiGlobe,
  FiKey,
  FiRefreshCw,
  FiSave,
  FiServer,
  FiSettings,
  FiShield,
  FiSliders,
  FiUser,
} from 'react-icons/fi';
import { useAppSettings } from '../context/AppSettingsContext';
import { useAuth } from '../context/AuthContext';
import {
  badgeStyle,
  colors,
  dangerButton,
  ghostButton,
  input,
  primaryButton,
  radii,
} from '../lib/theme';
import {
  ConfirmDialog,
  Field,
  Notice,
  PageHeader,
  Toggle,
} from '../components/ui';

const PLATFORM_KEY = 'munolink.admin.platform';

const DEFAULT_PLATFORM = {
  platformName: 'Munolink',
  tagline: 'For Better Connections',
  supportEmail: 'support@munolink.com',
  supportPhone: '+256 700 000000',
  website: 'https://munolink.com',
  timezone: 'Africa/Kampala',
  dateFormat: 'DD/MM/YYYY',
};

function readPlatform() {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM;
  try {
    const raw = window.localStorage.getItem(PLATFORM_KEY);
    return raw ? { ...DEFAULT_PLATFORM, ...JSON.parse(raw) } : DEFAULT_PLATFORM;
  } catch {
    return DEFAULT_PLATFORM;
  }
}

export default function Settings() {
  const navigate = useNavigate();
  const {
    currency,
    currencyOptions,
    environment,
    isDevelopment,
    dataSourceLabel,
    dataSourceMode,
    setCurrency,
    setEnvironment,
    resetSettings,
    formatMoney,
    settings,
  } = useAppSettings();
  const {
    user,
    roleName,
    isSuperAdmin,
    permissions,
    refreshProfile,
  } = useAuth();
  const [tab, setTab] = useState('general');
  const [platform, setPlatform] = useState(readPlatform);
  const [saved, setSaved] = useState(false);
  const [envNotice, setEnvNotice] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const savePlatform = () => {
    try {
      window.localStorage.setItem(PLATFORM_KEY, JSON.stringify(platform));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  const switchEnvironment = (next) => {
    setEnvironment(next);
    setEnvNotice(
      `Switched to ${next === 'development' ? 'Development' : 'Production'}. Data pages will use ${
        next === 'development' ? 'the local API' : 'Supabase'
      } on their next load.`
    );
    refreshProfile();
  };

  const localApiUrl =
    import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:4000/api/v1';
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    'https://ffbjvrwkvnwocuyapajo.supabase.co';

  const tabs = [
    { key: 'general', label: 'General', icon: FiSettings },
    { key: 'localization', label: 'Localization', icon: FiGlobe },
    { key: 'environment', label: 'Environment', icon: FiServer },
    { key: 'access', label: 'Access', icon: FiShield },
  ];

  return (
    <div style={{ padding: '30px 32px' }}>
      <PageHeader
        eyebrow="System / Settings"
        title="Settings"
        subtitle="Control platform identity, currency, data environment and your admin access."
        actions={
          <>
            {envNotice ? (
              <span style={badgeStyle('success')}>
                <FiCheckCircle size={9} /> Environment applied
              </span>
            ) : null}
            <button type="button" onClick={() => setResetOpen(true)} style={ghostButton}>
              <FiRefreshCw size={14} /> Reset workspace
            </button>
          </>
        }
      />

      {envNotice ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="success">{envNotice}</Notice>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 18, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {tabs.map((entry) => {
              const Icon = entry.icon;
              const active = tab === entry.key;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setTab(entry.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 15px',
                    borderRadius: radii.md,
                    border: `1px solid ${active ? colors.primaryBorder : colors.border}`,
                    background: active ? colors.primarySoft : colors.surface,
                    color: active ? colors.primary : colors.textMuted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} /> {entry.label}
                </button>
              );
            })}
          </div>

          {tab === 'general' ? (
            <div style={{ ...cardStyle, padding: 20 }}>
              <SectionHeading
                icon={FiSettings}
                title="Platform identity"
                description="Member-facing details used across the Munolink admin and support touchpoints."
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <Field label="Platform name">
                  <input value={platform.platformName} onChange={(event) => setPlatform({ ...platform, platformName: event.target.value })} style={input} />
                </Field>
                <Field label="Tagline">
                  <input value={platform.tagline} onChange={(event) => setPlatform({ ...platform, tagline: event.target.value })} style={input} />
                </Field>
                <Field label="Support email">
                  <input type="email" value={platform.supportEmail} onChange={(event) => setPlatform({ ...platform, supportEmail: event.target.value })} style={input} />
                </Field>
                <Field label="Support phone">
                  <input value={platform.supportPhone} onChange={(event) => setPlatform({ ...platform, supportPhone: event.target.value })} style={input} />
                </Field>
                <Field label="Website">
                  <input value={platform.website} onChange={(event) => setPlatform({ ...platform, website: event.target.value })} style={input} />
                </Field>
                <Field label="Time zone">
                  <input value={platform.timezone} onChange={(event) => setPlatform({ ...platform, timezone: event.target.value })} style={input} />
                </Field>
                <Field label="Date format">
                  <select value={platform.dateFormat} onChange={(event) => setPlatform({ ...platform, dateFormat: event.target.value })} style={input}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </Field>
              </div>

              <div style={{ marginTop: 16 }}>
                <Toggle
                  checked={settings.autoRefresh}
                  onChange={(checked) => {
                    // Auto-refresh is a workspace preference for future data pages.
                    window.localStorage.setItem(
                      'munolink.admin.settings',
                      JSON.stringify({ ...settings, autoRefresh: checked })
                    );
                    window.location.reload();
                  }}
                  label="Auto-refresh data pages"
                  description="Reload dashboards and tables when the window regains focus."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button type="button" onClick={savePlatform} style={primaryButton}>
                  <FiSave size={14} /> {saved ? 'Saved' : 'Save platform details'}
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'localization' ? (
            <div style={{ ...cardStyle, padding: 20 }}>
              <SectionHeading
                icon={FiDollarSign}
                title="Currency"
                description="All admin prices default to US dollars. Choose a different currency for your workspace."
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, alignItems: 'start' }}>
                <Field label="Display currency">
                  <select value={currency.code} onChange={(event) => setCurrency(event.target.value)} style={input}>
                    {currencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} · {option.label} ({option.symbol})
                      </option>
                    ))}
                  </select>
                </Field>
                <div style={{ padding: 14, borderRadius: radii.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textDim }}>
                    Preview
                  </div>
                  <div style={{ marginTop: 5, fontSize: 24, fontWeight: 800, letterSpacing: -0.6 }}>
                    {formatMoney(1250)}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10, color: colors.textMuted }}>
                    {currency.label} · {currency.symbol}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <Notice tone="primary">
                  Currency changes apply immediately across dashboards, members, businesses and content. Amounts are not converted; only the display symbol changes.
                </Notice>
              </div>
            </div>
          ) : null}

          {tab === 'environment' ? (
            <div style={{ ...cardStyle, padding: 20 }}>
              <SectionHeading
                icon={FiServer}
                title="Data environment"
                description="Switch the admin between local development data and live production data."
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <EnvironmentCard
                  active={isDevelopment}
                  title="Development"
                  subtitle="Local API"
                  description="Use the local backend and SQLite development database. Safe for testing writes."
                  badge="Local API"
                  tone="primary"
                  icon={FiServer}
                  onClick={() => switchEnvironment('development')}
                />
                <EnvironmentCard
                  active={!isDevelopment}
                  title="Production"
                  subtitle="Supabase"
                  description="Use live Supabase data. Changes affect real members, businesses and content."
                  badge="Supabase"
                  tone="success"
                  icon={FiGlobe}
                  onClick={() => switchEnvironment('production')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <InfoTile label="Active environment" value={environment === 'development' ? 'Development' : 'Production'} />
                <InfoTile label="Data source" value={dataSourceLabel} />
                <InfoTile label="Local API" value={localApiUrl} />
                <InfoTile label="Supabase" value={supabaseUrl} />
              </div>

              {isDevelopment ? (
                <Notice tone="warning">
                  Development mode uses the local backend. If the backend is not running, data pages may fall back to Supabase for reads.
                </Notice>
              ) : (
                <Notice tone="danger">
                  Production mode is live. Verification, visibility, deletion and content changes affect real Munolink data.
                </Notice>
              )}
            </div>
          ) : null}

          {tab === 'access' ? (
            <div style={{ ...cardStyle, padding: 20 }}>
              <SectionHeading
                icon={FiShield}
                title="Admin access"
                description="Your current role and workspace permissions."
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: radii.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: colors.primarySoft, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiUser size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{user?.email || 'Admin'}</div>
                  <div style={{ marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={badgeStyle(isSuperAdmin ? 'danger' : 'primary')}>{roleName}</span>
                    <span style={badgeStyle('neutral')}>{permissions.length} permissions</span>
                  </div>
                </div>
                <button type="button" onClick={() => navigate('/staff')} style={ghostButton}>
                  Staff & access <FiArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <InfoTile label="Workspace role" value={roleName} />
                <InfoTile label="Super Admin" value={isSuperAdmin ? 'Yes' : 'No'} />
                <InfoTile label="Environment" value={environment === 'development' ? 'Development' : 'Production'} />
                <InfoTile label="Currency" value={`${currency.code} (${currency.symbol})`} />
              </div>

              <div style={{ marginTop: 14 }}>
                <Notice tone={isSuperAdmin ? 'success' : 'warning'}>
                  {isSuperAdmin
                    ? 'You have full platform access, including staff roles and environment switching.'
                    : 'Your access is limited by your staff role. Ask the Super Admin to adjust permissions.'}
                </Notice>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <FiSliders size={14} color={colors.textMuted} />
              <span style={{ fontSize: 11, fontWeight: 800 }}>System information</span>
            </div>
            <InfoRow label="Version" value={import.meta.env.VITE_APP_VERSION || '1.0.0'} />
            <InfoRow label="Environment" value={environment === 'development' ? 'Development' : 'Production'} />
            <InfoRow label="Data source" value={dataSourceLabel} />
            <InfoRow label="Mode" value={dataSourceMode} />
            <InfoRow label="Currency" value={currency.code} />
            <InfoRow label="Server status" value={isDevelopment ? 'Local API' : 'Supabase'} />
            <InfoRow label="Signed in as" value={user?.email || '—'} last />
          </div>

          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <FiKey size={14} color={colors.textMuted} />
              <span style={{ fontSize: 11, fontWeight: 800 }}>Environment shortcuts</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                type="button"
                onClick={() => switchEnvironment(isDevelopment ? 'production' : 'development')}
                style={{ ...ghostButton, justifyContent: 'space-between' }}
              >
                Switch to {isDevelopment ? 'Production' : 'Development'}
                <FiArrowRight size={13} />
              </button>
              <button type="button" onClick={() => navigate('/staff')} style={{ ...ghostButton, justifyContent: 'space-between' }}>
                Manage staff roles
                <FiArrowRight size={13} />
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 16, borderColor: 'rgba(231,76,60,0.24)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <FiAlertTriangle size={14} color={colors.danger} />
              <span style={{ fontSize: 11, fontWeight: 800, color: colors.danger }}>Workspace reset</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 10.5, color: colors.textMuted, lineHeight: 1.55 }}>
              Reset currency, environment and local workspace preferences. This does not delete platform data.
            </p>
            <button type="button" onClick={() => setResetOpen(true)} style={{ ...dangerButton, width: '100%' }}>
              Reset workspace settings
            </button>
          </div>
        </div>
      </div>

      {resetOpen ? (
        <ConfirmDialog
          title="Reset workspace settings?"
          description="Currency returns to USD, environment returns to the default for this build, and local preferences are cleared."
          confirmLabel="Reset settings"
          onConfirm={() => {
            resetSettings();
            setResetOpen(false);
            setEnvNotice('Workspace settings were reset.');
            refreshProfile();
          }}
          onClose={() => setResetOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: colors.primarySoft, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
        {description ? (
          <div style={{ marginTop: 3, fontSize: 10.5, color: colors.textMuted, lineHeight: 1.5 }}>
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EnvironmentCard({ active, title, subtitle, description, badge, tone, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 14,
        borderRadius: radii.md,
        border: `1px solid ${active ? colors.primaryBorder : colors.border}`,
        background: active ? colors.primarySoft : colors.surfaceAlt,
        color: colors.text,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800 }}>
          <Icon size={14} /> {title}
        </span>
        <span style={badgeStyle(tone)}>{active ? 'Active' : badge}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 10.5, color: colors.textMuted, lineHeight: 1.5 }}>
        {description}
      </div>
      <div style={{ marginTop: 6, fontSize: 9, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
        {subtitle}
      </div>
    </button>
  );
}

function InfoTile({ label, value }) {
  return (
    <div style={{ padding: '9px 11px', borderRadius: radii.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textDim }}>
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: last ? 'none' : `1px solid ${colors.border}` }}>
      <span style={{ fontSize: 10.5, color: colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
};
