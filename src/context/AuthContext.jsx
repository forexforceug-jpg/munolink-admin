import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import {
  ALL_PERMISSION_IDS,
  isSuperAdminEmail,
  resolvePermissions,
  roleLabel,
} from '../lib/staff';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('customer');
  const [permissions, setPermissions] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const clearProfile = () => {
    setProfile(null);
    setRole('customer');
    setPermissions([]);
  };

  const applyProfile = (authUser, nextProfile) => {
    if (!authUser) {
      clearProfile();
      return;
    }
    const nextRole = nextProfile?.role || 'customer';
    const superAdmin =
      isSuperAdminEmail(authUser.email) || nextRole === 'super_admin';
    setRole(superAdmin ? 'super_admin' : nextRole);
    setPermissions(
      superAdmin ? [...ALL_PERMISSION_IDS] : resolvePermissions(nextRole, authUser.id)
    );
  };

  const loadProfile = async (authUser) => {
    if (!authUser) {
      clearProfile();
      return;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await db('users')
        .select('id,full_name,email,role,avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
        applyProfile(authUser, data);
      } else {
        setProfile({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || '',
          avatar_url: authUser.user_metadata?.avatar_url || '',
        });
        applyProfile(authUser, null);
      }
    } catch {
      setProfile({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        avatar_url: authUser.user_metadata?.avatar_url || '',
      });
      applyProfile(authUser, null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user || null;
      setUser(authUser);
      setLoading(false);
      if (authUser) {
        applyProfile(authUser, null);
        loadProfile(authUser);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      if (authUser) {
        applyProfile(authUser, null);
        loadProfile(authUser);
      } else {
        clearProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.user) await loadProfile(data.user);
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    clearProfile();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  const isSuperAdmin = role === 'super_admin';
  const hasPermission = (permission) =>
    isSuperAdmin || permissions.includes(permission);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        role,
        roleName: roleLabel(role),
        permissions,
        isSuperAdmin,
        hasPermission,
        login,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
