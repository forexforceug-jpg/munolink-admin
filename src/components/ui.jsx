import React, { useEffect } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import {
  badgeStyle,
  card,
  colors,
  ghostButton,
  input,
  primaryButton,
  radii,
  shadows,
} from '../lib/theme';

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 22,
        flexWrap: 'wrap',
      }}
    >
      <div>
        {eyebrow ? (
          <div style={{ fontSize: 10, color: colors.textDim, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
            {eyebrow}
          </div>
        ) : null}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.7 }}>
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.textMuted, lineHeight: 1.55, maxWidth: 680 }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>{actions}</div> : null}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, detail, tone = 'primary' }) {
  const tones = {
    primary: [colors.primary, colors.primarySoft],
    success: [colors.success, colors.successSoft],
    warning: [colors.warning, colors.warningSoft],
    danger: [colors.danger, colors.dangerSoft],
    purple: [colors.purple, colors.purpleSoft],
    teal: [colors.teal, colors.tealSoft],
    pink: [colors.pink, colors.pinkSoft],
  };
  const [color, background] = tones[tone] || tones.primary;
  return (
    <div style={{ ...card, padding: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </span>
        {Icon ? (
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background,
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={15} />
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 23, fontWeight: 800, marginTop: 8, letterSpacing: -0.6 }}>
        {value}
      </div>
      {detail ? (
        <div style={{ marginTop: 4, fontSize: 10, color: colors.textDim, lineHeight: 1.45 }}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </span>
      {children}
      {hint ? (
        <span style={{ display: 'block', marginTop: 5, fontSize: 10, color: colors.textDim, lineHeight: 1.4 }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', style }) {
  return (
    <div style={{ position: 'relative', minWidth: 210, ...style }}>
      <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ ...input, paddingLeft: 34 }}
      />
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, width = 560 }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,6,12,0.74)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 300,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.xl,
          boxShadow: shadows.popover,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            padding: '18px 20px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
            {subtitle ? (
              <div style={{ marginTop: 3, fontSize: 11, color: colors.textMuted, lineHeight: 1.45 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              border: `1px solid ${colors.border}`,
              background: colors.surfaceAlt,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FiX size={15} />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
        {footer ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 9,
              padding: '14px 20px',
              borderTop: `1px solid ${colors.border}`,
              background: colors.bgSoft,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, children, footer, width = 580 }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,6,12,0.66)',
        backdropFilter: 'blur(6px)',
        zIndex: 280,
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: `min(${width}px, 94vw)`,
          background: colors.bgSoft,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: shadows.popover,
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawerIn 0.22s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            padding: '20px 22px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>{title}</div>
            {subtitle ? (
              <div style={{ marginTop: 4, fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.surfaceAlt,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FiX size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>{children}</div>
        {footer ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 9,
              padding: '14px 22px',
              borderTop: `1px solid ${colors.border}`,
              background: colors.surface,
            }}
          >
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        padding: '13px 15px',
        borderRadius: radii.md,
        background: colors.surfaceAlt,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
        {description ? (
          <div style={{ marginTop: 2, fontSize: 10, color: colors.textMuted, lineHeight: 1.45 }}>
            {description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onChange?.(!checked)}
        aria-pressed={checked}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          border: 'none',
          background: checked ? colors.success : 'rgba(255,255,255,0.16)',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'left 0.18s ease',
          }}
        />
      </button>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ padding: '46px 24px', textAlign: 'center' }}>
      {Icon ? (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            margin: '0 auto 14px',
            background: colors.primarySoft,
            color: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={23} />
        </div>
      ) : null}
      <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
      {description ? (
        <div style={{ margin: '6px auto 0', maxWidth: 380, fontSize: 11, color: colors.textMuted, lineHeight: 1.6 }}>
          {description}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = 'primary', children }) {
  const tones = {
    primary: [colors.primary, colors.primarySoft, 'rgba(74,125,255,0.28)'],
    success: [colors.success, colors.successSoft, 'rgba(46,204,113,0.28)'],
    warning: [colors.warning, colors.warningSoft, 'rgba(241,196,15,0.28)'],
    danger: [colors.danger, colors.dangerSoft, 'rgba(231,76,60,0.28)'],
  };
  const [color, background, border] = tones[tone] || tones.primary;
  return (
    <div
      style={{
        padding: '9px 12px',
        borderRadius: radii.md,
        background,
        border: `1px solid ${border}`,
        color,
        fontSize: 11,
        lineHeight: 1.5,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

export function ConfirmDialog({
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
  onClose,
  loading,
}) {
  return (
    <Modal
      title={title}
      subtitle={description}
      onClose={onClose}
      width={430}
      footer={
        <>
          <button type="button" onClick={onClose} style={ghostButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...primaryButton,
              background: tone === 'danger' ? colors.danger : colors.primary,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <span style={badgeStyle(tone)}>This action cannot be undone</span>
    </Modal>
  );
}

export function Toolbar({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        flexWrap: 'wrap',
        padding: 12,
        ...card,
        borderRadius: radii.md,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

export function TableShell({ children }) {
  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
}

export function Th({ children, style }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '11px 14px',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        color: colors.textDim,
        borderBottom: `1px solid ${colors.border}`,
        background: colors.bgSoft,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, style }) {
  return (
    <td
      style={{
        padding: '11px 14px',
        fontSize: 11.5,
        color: colors.text,
        borderBottom: `1px solid ${colors.border}`,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  );
}
