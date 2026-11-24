import React, { useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiEdit2,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import {
  ALL_PERMISSIONS,
  ALL_PERMISSION_IDS,
  ASSIGNABLE_ROLES,
  STAFF_ROLES,
  getRolePermissions,
  isStaffRole,
  isSuperAdminEmail,
  removeStaffOverride,
  resolvePermissions,
  roleLabel,
  roleTone,
  setRolePermissions,
  setStaffOverride,
} from '../lib/staff';
import {
  badgeStyle,
  colors,
  ghostButton,
  initials,
  input,
  primaryButton,
  radii,
  timeAgo,
} from '../lib/theme';
import {
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  StatCard,
  TableShell,
  Td,
  Th,
  Toolbar,
} from '../components/ui';

const selectStyle = {
  ...input,
  cursor: 'pointer',
};

function samePermissions(left, right) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

function effectiveRole(member) {
  if (!member) return 'customer';
  if (isSuperAdminEmail(member.email) || member.role === 'super_admin') {
    return 'super_admin';
  }
  return member.role || 'customer';
}

function permissionGroups() {
  return ALL_PERMISSIONS.reduce((groups, permission) => {
    if (!groups[permission.group]) groups[permission.group] = [];
    groups[permission.group].push(permission);
    return groups;
  }, {});
}

export default function Staff() {
  const { user, refreshProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('team');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(null);
  const [editor, setEditor] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('manager');
  const [roleDraft, setRoleDraft] = useState(getRolePermissions('manager'));

  const flash = (tone, text) => setNotice({ tone, text });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await db('users')
        .select('id,full_name,email,phone,role,avatar_url,created_at,kyc_verified,wallet_balance')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      setMembers(data || []);
    } catch (error) {
      flash('danger', error.message || 'Could not load members.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const staffMembers = useMemo(() => {
    const list = members
      .filter((member) => isStaffRole(effectiveRole(member)) || effectiveRole(member) === 'super_admin')
      .map((member) => ({ ...member, effectiveRole: effectiveRole(member) }));

    if (
      user &&
      isSuperAdminEmail(user.email) &&
      !list.some((member) => member.id === user.id)
    ) {
      list.unshift({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Super Admin',
        email: user.email,
        role: 'super_admin',
        effectiveRole: 'super_admin',
        created_at: user.created_at,
      });
    }

    return list.sort((a, b) => {
      if (a.effectiveRole === 'super_admin') return -1;
      if (b.effectiveRole === 'super_admin') return 1;
      return String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''));
    });
  }, [members, user]);

  const staffIds = useMemo(() => new Set(staffMembers.map((member) => member.id)), [staffMembers]);

  const candidates = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members
      .filter((member) => !staffIds.has(member.id))
      .filter((member) => {
        if (!query) return true;
        return [member.full_name, member.email, member.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 8);
  }, [members, staffIds, memberSearch]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staffMembers.filter((member) => {
      if (!query) return true;
      return [member.full_name, member.email, roleLabel(member.effectiveRole)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [staffMembers, search]);

  const stats = useMemo(() => {
    const roleCounts = staffMembers.reduce((accumulator, member) => {
      accumulator[member.effectiveRole] = (accumulator[member.effectiveRole] || 0) + 1;
      return accumulator;
    }, {});
    return {
      total: staffMembers.length,
      managers: roleCounts.manager || 0,
      moderators: roleCounts.content_moderator || 0,
      support: (roleCounts.support || 0) + (roleCounts.customer_care || 0),
      roles: Object.keys(roleCounts).length,
    };
  }, [staffMembers]);

  const openAdd = () => {
    const defaultRole = 'manager';
    setEditor({
      mode: 'add',
      member: null,
      role: defaultRole,
      permissions: getRolePermissions(defaultRole),
    });
    setMemberSearch('');
  };

  const openEdit = (member) => {
    if (member.effectiveRole === 'super_admin') return;
    setEditor({
      mode: 'edit',
      member,
      role: member.effectiveRole,
      permissions: resolvePermissions(member.effectiveRole, member.id),
    });
    setMemberSearch('');
  };

  const changeEditorRole = (roleId) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            role: roleId,
            permissions: getRolePermissions(roleId),
          }
        : current
    );
  };

  const toggleEditorPermission = (permissionId) => {
    setEditor((current) => {
      if (!current) return current;
      const exists = current.permissions.includes(permissionId);
      return {
        ...current,
        permissions: exists
          ? current.permissions.filter((entry) => entry !== permissionId)
          : [...current.permissions, permissionId],
      };
    });
  };

  const saveEditor = async () => {
    if (!editor?.member) {
      flash('danger', 'Choose an existing member to add to staff.');
      return;
    }
    if (!editor.role || editor.role === 'super_admin') {
      flash('danger', 'Choose an assignable staff role.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await db('users')
        .update({ role: editor.role })
        .eq('id', editor.member.id);
      if (error) throw new Error(error.message);

      const defaults = getRolePermissions(editor.role);
      if (samePermissions(defaults, editor.permissions)) {
        removeStaffOverride(editor.member.id);
      } else {
        setStaffOverride(editor.member.id, editor.permissions);
      }

      setMembers((current) =>
        current.map((member) =>
          member.id === editor.member.id ? { ...member, role: editor.role } : member
        )
      );
      flash(
        'success',
        editor.mode === 'add'
          ? `${editor.member.full_name || editor.member.email} added as ${roleLabel(editor.role)}.`
          : `${editor.member.full_name || editor.member.email} updated to ${roleLabel(editor.role)}.`
      );
      setEditor(null);
      if (editor.member.id === user?.id) refreshProfile();
    } catch (error) {
      flash('danger', error.message || 'Could not update this member.');
    }
    setSaving(false);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const { error } = await db('users')
        .update({ role: 'customer' })
        .eq('id', removeTarget.id);
      if (error) throw new Error(error.message);
      removeStaffOverride(removeTarget.id);
      setMembers((current) =>
        current.map((member) =>
          member.id === removeTarget.id ? { ...member, role: 'customer' } : member
        )
      );
      flash('success', `${removeTarget.full_name || removeTarget.email} removed from staff.`);
      setRemoveTarget(null);
      if (removeTarget.id === user?.id) refreshProfile();
    } catch (error) {
      flash('danger', error.message || 'Could not remove this staff member.');
    }
    setRemoving(false);
  };

  const selectRoleForEditing = (roleId) => {
    setSelectedRole(roleId);
    setRoleDraft(getRolePermissions(roleId));
  };

  const toggleRolePermission = (permissionId) => {
    if (selectedRole === 'super_admin') return;
    setRoleDraft((current) =>
      current.includes(permissionId)
        ? current.filter((entry) => entry !== permissionId)
        : [...current, permissionId]
    );
  };

  const saveRolePermissions = () => {
    if (selectedRole === 'super_admin') return;
    setRolePermissions(selectedRole, roleDraft);
    flash('success', `${roleLabel(selectedRole)} permissions saved for this workspace.`);
  };

  const selectedRoleInfo = STAFF_ROLES.find((entry) => entry.id === selectedRole);
  const groups = permissionGroups();

  return (
    <div style={{ padding: '30px 32px' }}>
      <PageHeader
        eyebrow="System / Staff & access"
        title="Staff & access"
        subtitle="Assign staff roles, tune permissions and keep the operations team least-privileged."
        actions={
          <>
            <button type="button" onClick={fetchMembers} style={ghostButton} disabled={loading}>
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={openAdd} style={primaryButton}>
              <FiUserPlus size={15} /> Add staff
            </button>
          </>
        }
      />

      {notice ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={FiUsers} label="Staff team" value={stats.total} detail={`${stats.roles} roles in use`} tone="primary" />
        <StatCard icon={FiShield} label="Managers" value={stats.managers} detail="Broad operations access" tone="purple" />
        <StatCard icon={FiCheck} label="Moderators" value={stats.moderators} detail="Content and verification" tone="teal" />
        <StatCard icon={FiUsers} label="Support" value={stats.support} detail="Member and review support" tone="warning" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { key: 'team', label: `Team (${staffMembers.length})` },
          { key: 'roles', label: 'Role permissions' },
        ].map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            style={{
              padding: '9px 16px',
              borderRadius: radii.md,
              border: `1px solid ${tab === entry.key ? colors.primaryBorder : colors.border}`,
              background: tab === entry.key ? colors.primarySoft : colors.surface,
              color: tab === entry.key ? colors.primary : colors.textMuted,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search staff by name, email or role…"
              style={{ flex: 1, minWidth: 240 }}
            />
            <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>
              {filteredStaff.length} staff members
            </span>
          </Toolbar>

          {loading ? (
            <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
              Loading staff…
            </div>
          ) : filteredStaff.length === 0 ? (
            <div style={cardStyle}>
              <EmptyState
                icon={FiShield}
                title="No staff match this search"
                description="Add an existing member to the team and give them a role."
                action={<button type="button" onClick={openAdd} style={primaryButton}><FiUserPlus size={14} /> Add staff</button>}
              />
            </div>
          ) : (
            <TableShell>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <Th>Staff member</Th>
                    <Th>Role</Th>
                    <Th>Access</Th>
                    <Th>Joined</Th>
                    <Th style={{ textAlign: 'right' }}>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => {
                    const memberRole = member.effectiveRole;
                    const superAdmin = memberRole === 'super_admin';
                    const permissions = superAdmin
                      ? ALL_PERMISSION_IDS
                      : resolvePermissions(memberRole, member.id);
                    return (
                      <tr key={member.id}>
                        <Td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={avatarStyle}>
                              {member.avatar_url ? (
                                <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                initials(member.full_name || member.email)
                              )}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {member.full_name || member.email}
                                {member.id === user?.id ? <span style={badgeStyle('neutral')}>You</span> : null}
                              </div>
                              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                                {member.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <span style={badgeStyle(roleTone(memberRole))}>{roleLabel(memberRole)}</span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 10.5, color: colors.textMuted }}>
                            {superAdmin ? 'Full platform access' : `${permissions.length} of ${ALL_PERMISSION_IDS.length} permissions`}
                          </span>
                        </Td>
                        <Td>
                          <span style={{ fontSize: 10.5, color: colors.textMuted }}>{timeAgo(member.created_at)}</span>
                        </Td>
                        <Td style={{ textAlign: 'right' }}>
                          {superAdmin ? (
                            <span style={badgeStyle('danger')}>
                              <FiLock size={9} /> Reserved
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: 5 }}>
                              <button type="button" onClick={() => openEdit(member)} style={iconButtonStyle} title="Edit access">
                                <FiEdit2 size={13} />
                              </button>
                              <button type="button" onClick={() => setRemoveTarget(member)} style={{ ...iconButtonStyle, color: colors.danger, borderColor: 'rgba(231,76,60,0.25)', background: colors.dangerSoft }} title="Remove staff">
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAFF_ROLES.map((entry) => {
              const active = selectedRole === entry.id;
              const permissions = entry.id === 'super_admin' ? ALL_PERMISSION_IDS : getRolePermissions(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectRoleForEditing(entry.id)}
                  style={{
                    textAlign: 'left',
                    padding: 13,
                    borderRadius: radii.md,
                    border: `1px solid ${active ? colors.primaryBorder : colors.border}`,
                    background: active ? colors.primarySoft : colors.surface,
                    color: colors.text,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{entry.label}</span>
                    <span style={badgeStyle(entry.tone)}>{permissions.length}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: colors.textMuted, lineHeight: 1.45 }}>
                    {entry.description}
                  </div>
                  {entry.reserved ? (
                    <div style={{ marginTop: 6, fontSize: 9, color: colors.danger, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiLock size={9} /> Reserved for platform owner
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div style={{ ...cardStyle, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{selectedRoleInfo?.label}</span>
                  <span style={badgeStyle(selectedRoleInfo?.tone)}>
                    {selectedRole === 'super_admin' ? ALL_PERMISSION_IDS.length : roleDraft.length} permissions
                  </span>
                </div>
                <div style={{ marginTop: 4, fontSize: 10.5, color: colors.textMuted, lineHeight: 1.5, maxWidth: 520 }}>
                  {selectedRoleInfo?.description}
                </div>
              </div>
              {selectedRole !== 'super_admin' ? (
                <button type="button" onClick={saveRolePermissions} style={primaryButton}>
                  Save permissions
                </button>
              ) : (
                <span style={badgeStyle('danger')}><FiLock size={9} /> Always full access</span>
              )}
            </div>

            {selectedRole === 'super_admin' ? (
              <div style={{ marginBottom: 14 }}>
                <Notice tone="warning">
                  Super Admin is reserved for the platform owner and cannot be edited or assigned here.
                </Notice>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <Notice tone="primary">
                  Role changes are saved for this admin workspace. Staff roles are stored on member profiles.
                </Notice>
              </div>
            )}

            {Object.entries(groups).map(([group, permissions]) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.textDim, marginBottom: 7 }}>
                  {group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 7 }}>
                  {permissions.map((permission) => {
                    const checked =
                      selectedRole === 'super_admin' || roleDraft.includes(permission.id);
                    return (
                      <label
                        key={permission.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 9,
                          padding: '10px 11px',
                          borderRadius: 10,
                          background: checked ? colors.primarySoft : colors.surfaceAlt,
                          border: `1px solid ${checked ? colors.primaryBorder : colors.border}`,
                          cursor: selectedRole === 'super_admin' ? 'default' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={selectedRole === 'super_admin'}
                          onChange={() => toggleRolePermission(permission.id)}
                          style={{ accentColor: colors.primary, width: 14, height: 14, marginTop: 1 }}
                        />
                        <span>
                          <span style={{ display: 'block', fontSize: 11, fontWeight: 700 }}>{permission.label}</span>
                          <span style={{ display: 'block', marginTop: 2, fontSize: 9.5, color: colors.textMuted, lineHeight: 1.4 }}>
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editor ? (
        <Modal
          title={editor.mode === 'add' ? 'Add staff member' : 'Edit staff access'}
          subtitle={
            editor.mode === 'add'
              ? 'Promote an existing member and choose their role.'
              : `${editor.member?.full_name || editor.member?.email} · ${roleLabel(editor.member?.role)}`
          }
          onClose={() => setEditor(null)}
          width={700}
          footer={
            <>
              <button type="button" onClick={() => setEditor(null)} style={ghostButton}>Cancel</button>
              <button type="button" onClick={saveEditor} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editor.mode === 'add' ? 'Add to staff' : 'Save access'}
              </button>
            </>
          }
        >
          {editor.mode === 'add' ? (
            <div style={{ marginBottom: 16 }}>
              <Field label="Member" hint="Only existing Munolink members can be promoted. Ask them to create an account first.">
                <SearchInput
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Search members by name, email or phone…"
                  style={{ minWidth: '100%' }}
                />
              </Field>
              <div style={{ ...cardStyle, marginTop: 9, maxHeight: 210, overflowY: 'auto', padding: 6 }}>
                {candidates.length ? (
                  candidates.map((member) => {
                    const active = editor.member?.id === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setEditor({ ...editor, member })}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 10px',
                          borderRadius: 9,
                          border: `1px solid ${active ? colors.primaryBorder : 'transparent'}`,
                          background: active ? colors.primarySoft : 'transparent',
                          color: colors.text,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={avatarStyle}>
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials(member.full_name || member.email)
                          )}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700 }}>
                            {member.full_name || member.email}
                          </span>
                          <span style={{ display: 'block', fontSize: 9.5, color: colors.textMuted }}>
                            {member.email || member.phone || 'No contact'} · {roleLabel(member.role)}
                          </span>
                        </span>
                        {active ? <FiCheck size={14} color={colors.primary} /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 10.5, color: colors.textMuted }}>
                    <FiSearch size={17} style={{ display: 'block', margin: '0 auto 7px' }} />
                    No members found. Try another search or refresh the member list.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 16 }}>
            <Field label="Role">
              <select value={editor.role} onChange={(event) => changeEditorRole(event.target.value)} style={selectStyle}>
                {ASSIGNABLE_ROLES.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Selected role">
              <div style={{ ...input, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={badgeStyle(roleTone(editor.role))}>{roleLabel(editor.role)}</span>
                <span style={{ fontSize: 10, color: colors.textMuted }}>
                  {getRolePermissions(editor.role).length} default permissions
                </span>
              </div>
            </Field>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted }}>
              Permissions
            </span>
            <button
              type="button"
              onClick={() => setEditor({ ...editor, permissions: getRolePermissions(editor.role) })}
              style={{ border: 'none', background: 'transparent', color: colors.primary, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
            >
              Reset to role defaults
            </button>
          </div>
          <div style={{ ...cardStyle, padding: 10, maxHeight: 280, overflowY: 'auto' }}>
            {Object.entries(groups).map(([group, permissions]) => (
              <div key={group} style={{ marginBottom: 11 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textDim, marginBottom: 5 }}>
                  {group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 5 }}>
                  {permissions.map((permission) => {
                    const checked = editor.permissions.includes(permission.id);
                    return (
                      <label key={permission.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 7px', borderRadius: 7, background: checked ? colors.primarySoft : 'transparent', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEditorPermission(permission.id)}
                          style={{ accentColor: colors.primary, width: 13, height: 13 }}
                        />
                        <span style={{ fontSize: 10.5, fontWeight: checked ? 700 : 500 }}>{permission.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {editor.role === 'finance' ? (
            <div style={{ marginTop: 12 }}>
              <Notice tone="warning">
                Finance can view wallets and transactions. It cannot change platform settings or staff access.
              </Notice>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {removeTarget ? (
        <ConfirmDialog
          title={`Remove ${removeTarget.full_name || removeTarget.email} from staff?`}
          description="Their role will return to Member and their custom access will be cleared. Their Munolink account stays intact."
          confirmLabel="Remove staff"
          onConfirm={confirmRemove}
          onClose={() => setRemoveTarget(null)}
          loading={removing}
        />
      ) : null}
    </div>
  );
}

const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
};

const avatarStyle = {
  width: 30,
  height: 30,
  borderRadius: 999,
  background: colors.primarySoft,
  color: colors.primary,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 800,
  overflow: 'hidden',
  flexShrink: 0,
};

const iconButtonStyle = {
  width: 27,
  height: 27,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.surfaceAlt,
  color: colors.textMuted,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
