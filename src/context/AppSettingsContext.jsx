import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CURRENCIES,
  CURRENCY_OPTIONS,
  formatMoney as formatThemeMoney,
  setActiveCurrency,
} from '../lib/theme';
import { getRuntimeMode, setRuntimeMode } from '../lib/db';

const SETTINGS_KEY = 'munolink.admin.settings';

const DEFAULT_SETTINGS = {
  currency: 'USD',
  environment: getRuntimeMode(),
  autoRefresh: true,
  compactTables: false,
};

const AppSettingsContext = createContext(null);

function loadSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      currency: CURRENCIES[parsed.currency] ? parsed.currency : 'USD',
      environment:
        parsed.environment === 'development' || parsed.environment === 'production'
          ? parsed.environment
          : DEFAULT_SETTINGS.environment,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persist(settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore unavailable storage.
  }
}

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    setActiveCurrency(settings.currency);
  }, [settings.currency]);

  useEffect(() => {
    setRuntimeMode(settings.environment);
  }, [settings.environment]);

  const updateSettings = (patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      persist(next);
      return next;
    });
  };

  const setCurrency = (currency) => {
    if (!CURRENCIES[currency]) return;
    setActiveCurrency(currency);
    updateSettings({ currency });
  };

  const setEnvironment = (environment) => {
    if (environment !== 'development' && environment !== 'production') return;
    setRuntimeMode(environment);
    updateSettings({ environment });
  };

  const resetSettings = () => {
    setActiveCurrency(DEFAULT_SETTINGS.currency);
    setRuntimeMode(DEFAULT_SETTINGS.environment);
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  };

  const value = useMemo(() => {
    const currency = CURRENCIES[settings.currency] || CURRENCIES.USD;
    const isDevelopment = settings.environment === 'development';
    return {
      settings,
      currency,
      currencyOptions: CURRENCY_OPTIONS,
      environment: settings.environment,
      isDevelopment,
      dataSourceMode: isDevelopment ? 'local' : 'supabase',
      dataSourceLabel: isDevelopment ? 'Local API' : 'Supabase',
      setCurrency,
      setEnvironment,
      updateSettings,
      resetSettings,
      formatMoney: (value) => formatThemeMoney(value, settings.currency),
    };
  }, [settings]);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }
  return context;
}
