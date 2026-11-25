import { db } from './db';

const CACHE_PREFIX = 'munolink.platform.';

export const DEFAULT_RECOMMENDATION_WEIGHTS = {
  category: 20,
  behavior: 20,
  freshness: 15,
  rating: 10,
  proximity: 10,
  verification: 5,
  featured: 20,
};

export const RECOMMENDATION_WEIGHT_META = [
  { key: 'category', label: 'Category match', hint: 'How strongly a post should match the viewer’s interests.' },
  { key: 'behavior', label: 'Behaviour signals', hint: 'Views, likes, saves, shares and comments.' },
  { key: 'freshness', label: 'Freshness', hint: 'Newer posts get a higher share of the feed.' },
  { key: 'rating', label: 'Quality / rating', hint: 'Reviews and seller quality signals.' },
  { key: 'proximity', label: 'Proximity', hint: 'Prefer posts near the viewer.' },
  { key: 'verification', label: 'Verified sellers', hint: 'Give blue-tick sellers a ranking lift.' },
  { key: 'featured', label: 'Admin featured', hint: 'Boost posts explicitly approved by an admin.' },
];

export const DEFAULT_VERIFICATION_APPROVAL_MODE = 'manual';

function readCache(key) {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function writeCache(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
}

function parseSettingValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function getPlatformSetting(key, fallback = null) {
  const cached = readCache(key);
  try {
    const { data, error } = await db('platform_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!error && data) {
      const value = parseSettingValue(data.value);
      writeCache(key, value);
      return value;
    }
  } catch {
    // Fall back to the local cache when the settings table is not available yet.
  }
  return cached !== undefined ? cached : fallback;
}

export async function setPlatformSetting(key, value) {
  writeCache(key, value);
  try {
    const { error } = await db('platform_settings').upsert(
      {
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    return { persisted: !error, error };
  } catch (error) {
    return { persisted: false, error };
  }
}

export function normalizeRecommendationWeights(input = {}) {
  const next = { ...DEFAULT_RECOMMENDATION_WEIGHTS };
  for (const { key } of RECOMMENDATION_WEIGHT_META) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) {
      next[key] = Math.max(0, Math.min(100, Math.round(value)));
    }
  }
  return next;
}

export async function getRecommendationWeights() {
  const value = await getPlatformSetting(
    'recommendation_weights',
    DEFAULT_RECOMMENDATION_WEIGHTS
  );
  return normalizeRecommendationWeights(value || {});
}

export async function saveRecommendationWeights(weights) {
  return setPlatformSetting(
    'recommendation_weights',
    normalizeRecommendationWeights(weights)
  );
}

export async function getVerificationApprovalMode() {
  const value = await getPlatformSetting(
    'verification_approval_mode',
    DEFAULT_VERIFICATION_APPROVAL_MODE
  );
  return value === 'automatic' ? 'automatic' : 'manual';
}

export async function saveVerificationApprovalMode(mode) {
  return setPlatformSetting(
    'verification_approval_mode',
    mode === 'automatic' ? 'automatic' : 'manual'
  );
}
