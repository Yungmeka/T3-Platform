import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ─── SVG Icons ─────────────────────────────────────────────────── */
const IconKey = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);
const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const IconCopy = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
const IconX = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconShield = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconActivity = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);
const IconBan = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

/* ─── Toast ──────────────────────────────────────────────────────── */
function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg pointer-events-auto animate-fade-in"
          style={{
            background: t.type === 'error'
              ? 'linear-gradient(135deg, #FEF2F2, #FFF5F5)'
              : t.type === 'success'
              ? 'linear-gradient(135deg, #ECFDF5, #F0FDF4)'
              : 'linear-gradient(135deg, #F5F3FF, #FAF5FF)',
            border: `1px solid ${t.type === 'error' ? '#FECACA' : t.type === 'success' ? '#A7F3D0' : '#DDD6FE'}`,
            minWidth: '280px',
            maxWidth: '360px',
          }}
        >
          <span style={{ color: t.type === 'error' ? '#DC2626' : t.type === 'success' ? '#059669' : '#7C3AED' }}>
            {t.type === 'error' ? <IconWarning /> : <IconCheck />}
          </span>
          <p
            className="flex-1 text-sm font-medium"
            style={{
              color: t.type === 'error' ? '#991B1B' : t.type === 'success' ? '#065F46' : '#4C1D95',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {t.message}
          </p>
          <button
            onClick={() => onDismiss(t.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: '#64748B' }}
          >
            <IconX />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[140, 96, 104, 96, 64, 72].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-3.5 rounded-full"
            style={{
              width: `${w}px`,
              background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
              backgroundSize: '400px 100%',
              animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {/* Illustration */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.06))',
          border: '1px solid rgba(124,58,237,0.15)',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="6" y="18" width="28" height="16" rx="4" fill="rgba(124,58,237,0.12)" stroke="#7C3AED" strokeWidth="1.5" />
          <path d="M13 18V13a7 7 0 0114 0v5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="26" r="2.5" fill="#EC4899" />
          <path d="M20 28.5v3" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3
        className="text-base font-semibold mb-2"
        style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
      >
        No API keys yet
      </h3>
      <p
        className="text-sm mb-6 max-w-xs"
        style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }}
      >
        Generate your first API key to start integrating T3 data into your own applications and workflows.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <IconPlus />
        Generate your first key
      </button>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────── */
function StatCard({ label, value, icon, accentClass, accentColor, loading }) {
  return (
    <div className={`card ${accentClass} p-5 animate-fade-in`} style={{ borderRadius: '16px' }}>
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
        >
          {label}
        </p>
        <span style={{ color: accentColor, opacity: 0.7 }}>{icon}</span>
      </div>
      {loading ? (
        <div
          className="h-8 w-12 rounded-lg"
          style={{
            background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
            backgroundSize: '400px 100%',
            animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
          }}
        />
      ) : (
        <p
          className="text-4xl font-bold tracking-tight leading-none"
          style={{ color: accentColor, fontFamily: 'Outfit, sans-serif' }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

/* ─── Revoke Confirmation Dialog ─────────────────────────────────── */
function RevokeDialog({ keyEntry, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="card p-6 w-full max-w-sm animate-fade-in"
        style={{ borderRadius: '20px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-dialog-title"
      >
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span style={{ color: '#DC2626' }}><IconWarning /></span>
        </div>

        <h3
          id="revoke-dialog-title"
          className="text-base font-semibold mb-1"
          style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
        >
          Revoke API Key?
        </h3>
        <p
          className="text-sm mb-1"
          style={{ color: '#475569', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }}
        >
          You are about to permanently revoke{' '}
          <span className="font-semibold" style={{ color: '#0F172A' }}>
            {keyEntry.name}
          </span>
          .
        </p>
        <p
          className="text-sm mb-5"
          style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
        >
          Any applications using{' '}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#F1F5F9', color: '#7C3AED', fontFamily: 'monospace' }}
          >
            {keyEntry.prefix}...
          </code>{' '}
          will stop working immediately. This cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: 'transparent',
              border: '2px solid #E2E8F0',
              color: '#475569',
              fontFamily: 'DM Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-all"
            style={{
              background: loading
                ? 'rgba(239,68,68,0.5)'
                : 'linear-gradient(135deg, #DC2626, #EF4444)',
              border: 'none',
              fontFamily: 'DM Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
            }}
          >
            {loading ? 'Revoking…' : 'Yes, revoke key'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── New Key Banner ─────────────────────────────────────────────── */
function NewKeyBanner({ apiKey, onDismiss }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const el = document.createElement('textarea');
      el.value = apiKey;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="mb-6 rounded-2xl p-5 animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(236,72,153,0.04))',
        border: '1.5px solid rgba(124,58,237,0.25)',
        boxShadow: '0 4px 24px rgba(124,58,237,0.08)',
      }}
      role="alert"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <span style={{ color: '#7C3AED' }}><IconKey className="w-4 h-4" /></span>
          </div>
          <div>
            <p
              className="text-sm font-semibold leading-none mb-0.5"
              style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
            >
              Your new API key is ready
            </p>
            <p
              className="text-xs"
              style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}
            >
              Copy it now — it will not be shown again
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: '#334155' }}
          aria-label="Dismiss"
        >
          <IconX />
        </button>
      </div>

      {/* Warning pill */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)' }}
      >
        <span style={{ color: '#D97706' }}><IconWarning /></span>
        <p
          className="text-xs font-medium"
          style={{ color: '#92400E', fontFamily: 'DM Sans, sans-serif' }}
        >
          This key will only be shown once. Store it somewhere safe immediately.
        </p>
      </div>

      {/* Key display */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <code
          className="flex-1 text-sm break-all select-all"
          style={{
            color: '#4C1D95',
            fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
            letterSpacing: '0.02em',
          }}
        >
          {apiKey}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: copied
              ? 'rgba(5,150,105,0.08)'
              : 'rgba(124,58,237,0.08)',
            border: copied
              ? '1px solid rgba(5,150,105,0.25)'
              : '1px solid rgba(124,58,237,0.2)',
            color: copied ? '#059669' : '#7C3AED',
            fontFamily: 'DM Sans, sans-serif',
            minWidth: '76px',
          }}
          aria-label="Copy API key to clipboard"
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

/* ─── Date formatter ─────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function ApiKeys({ brand }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);       // { key_id, api_key, name, prefix, created_at }
  const [revokeTarget, setRevokeTarget] = useState(null); // key entry to confirm revocation
  const [toasts, setToasts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const inputRef = useRef(null);
  const toastCounter = useRef(0);

  /* ── Toast helpers ── */
  function addToast(message, type = 'info') {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 4500);
  }
  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  /* ── Demo keys (backend not deployed) ── */
  const fetchKeys = useCallback(async () => {
    setKeys([
      { key_id: 'demo-1', name: 'Production Backend', prefix: 't3s_live_abc', is_active: true, created_at: '2026-02-15T10:00:00Z', last_used: '2026-03-12T14:30:00Z' },
      { key_id: 'demo-2', name: 'Staging Environment', prefix: 't3s_test_xyz', is_active: true, created_at: '2026-01-20T08:00:00Z', last_used: '2026-03-10T09:15:00Z' },
      { key_id: 'demo-3', name: 'Old Integration', prefix: 't3s_live_old', is_active: false, created_at: '2025-11-01T12:00:00Z', last_used: '2026-01-05T16:45:00Z' },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  /* ── Focus input when form opens ── */
  useEffect(() => {
    if (showForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showForm]);

  /* ── Create key ── */
  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = keyName.trim();
    if (!trimmed) return;

    setCreating(true);
    setTimeout(() => {
      const created = { key_id: 'demo-' + Date.now(), api_key: 't3s_live_' + Math.random().toString(36).slice(2, 14), name: trimmed, prefix: 't3s_live_' + Math.random().toString(36).slice(2, 5), created_at: new Date().toISOString() };
      setNewKey(created);
      setKeys(prev => [{ ...created, is_active: true, last_used: null }, ...prev]);
      setKeyName('');
      setShowForm(false);
      addToast(`Key "${created.name}" created successfully.`, 'success');
      setCreating(false);
    }, 600);
  }

  /* ── Revoke key ── */
  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setTimeout(() => {
      setKeys(prev => prev.map(k => k.key_id === revokeTarget.key_id ? { ...k, is_active: false } : k));
      addToast(`Key "${revokeTarget.name}" has been revoked.`, 'success');
      setRevokeTarget(null);
      setRevoking(false);
    }, 500);
  }

  /* ── Derived stats ── */
  const totalKeys = keys.length;
  const activeKeys = keys.filter((k) => k.is_active).length;
  const revokedKeys = keys.filter((k) => !k.is_active).length;

  return (
    <>
      {/* Inline skeleton shimmer keyframes — injected once */}
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>

      <div className="animate-fade-in">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2
                className="text-2xl font-bold text-slate-800"
                style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}
              >
                API Keys
              </h2>
            </div>
            <p className="text-sm" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
              Manage programmatic access for{' '}
              <span style={{ color: '#334155' }}>{brand.name}</span>
            </p>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <IconPlus />
            {showForm ? 'Cancel' : 'New Key'}
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Keys"
            value={totalKeys}
            icon={<IconKey />}
            accentClass="glow-purple"
            accentColor="#7C3AED"
            loading={loading}
          />
          <StatCard
            label="Active Keys"
            value={activeKeys}
            icon={<IconActivity />}
            accentClass="glow-green"
            accentColor="#059669"
            loading={loading}
          />
          <StatCard
            label="Revoked Keys"
            value={revokedKeys}
            icon={<IconBan />}
            accentClass="glow-red"
            accentColor="#DC2626"
            loading={loading}
          />
        </div>

        {/* ── New key banner (shown once after creation) ── */}
        {newKey && (
          <NewKeyBanner
            apiKey={newKey.api_key}
            onDismiss={() => setNewKey(null)}
          />
        )}

        {/* ── Create form ── */}
        {showForm && (
          <div
            className="card p-5 mb-6 animate-fade-in"
            style={{ borderRadius: '16px' }}
          >
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
            >
              Generate New API Key
            </h3>
            <form onSubmit={handleCreate} className="flex items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="key-name"
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#475569', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Key label
                </label>
                <input
                  id="key-name"
                  ref={inputRef}
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production backend, Dashboard integration…"
                  maxLength={80}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    color: '#0F172A',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7C3AED';
                    e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={creating || !keyName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all"
                style={{
                  background: creating || !keyName.trim()
                    ? 'rgba(124,58,237,0.4)'
                    : 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  boxShadow: creating || !keyName.trim()
                    ? 'none'
                    : '0 4px 16px rgba(124,58,237,0.3)',
                  cursor: creating || !keyName.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {creating ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                      style={{ animation: 'spin 0.7s linear infinite', display: 'inline-block' }}
                    />
                    Generating…
                  </>
                ) : (
                  <>
                    <IconKey className="w-4 h-4" />
                    Generate Key
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Keys table ── */}
        <div className="card p-5 animate-fade-in" style={{ borderRadius: '16px' }}>
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
          >
            Existing Keys
          </h3>

          {/* Loading skeleton */}
          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {['Name', 'Key Prefix', 'Created', 'Last Used', 'Status', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-semibold"
                        style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
          ) : keys.length === 0 ? (
            /* Empty state */
            <EmptyState onCreateClick={() => setShowForm(true)} />
          ) : (
            /* Populated table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {['Name', 'Key Prefix', 'Created', 'Last Used', 'Status', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-semibold"
                        style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k, idx) => (
                    <tr
                      key={k.key_id}
                      className="group transition-colors"
                      style={{
                        borderBottom: idx < keys.length - 1 ? '1px solid #F8FAFC' : 'none',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: k.is_active
                                ? 'rgba(124,58,237,0.08)'
                                : 'rgba(148,163,184,0.1)',
                              border: k.is_active
                                ? '1px solid rgba(124,58,237,0.15)'
                                : '1px solid rgba(148,163,184,0.2)',
                            }}
                          >
                            <span style={{ color: k.is_active ? '#7C3AED' : '#94A3B8' }}>
                              <IconKey className="w-3.5 h-3.5" />
                            </span>
                          </div>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            {k.name}
                          </span>
                        </div>
                      </td>

                      {/* Prefix */}
                      <td className="px-5 py-4">
                        <code
                          className="px-2.5 py-1 rounded-lg text-xs"
                          style={{
                            background: '#F5F3FF',
                            border: '1px solid #EDE9FE',
                            color: '#5B21B6',
                            fontFamily: '"Fira Code", "Courier New", monospace',
                          }}
                        >
                          {k.prefix}...
                        </code>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4">
                        <span
                          className="text-sm"
                          style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {formatDate(k.created_at)}
                        </span>
                      </td>

                      {/* Last used */}
                      <td className="px-5 py-4">
                        <span
                          className="text-sm"
                          style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {k.last_used ? formatDate(k.last_used) : (
                            <span style={{ color: '#CBD5E1' }}>Never</span>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {k.is_active ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold badge-green"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: '#059669' }}
                            />
                            Active
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold badge-red"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: '#DC2626' }}
                            />
                            Revoked
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        {k.is_active ? (
                          <button
                            onClick={() => setRevokeTarget(k)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100"
                            style={{
                              background: 'rgba(239,68,68,0.06)',
                              border: '1px solid rgba(239,68,68,0.18)',
                              color: '#DC2626',
                              fontFamily: 'DM Sans, sans-serif',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
                              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)';
                            }}
                            aria-label={`Revoke key ${k.name}`}
                          >
                            <IconTrash />
                            Revoke
                          </button>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: '#CBD5E1', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Security notice ── */}
        <div
          className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(124,58,237,0.04)',
            border: '1px solid rgba(124,58,237,0.12)',
          }}
        >
          <span className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(124,58,237,0.6)' }}>
            <IconShield />
          </span>
          <p
            className="text-xs"
            style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }}
          >
            API keys grant full programmatic access to this brand's data. Never expose keys in
            client-side code or public repositories. Rotate keys regularly and revoke any that
            are no longer in use.
          </p>
        </div>

      </div>

      {/* ── Revoke confirmation dialog ── */}
      {revokeTarget && (
        <RevokeDialog
          keyEntry={revokeTarget}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
          loading={revoking}
        />
      )}

      {/* ── Toast notifications ── */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Spinner keyframe (for create button) */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
