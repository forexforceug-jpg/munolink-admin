export const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview', description: 'Platform pulse, growth and activity' },
  { id: 'users', label: 'Members', group: 'Community', description: 'Member profiles, wallets and KYC' },
  { id: 'businesses', label: 'Businesses', group: 'Community', description: 'Providers, institutions and shops' },
  { id: 'content', label: 'Content', group: 'Community', description: 'Catalog posts and service listings' },
  { id: 'transactions', label: 'Transactions', group: 'Operations', description: 'Payments, payouts and wallet movement' },
  { id: 'reviews', label: 'Reviews', group: 'Operations', description: 'Ratings, reports and moderation' },
  { id: 'verification', label: 'Verification', group: 'Operations', description: 'Business and identity checks' },
  { id: 'engine', label: 'Opportunity Engine', group: 'Operations', description: 'Recommendation and discovery controls' },
  { id: 'reports', label: 'Reports', group: 'Operations', description: 'Platform analytics and exports' },
  { id: 'settings', label: 'Settings', group: 'System', description: 'Currency, environment and platform config' },
  { id: 'staff', label: 'Staff & access', group: 'System', description: 'Team roles and permission matrix' },
];

export const ALL_PERMISSION_IDS = ALL_PERMISSIONS.map((permission) => permission.id);

export const STAFF_ROLES = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Unrestricted access. Reserved for the platform owner.',
    tone: 'danger',
    reserved: true,
    permissions: ALL_PERMISSION_IDS,
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Runs day-to-day operations across members, businesses and content.',
    tone: 'primary',
    permissions: [
      'dashboard',
      'users',
      'businesses',
      'content',
      'transactions',
      'reviews',
      'verification',
      'engine',
      'reports',
    ],
  },
  {
    id: 'customer_care',
    label: 'Customer Care',
    description: 'Helps members, handles reviews and keeps content healthy.',
    tone: 'teal',
    permissions: ['dashboard', 'users', 'reviews', 'content'],
  },
  {
    id: 'content_moderator',
    label: 'Content Moderator',
    description: 'Reviews catalog posts, services and verification evidence.',
    tone: 'purple',
    permissions: ['dashboard', 'content', 'reviews', 'verification'],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Monitors wallets, transactions and financial reporting.',
    tone: 'warning',
    permissions: ['dashboard', 'transactions', 'reports', 'users'],
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Front-line member support with read access to reviews.',
    tone: 'neutral',
    permissions: ['dashboard', 'users', 'reviews'],
  },
];

export const ASSIGNABLE_ROLES = STAFF_ROLES.filter((role) => !role.reserved);
export const STAFF_ROLE_IDS = ASSIGNABLE_ROLES.map((role) => role.id);
const ROLE_IDS = STAFF_ROLES.map((role) => role.id);

const ROLE_PERMISSIONS_KEY = 'munolink.admin.rolePermissions';
const STAFF_OVERRIDES_KEY = 'munolink.admin.staffOverrides';
const SUPER_ADMIN_EMAILS = (
  import.meta.env.VITE_SUPER_ADMIN_EMAILS || 'munolink2@gmail.com'
)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

export function isSuperAdminEmail(email) {
  return SUPER_ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

export function getRole(roleId) {
  return STAFF_ROLES.find((role) => role.id === roleId) || null;
}

export function roleLabel(roleId) {
  if (roleId === 'super_admin') return 'Super Admin';
  if (!roleId || roleId === 'customer') return 'Member';
  return getRole(roleId)?.label || roleId;
}

export function roleTone(roleId) {
  return getRole(roleId)?.tone || 'neutral';
}

export function isStaffRole(roleId) {
  return ROLE_IDS.includes(roleId);
}

export function getRolePermissions(roleId) {
  const preset = getRole(roleId)?.permissions || [];
  const stored = readJson(ROLE_PERMISSIONS_KEY, {});
  const custom = stored[roleId];
  if (!Array.isArray(custom)) return [...preset];
  return custom.filter((permission) => ALL_PERMISSION_IDS.includes(permission));
}

export function setRolePermissions(roleId, permissions) {
  if (!ROLE_IDS.includes(roleId)) return;
  const stored = readJson(ROLE_PERMISSIONS_KEY, {});
  stored[roleId] = (permissions || []).filter((permission) =>
    ALL_PERMISSION_IDS.includes(permission)
  );
  writeJson(ROLE_PERMISSIONS_KEY, stored);
}

export function getAllRolePermissions() {
  return STAFF_ROLES.reduce((accumulator, role) => {
    accumulator[role.id] = getRolePermissions(role.id);
    return accumulator;
  }, {});
}

export function getStaffOverrides() {
  return readJson(STAFF_OVERRIDES_KEY, {});
}

export function setStaffOverride(userId, permissions) {
  if (!userId) return;
  const stored = getStaffOverrides();
  stored[userId] = (permissions || []).filter((permission) =>
    ALL_PERMISSION_IDS.includes(permission)
  );
  writeJson(STAFF_OVERRIDES_KEY, stored);
}

export function removeStaffOverride(userId) {
  if (!userId) return;
  const stored = getStaffOverrides();
  delete stored[userId];
  writeJson(STAFF_OVERRIDES_KEY, stored);
}

export function resolvePermissions(roleId, userId) {
  if (roleId === 'super_admin') return [...ALL_PERMISSION_IDS];
  const overrides = getStaffOverrides();
  if (userId && Array.isArray(overrides[userId])) {
    return overrides[userId].filter((permission) =>
      ALL_PERMISSION_IDS.includes(permission)
    );
  }
  return getRolePermissions(roleId);
}

export function permissionLabel(permissionId) {
  return (
    ALL_PERMISSIONS.find((permission) => permission.id === permissionId)?.label ||
    permissionId
  );
}
