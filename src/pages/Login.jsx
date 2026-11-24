import React, { useState } from 'react';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiKey,
  FiLock,
  FiMail,
  FiZap,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  badgeStyle,
  colors,
  input,
  primaryButton,
  radii,
} from '../lib/theme';

const REMEMBERED_EMAIL_KEY = 'munolink.admin.rememberedEmail';

function readRememberedEmail() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export default function Login() {
  const { login, resetPassword } = useAuth();
  const { dataSourceLabel, dataSourceMode, environment } = useAppSettings();
  const remembered = readRememberedEmail();
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(remembered);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      if (remember) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch (err) {
      const message = err?.message || 'Invalid email or password';
      setError(
        /invalid login credentials/i.test(message)
          ? 'Incorrect email or password. Please try again.'
          : message
      );
    }
    setLoading(false);
  };

  const openForgot = () => {
    setForgotEmail(email);
    setForgotError('');
    setForgotMessage('');
    setForgotOpen(true);
  };

  const handleForgot = async (event) => {
    event.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail.trim());
      setForgotMessage(
        `If an account exists for ${forgotEmail.trim()}, a reset link is on its way.`
      );
    } catch (err) {
      setForgotError(err?.message || 'Could not send the reset link.');
    }
    setForgotLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(1100px 620px at 18% 10%, rgba(74,125,255,0.16), transparent 60%), radial-gradient(900px 560px at 82% 92%, rgba(139,92,246,0.14), transparent 62%), #0B0B0D',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 78%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'rgba(18,21,28,0.92)',
          border: `1px solid ${colors.border}`,
          borderRadius: 22,
          padding: 34,
          boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: 'linear-gradient(135deg, #4A7DFF, #6C5CE7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 12px 28px rgba(74,125,255,0.36)',
              }}
            >
              <FiZap size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.8 }}>MUNOLINK</div>
              <div style={{ fontSize: 9, color: colors.primary, fontWeight: 700, letterSpacing: 0.7 }}>
                ADMIN STUDIO
              </div>
            </div>
          </div>
          <span style={badgeStyle(dataSourceMode === 'local' ? 'primary' : 'success')}>
            {dataSourceLabel}
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15 }}>
          Welcome back
        </h1>
        <p style={{ marginTop: 6, marginBottom: 24, fontSize: 12, color: colors.textMuted, lineHeight: 1.55 }}>
          Sign in to manage members, businesses, content and engagement.
        </p>

        {environment === 'production' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '9px 11px',
              borderRadius: radii.md,
              background: colors.warningSoft,
              border: '1px solid rgba(241,196,15,0.24)',
              color: colors.warning,
              fontSize: 10,
              lineHeight: 1.45,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            <FiAlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Production mode is active. Changes you make affect live data.
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              background: colors.dangerSoft,
              border: '1px solid rgba(231,76,60,0.32)',
              color: colors.danger,
              padding: '10px 13px',
              borderRadius: radii.md,
              fontSize: 11,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 13 }}>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
              Email address
            </span>
            <div style={{ position: 'relative' }}>
              <FiMail size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }} />
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@munolink.com"
                autoComplete="email"
                required
                style={{ ...input, paddingLeft: 36, transition: 'border-color 0.18s ease, box-shadow 0.18s ease' }}
              />
            </div>
          </label>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
              Password
            </span>
            <div style={{ position: 'relative' }}>
              <FiLock size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }} />
              <input
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                style={{ ...input, paddingLeft: 36, paddingRight: 42, transition: 'border-color 0.18s ease, box-shadow 0.18s ease' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: colors.textMuted, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                style={{ accentColor: colors.primary, width: 14, height: 14 }}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={openForgot}
              style={{
                border: 'none',
                background: 'transparent',
                color: colors.primary,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...primaryButton,
              width: '100%',
              padding: '12px',
              fontSize: 13,
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 16px 34px rgba(74,125,255,0.28)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading ? <FiArrowRight size={15} /> : null}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 10, color: colors.textDim, lineHeight: 1.5, textAlign: 'center' }}>
          Staff access is managed by the Super Admin. Ask for an invite if you cannot sign in.
        </p>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: colors.textDim }}>Munolink operations console</span>
          <span style={{ fontSize: 10, color: colors.textDim }}>© {new Date().getFullYear()}</span>
        </div>
      </div>

      {forgotOpen ? (
        <div
          role="presentation"
          onClick={() => setForgotOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4,6,12,0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 200,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 390,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.xl,
              padding: 26,
              boxShadow: '0 30px 90px rgba(0,0,0,0.65)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: colors.primarySoft,
                  color: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiKey size={17} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Reset your password</div>
                <div style={{ fontSize: 10, color: colors.textMuted }}>
                  We will email you a secure reset link.
                </div>
              </div>
            </div>

            {forgotMessage ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: radii.md,
                  background: colors.successSoft,
                  border: '1px solid rgba(46,204,113,0.28)',
                  color: colors.success,
                  fontSize: 11,
                  lineHeight: 1.5,
                  marginTop: 14,
                  fontWeight: 600,
                }}
              >
                <FiCheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {forgotMessage}
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ marginTop: 16 }}>
                {forgotError ? (
                  <div
                    style={{
                      padding: '9px 11px',
                      borderRadius: radii.md,
                      background: colors.dangerSoft,
                      border: '1px solid rgba(231,76,60,0.3)',
                      color: colors.danger,
                      fontSize: 11,
                      marginBottom: 12,
                      fontWeight: 600,
                    }}
                  >
                    {forgotError}
                  </div>
                ) : null}
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
                    Account email
                  </span>
                  <div style={{ position: 'relative' }}>
                    <FiMail size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      placeholder="you@munolink.com"
                      required
                      style={{ ...input, paddingLeft: 36 }}
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{ ...primaryButton, width: '100%', opacity: forgotLoading ? 0.7 : 1 }}
                >
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
                border: 'none',
                background: 'transparent',
                color: colors.textMuted,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <FiArrowLeft size={13} /> Back to sign in
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
