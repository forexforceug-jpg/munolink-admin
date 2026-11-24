export const colors = {
  bg: '#0B0B0D',
  bgSoft: '#0D0D1A',
  surface: '#12151C',
  surfaceAlt: '#171A23',
  surfaceHover: '#1A1A2E',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#FFFFFF',
  textMuted: '#8A8AAE',
  textDim: '#5F6880',
  primary: '#4A7DFF',
  primaryHover: '#6B94FF',
  primarySoft: 'rgba(74,125,255,0.14)',
  primaryBorder: 'rgba(74,125,255,0.32)',
  success: '#2ECC71',
  successSoft: 'rgba(46,204,113,0.12)',
  danger: '#E74C3C',
  dangerSoft: 'rgba(231,76,60,0.12)',
  warning: '#F1C40F',
  warningSoft: 'rgba(241,196,15,0.12)',
  purple: '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.14)',
  pink: '#EC4899',
  pinkSoft: 'rgba(236,72,153,0.14)',
  teal: '#14B8A6',
  tealSoft: 'rgba(20,184,166,0.14)',
  white: '#FFFFFF',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const shadows = {
  card: '0 18px 44px rgba(0,0,0,0.28)',
  popover: '0 24px 70px rgba(0,0,0,0.5)',
  glow: '0 0 0 1px rgba(74,125,255,0.25), 0 18px 40px rgba(74,125,255,0.12)',
};

export const card = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  boxShadow: shadows.card,
};

export const panel = {
  background: colors.bgSoft,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
};

export const input = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: radii.md,
  border: `1px solid ${colors.border}`,
  background: colors.surfaceAlt,
  color: colors.text,
  fontSize: 13,
  outline: 'none',
};

export const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: radii.md,
  border: 'none',
  background: colors.primary,
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

export const ghostButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: radii.md,
  border: `1px solid ${colors.border}`,
  background: colors.surfaceAlt,
  color: colors.text,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

export const dangerButton = {
  ...ghostButton,
  border: `1px solid ${colors.dangerSoft}`,
  background: colors.dangerSoft,
  color: colors.danger,
};

export function badgeStyle(tone = 'neutral') {
  const tones = {
    neutral: { color: colors.textMuted, background: 'rgba(255,255,255,0.06)', border: colors.border },
    primary: { color: colors.primary, background: colors.primarySoft, border: colors.primaryBorder },
    success: { color: colors.success, background: colors.successSoft, border: 'rgba(46,204,113,0.3)' },
    danger: { color: colors.danger, background: colors.dangerSoft, border: 'rgba(231,76,60,0.3)' },
    warning: { color: colors.warning, background: colors.warningSoft, border: 'rgba(241,196,15,0.3)' },
    purple: { color: colors.purple, background: colors.purpleSoft, border: 'rgba(139,92,246,0.3)' },
    pink: { color: colors.pink, background: colors.pinkSoft, border: 'rgba(236,72,153,0.3)' },
    teal: { color: colors.teal, background: colors.tealSoft, border: 'rgba(20,184,166,0.3)' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 9px',
    borderRadius: radii.pill,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    ...(tones[tone] ?? tones.neutral),
  };
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

export const CURRENCIES = {
  USD: { code: 'USD', label: 'US Dollar', symbol: '$' },
  KES: { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
  UGX: { code: 'UGX', label: 'Ugandan Shilling', symbol: 'USh' },
  EUR: { code: 'EUR', label: 'Euro', symbol: '€' },
  GBP: { code: 'GBP', label: 'British Pound', symbol: '£' },
  TZS: { code: 'TZS', label: 'Tanzanian Shilling', symbol: 'TSh' },
  RWF: { code: 'RWF', label: 'Rwandan Franc', symbol: 'FRw' },
};

export const CURRENCY_OPTIONS = Object.values(CURRENCIES);

let activeCurrency = 'USD';

export function setActiveCurrency(code) {
  activeCurrency = CURRENCIES[code] ? code : 'USD';
  return activeCurrency;
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function currencySymbol(code = activeCurrency) {
  return CURRENCIES[code]?.symbol || CURRENCIES.USD.symbol;
}

export function formatMoney(value, code = activeCurrency) {
  const amount = Number(value || 0);
  const currency = CURRENCIES[code] ? code : 'USD';
  const symbol = CURRENCIES[currency].symbol;
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
}

export function formatNumber(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return number.toLocaleString();
}

export function timeAgo(value) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function dayKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}
