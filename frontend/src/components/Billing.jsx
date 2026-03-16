import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  getSubscription,
  getPlans,
  createTrialSubscription,
  createCheckoutSession,
  createPortalSession,
} from '../services/billing';

/* ─── SVG Icons ─────────────────────────────────────────────────── */
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const IconCreditCard = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
const IconScan = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);
const IconApi = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
  </svg>
);
const IconContent = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const IconArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const IconStar = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);
const IconSparkles = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);
const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysRemaining(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ─── Status Badge ───────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    active: {
      label: 'Active',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      color: '#059669',
      dot: '#10B981',
    },
    trialing: {
      label: 'Trial',
      bg: '#F5F3FF',
      border: '#DDD6FE',
      color: '#7C3AED',
      dot: '#8B5CF6',
    },
    past_due: {
      label: 'Past Due',
      bg: '#FEF2F2',
      border: '#FECACA',
      color: '#DC2626',
      dot: '#EF4444',
    },
    canceled: {
      label: 'Canceled',
      bg: '#F8FAFC',
      border: '#E2E8F0',
      color: '#64748B',
      dot: '#94A3B8',
    },
    incomplete: {
      label: 'Incomplete',
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#D97706',
      dot: '#F59E0B',
    },
  }[status] ?? {
    label: status ?? 'Unknown',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    color: '#64748B',
    dot: '#94A3B8',
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

/* ─── Usage Progress Bar ─────────────────────────────────────────── */
function UsageBar({ label, icon, used, limit }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isAmber = pct >= 75 && pct < 90;
  const isRed = pct >= 90;

  const barColor = isRed
    ? 'linear-gradient(90deg, #EF4444, #DC2626)'
    : isAmber
    ? 'linear-gradient(90deg, #F59E0B, #D97706)'
    : 'linear-gradient(90deg, #7C3AED, #EC4899)';

  const trackColor = isRed ? '#FEE2E2' : isAmber ? '#FEF3C7' : '#EDE9FE';

  const countColor = isRed ? '#DC2626' : isAmber ? '#D97706' : '#7C3AED';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: '#7C3AED' }}>{icon}</span>
          <span
            className="text-sm font-semibold text-slate-700"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {label}
          </span>
          {isRed && (
            <span style={{ color: '#EF4444' }}>
              <IconWarning />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-bold"
            style={{ color: countColor, fontFamily: 'Outfit, sans-serif' }}
          >
            {safeNum(used).toLocaleString()}
          </span>
          <span
            className="text-xs text-slate-400"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            / {limit !== null && limit !== undefined ? safeNum(limit).toLocaleString() : '∞'}
          </span>
        </div>
      </div>

      {/* Track */}
      <div
        className="w-full h-2.5 rounded-full overflow-hidden"
        style={{ background: trackColor }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} usage: ${Math.round(pct)}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      {/* Footnote */}
      <p
        className="text-[11px] text-slate-400"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {limit !== null && limit !== undefined
          ? `${Math.max(0, safeNum(limit) - safeNum(used)).toLocaleString()} remaining`
          : 'Unlimited'}
        {isAmber && (
          <span className="ml-2 text-amber-600 font-semibold">
            Approaching limit
          </span>
        )}
        {isRed && (
          <span className="ml-2 text-red-600 font-semibold">
            Limit nearly reached
          </span>
        )}
      </p>
    </div>
  );
}

/* ─── Plan Card ──────────────────────────────────────────────────── */
function PlanCard({ plan, isCurrent, onAction, actionLoading }) {
  const isPopular = plan.name?.toLowerCase().includes('pro') ||
    plan.name?.toLowerCase().includes('growth');

  // Determine relative tier from price (stored in cents).
  const price = safeNum(plan.price_monthly) / 100;

  // Parse features stored as JSON array or newline-delimited text.
  let features = [];
  if (Array.isArray(plan.features)) {
    features = plan.features;
  } else if (typeof plan.features === 'string') {
    try {
      const parsed = JSON.parse(plan.features);
      features = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      features = plan.features.split('\n').filter(Boolean);
    }
  }

  // Fallback feature list derived from limits when no features field exists.
  if (features.length === 0) {
    if (plan.scan_limit != null) features.push(`${safeNum(plan.scan_limit).toLocaleString()} scans / month`);
    if (plan.api_call_limit != null) features.push(`${safeNum(plan.api_call_limit).toLocaleString()} API calls / month`);
    if (plan.content_gen_limit != null) features.push(`${safeNum(plan.content_gen_limit).toLocaleString()} content generations / month`);
    features.push('Email support');
  }

  return (
    <div
      className="relative flex flex-col"
      style={{
        background: isCurrent
          ? 'linear-gradient(145deg, rgba(124,58,237,0.04), rgba(236,72,153,0.04))'
          : '#FFFFFF',
        borderRadius: '20px',
        border: isCurrent
          ? '2px solid rgba(124,58,237,0.25)'
          : '1px solid #E2E8F0',
        boxShadow: isCurrent
          ? '0 8px 32px rgba(124,58,237,0.12)'
          : '0 4px 20px rgba(0,0,0,0.04)',
        padding: '28px 24px',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      }}
    >
      {/* Popular badge */}
      {isPopular && !isCurrent && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <IconStar />
          Most Popular
        </div>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: '#FFFFFF',
            border: '2px solid rgba(124,58,237,0.3)',
            color: '#7C3AED',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 2px 8px rgba(124,58,237,0.15)',
          }}
        >
          Current Plan
        </div>
      )}

      {/* Plan name */}
      <h3
        className="text-lg font-bold text-slate-900 mb-1"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        {plan.display_name ?? plan.name ?? 'Unnamed Plan'}
      </h3>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-5">
        <span
          className="text-4xl font-bold"
          style={{
            fontFamily: 'Outfit, sans-serif',
            color: isCurrent ? '#7C3AED' : '#0F172A',
          }}
        >
          ${price === 0 ? '0' : price.toLocaleString()}
        </span>
        <span
          className="text-sm text-slate-400 font-medium"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          / mo
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 mb-5" />

      {/* Feature list */}
      <ul className="flex flex-col gap-3 flex-1 mb-6">
        {features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              style={{
                background: isCurrent
                  ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
                  : '#F1F5F9',
                color: isCurrent ? '#FFFFFF' : '#7C3AED',
              }}
            >
              <IconCheck />
            </span>
            <span
              className="text-sm text-slate-600 leading-snug"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div
          className="w-full py-2.5 rounded-full text-center text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))',
            color: '#7C3AED',
            fontFamily: 'DM Sans, sans-serif',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          Your Current Plan
        </div>
      ) : (
        <button
          onClick={() => onAction(plan)}
          disabled={actionLoading}
          className="w-full py-2.5 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: isPopular
              ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
              : 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: isPopular
              ? '0 4px 16px rgba(124,58,237,0.3)'
              : '0 2px 8px rgba(124,58,237,0.2)',
          }}
          aria-label={`Select ${plan.name} plan`}
        >
          {actionLoading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Select Plan
              <IconArrowRight />
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Skeleton loader ────────────────────────────────────────────── */
function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`rounded-xl animate-pulse bg-slate-100 ${className}`}
      style={style}
    />
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function Billing({ brand }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingData, setBillingData] = useState(null); // { subscription, plan, usage }
  const [plans, setPlans] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Derive userId from the active Supabase session.
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? '');
      }
    });
  }, []);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadBillingData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const [subResult, plansResult] = await Promise.all([
        getSubscription(userId),
        getPlans(),
      ]);
      setBillingData(subResult);
      setPlans(plansResult);
    } catch (err) {
      console.error('[Billing] load error:', err);
      setError('Failed to load billing data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  async function handleStartTrial() {
    if (!userId) return;
    setActionLoading(true);
    try {
      const result = await createTrialSubscription(userId);
      if (result) {
        showToast('success', '14-day free trial started!');
        await loadBillingData();
      } else {
        showToast('error', 'Could not start trial. Please contact support.');
      }
    } catch (err) {
      showToast('error', err.message ?? 'Unexpected error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSelectPlan(plan) {
    if (!userId) return;
    setActionLoading(true);
    try {
      const url = await createCheckoutSession(
        plan.stripe_price_id ?? plan.id,
        userId,
        userEmail
      );
      if (url) {
        window.location.href = url;
      } else {
        showToast('error', 'Stripe checkout is not yet configured. Check back soon!');
      }
    } catch (err) {
      showToast('error', err.message ?? 'Unexpected error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManageBilling() {
    if (!userId) return;
    setActionLoading(true);
    try {
      const url = await createPortalSession(userId);
      if (url) {
        window.location.href = url;
      } else {
        showToast('error', 'Billing portal is not yet configured. Check back soon!');
      }
    } catch (err) {
      showToast('error', err.message ?? 'Unexpected error');
    } finally {
      setActionLoading(false);
    }
  }

  // Derive display values.
  const subscription = billingData?.subscription ?? null;
  const plan = billingData?.plan ?? null;
  const usage = billingData?.usage ?? null;

  const scanUsed = safeNum(usage?.scans_used);
  const apiUsed = safeNum(usage?.api_calls_used);
  const contentUsed = safeNum(usage?.content_gen_used);

  const scanLimit = plan?.max_scans ?? null;
  const apiLimit = plan?.max_api_calls ?? null;
  const contentLimit = plan?.max_content_gen ?? null;

  const trialDays = subscription?.status === 'trialing'
    ? daysRemaining(subscription?.trial_end ?? subscription?.current_period_end)
    : null;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="card p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        {/* Usage skeleton */}
        <div className="card p-6">
          <Skeleton className="h-5 w-36 mb-6" />
          <div className="flex flex-col gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        {/* Plans skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6">
              <Skeleton className="h-5 w-28 mb-3" />
              <Skeleton className="h-10 w-20 mb-6" />
              <div className="flex flex-col gap-3">
                {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-4 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div
        className="card p-8 text-center animate-fade-in"
        style={{ borderRadius: '20px' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#FEF2F2' }}
        >
          <span style={{ color: '#DC2626' }}><IconWarning /></span>
        </div>
        <p
          className="text-base font-semibold text-slate-800 mb-1"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Something went wrong
        </p>
        <p className="text-sm text-slate-400 mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {error}
        </p>
        <button
          onClick={loadBillingData}
          className="px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── No subscription ── */
  if (!subscription) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Hero CTA */}
        <div
          className="card p-8 flex flex-col md:flex-row items-center gap-6"
          style={{ borderRadius: '20px' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            <IconSparkles />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2
              className="text-xl font-bold text-slate-900 mb-1"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Start your free 14-day trial
            </h2>
            <p
              className="text-sm text-slate-500"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Get full access to the Starter plan. No credit card required.
            </p>
          </div>
          <button
            onClick={handleStartTrial}
            disabled={actionLoading}
            className="flex-shrink-0 flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            }}
          >
            {actionLoading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><IconSparkles /> Start Free Trial</>
            }
          </button>
        </div>

        {/* Plan comparison when not subscribed */}
        <h3
          className="text-base font-bold text-slate-700 px-1"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Compare Plans
        </h3>
        {plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={false}
                onAction={handleSelectPlan}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 px-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            No plans available right now. Please check back shortly.
          </p>
        )}
      </div>
    );
  }

  /* ── Main billing dashboard ── */
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-fade-in"
          style={{
            background: toast.type === 'error'
              ? 'linear-gradient(135deg, #FEF2F2, #FFF5F5)'
              : 'linear-gradient(135deg, #ECFDF5, #F0FDF4)',
            border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
            minWidth: '280px',
            maxWidth: '360px',
          }}
        >
          <span style={{ color: toast.type === 'error' ? '#DC2626' : '#059669' }}>
            {toast.type === 'error' ? <IconWarning /> : <IconCheck />}
          </span>
          <p
            className="flex-1 text-sm font-medium text-slate-700"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {toast.message}
          </p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── 1. Current Plan Card ── */}
      <div
        className="card p-6 md:p-8"
        style={{ borderRadius: '20px' }}
      >
        {/* Trial warning banner */}
        {subscription.status === 'trialing' && trialDays !== null && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
            style={{
              background: trialDays <= 3 ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${trialDays <= 3 ? '#FECACA' : '#FDE68A'}`,
            }}
          >
            <span style={{ color: trialDays <= 3 ? '#DC2626' : '#D97706' }}>
              <IconWarning />
            </span>
            <p
              className="text-sm font-medium"
              style={{
                color: trialDays <= 3 ? '#DC2626' : '#92400E',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {trialDays === 0
                ? 'Your trial expires today.'
                : `Your trial ends in ${trialDays} day${trialDays !== 1 ? 's' : ''}.`}
              {' '}Upgrade to keep full access.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left — plan info */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
              >
                <span className="text-white"><IconCreditCard /></span>
              </div>
              <div>
                <p
                  className="text-[10px] uppercase tracking-widest font-semibold text-slate-400"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Current Plan
                </p>
                <h2
                  className="text-xl font-bold text-slate-900 leading-tight"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {plan?.name ?? 'Starter'}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <StatusBadge status={subscription.status} />
              {plan?.price_monthly != null && (
                <span
                  className="text-sm font-semibold text-slate-700"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  ${(safeNum(plan.price_monthly) / 100).toLocaleString()} / month
                </span>
              )}
            </div>

            {/* Billing dates */}
            <div className="flex flex-wrap gap-4">
              {subscription.current_period_start && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400"><IconCalendar /></span>
                  <span
                    className="text-xs text-slate-500"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Period started {formatDate(subscription.current_period_start)}
                  </span>
                </div>
              )}
              {subscription.current_period_end && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400"><IconCalendar /></span>
                  <span
                    className="text-xs text-slate-500"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {subscription.status === 'trialing' ? 'Trial ends' : 'Next billing date'}{' '}
                    <span className="font-semibold text-slate-700">
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex flex-col gap-2 flex-shrink-0 min-w-[160px]">
            <button
              onClick={handleManageBilling}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
              }}
            >
              {actionLoading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><IconCreditCard />Manage Billing</>
              }
            </button>

            {subscription.status !== 'canceled' && !subscription.cancel_at_period_end && (
              <button
                onClick={() => setCancelConfirm(true)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors text-center py-1"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancel subscription
              </button>
            )}

            {subscription.cancel_at_period_end && (
              <p
                className="text-xs text-amber-600 text-center py-1"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancels {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Usage Section ── */}
      <div
        className="card p-6 md:p-8"
        style={{ borderRadius: '20px' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Usage This Period
            </h3>
            {subscription.current_period_end && (
              <p
                className="text-xs text-slate-400 mt-0.5"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Resets {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>
          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              75% warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              90% critical
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-7">
          <UsageBar
            label="Scans"
            icon={<IconScan />}
            used={scanUsed}
            limit={scanLimit}
          />
          <UsageBar
            label="API Calls"
            icon={<IconApi />}
            used={apiUsed}
            limit={apiLimit}
          />
          <UsageBar
            label="Content Generations"
            icon={<IconContent />}
            used={contentUsed}
            limit={contentLimit}
          />
        </div>
      </div>

      {/* ── 3. Plan Comparison ── */}
      {plans.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-5 px-1">
            <h3
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              All Plans
            </h3>
            <span
              className="text-xs text-slate-400"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              — Click a plan to upgrade or change
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={plan?.id === p.id}
                onAction={handleSelectPlan}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Billing Info Footer ── */}
      <div
        className="card p-5 md:p-6"
        style={{ borderRadius: '20px' }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Next billing */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))',
              }}
            >
              <span style={{ color: '#7C3AED' }}><IconCalendar /></span>
            </div>
            <div>
              <p
                className="text-xs text-slate-400 font-medium"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {subscription.status === 'trialing' ? 'Trial ends' : 'Next billing date'}
              </p>
              <p
                className="text-sm font-semibold text-slate-700"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {formatDate(subscription.current_period_end)}
              </p>
            </div>
          </div>

          {/* Plan price */}
          {plan?.price_monthly != null && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))',
                border: '1px solid rgba(124,58,237,0.12)',
              }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: '#7C3AED', fontFamily: 'Outfit, sans-serif' }}
              >
                ${(safeNum(plan.price_monthly) / 100).toLocaleString()} / month
              </span>
              <span
                className="text-xs text-slate-400"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {plan?.display_name ?? plan?.name}
              </span>
            </div>
          )}

          {/* Manage / cancel links */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManageBilling}
              disabled={actionLoading}
              className="text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ color: '#7C3AED', fontFamily: 'DM Sans, sans-serif' }}
            >
              Manage payment method
            </button>
            {subscription.status !== 'canceled' && !subscription.cancel_at_period_end && (
              <>
                <span className="text-slate-300 text-xs">·</span>
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="text-sm text-slate-400 hover:text-red-500 transition-colors"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Cancel subscription
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Cancel Confirmation Modal ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="w-full max-w-md mx-4 bg-white animate-fade-in"
            style={{
              borderRadius: '24px',
              boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
              padding: '32px',
            }}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: '#FEF2F2' }}
            >
              <span style={{ color: '#DC2626' }}><IconWarning /></span>
            </div>

            <h3
              className="text-lg font-bold text-slate-900 text-center mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Cancel subscription?
            </h3>
            <p
              className="text-sm text-slate-500 text-center mb-6"
              style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}
            >
              Your plan will remain active until the end of your current billing
              period on <strong>{formatDate(subscription?.current_period_end)}</strong>.
              After that, you will lose access to all paid features.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Keep Plan
              </button>
              <button
                onClick={() => {
                  setCancelConfirm(false);
                  handleManageBilling();
                }}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                }}
              >
                {actionLoading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  : 'Cancel Plan'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
