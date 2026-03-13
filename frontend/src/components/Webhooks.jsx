import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { id: 'scan.complete',       label: 'Scan Complete',       badgeClass: 'badge-purple' },
  { id: 'alert.new',           label: 'New Alert',           badgeClass: 'badge-red'    },
  { id: 'claim.hallucinated',  label: 'Claim Hallucinated',  badgeClass: 'badge-amber'  },
  { id: 'ethics.violation',    label: 'Ethics Violation',    badgeClass: 'badge-orange' },
  { id: 'monitoring.complete', label: 'Monitoring Complete', badgeClass: 'badge-cyan'   },
];

const EVENT_MAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.id, e]));

// ── Small reusable helpers ───────────────────────────────────────────────────

function EventBadge({ eventId }) {
  const cfg = EVENT_MAP[eventId] || { label: eventId, badgeClass: 'badge-purple' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${cfg.badgeClass}`}
      style={{ fontFamily: 'Outfit' }}
    >
      {cfg.label}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-violet-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Spinner({ size = 4, color = 'violet' }) {
  return (
    <span
      className={`inline-block w-${size} h-${size} border-2 border-${color}-200 border-t-${color}-500 rounded-full animate-spin`}
    />
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function WebhookSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-3 bg-slate-100 rounded-full w-2/3" />
              <div className="flex gap-2">
                <div className="h-4 bg-slate-100 rounded-md w-24" />
                <div className="h-4 bg-slate-100 rounded-md w-28" />
              </div>
              <div className="h-3 bg-slate-100 rounded-full w-1/3" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <div className="h-8 bg-slate-100 rounded-lg w-16" />
              <div className="h-8 bg-slate-100 rounded-lg w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Confirmation modal ───────────────────────────────────────────────────────

function ConfirmModal({ webhook, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative card p-6 w-full max-w-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Warning icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl inner-card mx-auto mb-4">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h3
          id="confirm-title"
          className="text-center text-sm font-bold text-slate-800 mb-2"
          style={{ fontFamily: 'Outfit' }}
        >
          Deactivate Webhook?
        </h3>
        <p className="text-center text-xs text-slate-500 mb-1">
          This will stop all future deliveries to:
        </p>
        <p className="text-center text-xs font-medium text-violet-700 break-all mb-5">
          {webhook.url}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Outfit' }}
          >
            Keep Active
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontFamily: 'Outfit' }}
          >
            {loading ? <Spinner size={3} color="red" /> : null}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Secret reveal panel ──────────────────────────────────────────────────────

function SecretBanner({ secret, onDismiss }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — do nothing silently
    }
  }

  return (
    <div
      className="rounded-2xl border border-violet-200 p-4 mb-3 animate-fade-in"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(236,72,153,0.04) 100%)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        {/* Lock icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span
          className="text-xs font-bold text-violet-700"
          style={{ fontFamily: 'Outfit' }}
        >
          Webhook Secret — copy now, shown once only
        </span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-white/70 border border-violet-200 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-700 break-all select-all">
          {secret}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            fontFamily: 'Outfit',
            background: copied ? '#ECFDF5' : '#F5F3FF',
            color: copied ? '#059669' : '#7C3AED',
            border: `1px solid ${copied ? '#A7F3D0' : '#DDD6FE'}`,
          }}
          aria-label="Copy signing secret"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        Use this secret to verify the <code className="text-violet-600">X-T3-Signature</code> header on incoming webhook payloads (HMAC-SHA256).
      </p>
      <button
        onClick={onDismiss}
        className="mt-3 text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
      >
        I've saved the secret — dismiss
      </button>
    </div>
  );
}

// ── Webhook card ─────────────────────────────────────────────────────────────

function WebhookCard({ webhook, onDeactivate, onTest, deactivating, testing }) {
  const isInactive = !webhook.is_active;

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return (
    <div
      className={`card p-5 animate-fade-in transition-opacity ${isInactive ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="flex-1 min-w-0">
          {/* URL + status pill */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            {/* Globe icon */}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isInactive ? '#94A3B8' : '#7C3AED'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span
              className="text-sm font-semibold text-slate-800 truncate max-w-xs"
              style={{ fontFamily: 'Outfit' }}
              title={webhook.url}
            >
              {webhook.url}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isInactive
                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
              style={{ fontFamily: 'Outfit' }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`}
              />
              {isInactive ? 'Inactive' : 'Active'}
            </span>
          </div>

          {/* Description */}
          {webhook.description && (
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{webhook.description}</p>
          )}

          {/* Event badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(webhook.events || []).map((ev) => (
              <EventBadge key={ev} eventId={ev} />
            ))}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span>
              <span className="font-medium text-slate-500">Registered:</span>{' '}
              {fmt(webhook.created_at)}
            </span>
            <span>
              <span className="font-medium text-slate-500">Last triggered:</span>{' '}
              {fmt(webhook.last_triggered)}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          {/* Test button */}
          <button
            onClick={() => onTest(webhook.webhook_id)}
            disabled={testing || isInactive}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Outfit' }}
            title={isInactive ? 'Webhook is inactive' : 'Send a test payload'}
          >
            {testing ? (
              <Spinner size={3} color="violet" />
            ) : (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {testing ? 'Sending…' : 'Test'}
          </button>

          {/* Deactivate toggle */}
          {!isInactive && (
            <button
              onClick={() => onDeactivate(webhook)}
              disabled={deactivating}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Outfit' }}
            >
              {deactivating ? <Spinner size={3} color="red" /> : null}
              Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Register form ────────────────────────────────────────────────────────────

const INITIAL_FORM = { url: '', events: [], description: '' };

function RegisterForm({ userId, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [apiError, setApiError] = useState('');

  function handleUrlChange(e) {
    setForm((f) => ({ ...f, url: e.target.value }));
    setUrlError('');
  }

  function handleEventToggle(eventId) {
    setForm((f) => {
      const has = f.events.includes(eventId);
      return {
        ...f,
        events: has ? f.events.filter((e) => e !== eventId) : [...f.events, eventId],
      };
    });
    setEventsError('');
  }

  function validate() {
    let valid = true;
    if (!form.url.startsWith('https://')) {
      setUrlError('URL must start with https://');
      valid = false;
    }
    try {
      new URL(form.url);
    } catch {
      setUrlError('Please enter a valid URL');
      valid = false;
    }
    if (form.events.length === 0) {
      setEventsError('Select at least one event type');
      valid = false;
    }
    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');
    try {
      const res = await fetch(`${API}/api/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url,
          events: form.events,
          user_id: userId,
          description: form.description || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error (${res.status})`);
      }
      const data = await res.json();
      setForm(INITIAL_FORM);
      onCreated(data);
    } catch (err) {
      setApiError(err.message || 'Failed to register webhook. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-5 mb-6 animate-fade-in">
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: '#0F172A', fontFamily: 'Outfit' }}
      >
        Register New Webhook
      </h3>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          {/* URL */}
          <div>
            <label
              htmlFor="wh-url"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
              style={{ fontFamily: 'Outfit' }}
            >
              Endpoint URL
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="wh-url"
              type="url"
              value={form.url}
              onChange={handleUrlChange}
              placeholder="https://your-server.com/webhooks/t3"
              autoComplete="off"
              className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none transition-colors ${
                urlError
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-slate-200 focus:border-violet-400'
              }`}
              style={{ fontFamily: 'DM Sans' }}
            />
            {urlError && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {urlError}
              </p>
            )}
          </div>

          {/* Events */}
          <div>
            <p
              className="text-xs font-semibold text-slate-600 mb-2"
              style={{ fontFamily: 'Outfit' }}
            >
              Event Types
              <span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EVENT_TYPES.map((ev) => {
                const checked = form.events.includes(ev.id);
                return (
                  <label
                    key={ev.id}
                    className={`flex items-center gap-2.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${
                      checked
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* custom checkbox */}
                    <span
                      className={`flex-shrink-0 w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-colors ${
                        checked ? 'bg-violet-500 border-violet-500' : 'bg-white border-slate-300'
                      }`}
                    >
                      {checked && (
                        <svg width="8" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                          <path d="M1 4.5L3.5 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => handleEventToggle(ev.id)}
                      aria-label={ev.label}
                    />
                    <span
                      className={`text-xs font-medium leading-tight ${
                        checked ? 'text-violet-700' : 'text-slate-600'
                      }`}
                      style={{ fontFamily: 'DM Sans' }}
                    >
                      {ev.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {eventsError && (
              <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {eventsError}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="wh-desc"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
              style={{ fontFamily: 'Outfit' }}
            >
              Description
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              id="wh-desc"
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Slack alerts for scan events"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors"
              style={{ fontFamily: 'DM Sans' }}
            />
          </div>

          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-red-600 leading-relaxed">{apiError}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{
                fontFamily: 'Outfit',
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                boxShadow: submitting ? 'none' : '0 4px 16px rgba(124,58,237,0.25)',
              }}
            >
              {submitting && <Spinner size={3} color="white" />}
              {submitting ? 'Registering…' : 'Register Webhook'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Stat cards ───────────────────────────────────────────────────────────────

function StatCards({ webhooks }) {
  const total = webhooks.length;
  const active = webhooks.filter((w) => w.is_active).length;
  const delivered = webhooks.filter((w) => w.last_triggered).length;

  const stats = [
    {
      label: 'Total Webhooks',
      value: total,
      subtext: 'registered endpoints',
      glowClass: 'glow-cyan',
      valueColor: '#7C3AED',
      delay: '0ms',
    },
    {
      label: 'Active',
      value: active,
      subtext: 'currently receiving events',
      glowClass: 'glow-green',
      valueColor: '#059669',
      delay: '80ms',
    },
    {
      label: 'Events Delivered',
      value: delivered,
      subtext: 'endpoints triggered at least once',
      glowClass: 'glow-purple',
      valueColor: '#8B5CF6',
      delay: '160ms',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`card ${s.glowClass} p-5 text-center animate-fade-in`}
          style={{ animationDelay: s.delay }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ fontFamily: 'Outfit', color: s.valueColor }}
          >
            {s.label}
          </p>
          <p
            className="text-4xl font-bold"
            style={{ fontFamily: 'Outfit', color: s.valueColor }}
          >
            {s.value}
          </p>
          <p className="text-xs text-slate-500 mt-2">{s.subtext}</p>
        </div>
      ))}
    </div>
  );
}

// ── Toast notification ───────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-fade-in flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border max-w-sm"
      style={{
        background: isSuccess ? '#ECFDF5' : '#FEF2F2',
        borderColor: isSuccess ? '#A7F3D0' : '#FECACA',
      }}
      role="status"
      aria-live="polite"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isSuccess ? '#059669' : '#DC2626'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 mt-0.5"
        aria-hidden="true"
      >
        {isSuccess ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        )}
      </svg>
      <p
        className="text-xs font-medium leading-relaxed"
        style={{
          fontFamily: 'DM Sans',
          color: isSuccess ? '#065F46' : '#991B1B',
        }}
      >
        {toast.message}
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Webhooks({ brand }) {
  const userId = brand?.user_id;

  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Newly created webhook with its secret (shown once)
  const [newSecret, setNewSecret] = useState(null); // { webhookId, secret }

  // Deactivation confirmation
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);

  // Test state: map of webhookId -> boolean
  const [testingIds, setTestingIds] = useState({});

  // Toast
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchWebhooks = useCallback(async () => {
    if (!userId) return;
    setFetchError('');
    try {
      const res = await fetch(`${API}/api/webhooks?user_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err.message || 'Could not load webhooks.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Called when the register form succeeds
  function handleCreated(data) {
    // Add webhook to list (mark as active, no last_triggered yet)
    const newWebhook = {
      webhook_id: data.webhook_id,
      url: data.url,
      events: data.events,
      description: data.description || '',
      is_active: true,
      created_at: data.created_at || new Date().toISOString(),
      last_triggered: null,
    };
    setWebhooks((prev) => [newWebhook, ...prev]);

    if (data.secret) {
      setNewSecret({ webhookId: data.webhook_id, secret: data.secret });
    }

    showToast('Webhook registered successfully.');
  }

  function handleDismissSecret() {
    setNewSecret(null);
  }

  function handleDeactivateRequest(webhook) {
    setConfirmTarget(webhook);
  }

  async function handleDeactivateConfirm() {
    if (!confirmTarget) return;
    const id = confirmTarget.webhook_id;
    setDeactivatingId(id);
    try {
      const res = await fetch(`${API}/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setWebhooks((prev) =>
        prev.map((w) => (w.webhook_id === id ? { ...w, is_active: false } : w))
      );
      showToast('Webhook deactivated.');
    } catch (err) {
      showToast(err.message || 'Failed to deactivate webhook.', 'error');
    } finally {
      setDeactivatingId(null);
      setConfirmTarget(null);
    }
  }

  function handleDeactivateCancel() {
    setConfirmTarget(null);
  }

  async function handleTest(webhookId) {
    setTestingIds((prev) => ({ ...prev, [webhookId]: true }));
    try {
      const res = await fetch(`${API}/api/webhooks/${webhookId}/test`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      showToast('Test payload sent successfully.');
      // Refresh to capture updated last_triggered
      await fetchWebhooks();
    } catch (err) {
      showToast(err.message || 'Failed to send test payload.', 'error');
    } finally {
      setTestingIds((prev) => ({ ...prev, [webhookId]: false }));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ backgroundColor: '#7C3AED', flexShrink: 0 }}
          />
          <h2
            className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: 'Outfit' }}
          >
            Webhooks
          </h2>
        </div>
        <p className="text-sm text-slate-600 ml-5">
          Receive real-time HTTP callbacks when T3 detects events for{' '}
          <span className="text-slate-700 font-medium">{brand?.name}</span>.
          Payloads are signed with HMAC-SHA256 for security.
        </p>
      </div>

      {/* ── Stat cards ── */}
      {!loading && !fetchError && (
        <StatCards webhooks={webhooks} />
      )}

      {/* ── Register form ── */}
      <RegisterForm userId={userId} onCreated={handleCreated} />

      {/* ── Section heading ── */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold text-slate-700"
          style={{ fontFamily: 'Outfit' }}
        >
          Registered Webhooks
          {!loading && webhooks.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-200"
            >
              {webhooks.length}
            </span>
          )}
        </h3>
        {!loading && (
          <button
            onClick={fetchWebhooks}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors"
            style={{ fontFamily: 'DM Sans' }}
            aria-label="Refresh webhook list"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* ── Secret banner (shown once after registration) ── */}
      {newSecret && (
        <SecretBanner
          secret={newSecret.secret}
          onDismiss={handleDismissSecret}
        />
      )}

      {/* ── Loading skeleton ── */}
      {loading && <WebhookSkeleton />}

      {/* ── Fetch error ── */}
      {!loading && fetchError && (
        <div className="card animate-fade-in">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl inner-card flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1" style={{ fontFamily: 'Outfit' }}>
              Failed to load webhooks
            </p>
            <p className="text-xs text-slate-400 max-w-xs mb-4">{fetchError}</p>
            <button
              onClick={fetchWebhooks}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 transition-colors"
              style={{ fontFamily: 'Outfit' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !fetchError && webhooks.length === 0 && (
        <div className="card animate-fade-in">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl inner-card flex items-center justify-center mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(148,163,184,0.6)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <p
              className="text-slate-400 font-semibold text-sm mb-1"
              style={{ fontFamily: 'Outfit' }}
            >
              No webhooks registered yet
            </p>
            <p className="text-slate-400 text-xs max-w-xs">
              Register your first webhook above to start receiving real-time event notifications.
            </p>
          </div>
        </div>
      )}

      {/* ── Webhook list ── */}
      {!loading && !fetchError && webhooks.length > 0 && (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.webhook_id}
              webhook={webhook}
              onDeactivate={handleDeactivateRequest}
              onTest={handleTest}
              deactivating={deactivatingId === webhook.webhook_id}
              testing={!!testingIds[webhook.webhook_id]}
            />
          ))}
        </div>
      )}

      {/* ── Deactivation confirmation modal ── */}
      {confirmTarget && (
        <ConfirmModal
          webhook={confirmTarget}
          onConfirm={handleDeactivateConfirm}
          onCancel={handleDeactivateCancel}
          loading={deactivatingId === confirmTarget.webhook_id}
        />
      )}

      {/* ── Toast ── */}
      <Toast toast={toast} />
    </div>
  );
}
