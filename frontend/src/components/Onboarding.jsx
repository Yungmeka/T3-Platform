import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { runVisibilityScan } from '../services/sentinel';

// createTrialSubscription and getSubscription resolve lazily on first call so
// the component works even if billing.js does not exist yet.
async function createTrialSubscription(userId, planId) {
  try {
    const mod = await import('../services/billing');
    return await mod.createTrialSubscription(userId, planId);
  } catch {
    console.warn('[Onboarding] billing.js not found — skipping trial creation for plan:', planId);
    return { ok: true, planId };
  }
}

async function getSubscription(userId) {
  try {
    const mod = await import('../services/billing');
    return await mod.getSubscription(userId);
  } catch {
    console.warn('[Onboarding] billing.js not found — skipping subscription lookup');
    return null;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm ' +
  'placeholder:text-slate-400 outline-none transition-all duration-200 ' +
  'focus:border-violet-400 focus:ring-1 focus:ring-violet-400';

const SELECT_CLASS = INPUT_CLASS + ' cursor-pointer appearance-none';

const GRADIENT_BTN =
  'w-full py-3 rounded-full text-white text-sm font-bold transition-all duration-200 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const GRADIENT_STYLE = {
  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35)',
  letterSpacing: '0.01em',
  fontFamily: "'DM Sans', sans-serif",
};

const PLANS = [
  {
    id: 1,
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'Perfect for solo founders and small brands.',
    features: ['1 brand', '4 AI platforms', 'Weekly scans', 'Email alerts'],
    highlight: false,
  },
  {
    id: 2,
    name: 'Growth',
    price: '$149',
    period: '/mo',
    description: 'Ideal for growing teams managing multiple brands.',
    features: ['5 brands', '4 AI platforms', 'Daily scans', 'Slack + email alerts', 'API access'],
    highlight: true,
  },
  {
    id: 3,
    name: 'Enterprise',
    price: '$499',
    period: '/mo',
    description: 'Full-scale AI brand protection for large orgs.',
    features: ['Unlimited brands', 'Priority scanning', 'Dedicated support', 'Custom integrations'],
    highlight: false,
  },
];

const INDUSTRIES = [
  'Technology',
  'Retail',
  'Healthcare',
  'Finance',
  'Food & Beverage',
  'Education',
  'Other',
];

const SCAN_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressDots({ step, total = 4 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === step ? '24px' : '8px',
            height: '8px',
            background:
              i < step
                ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                : i === step
                ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                : '#E2E8F0',
            opacity: i < step ? 0.5 : 1,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function LogoRow() {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          }}
        >
          <img src="/logos/t3-logo.png" alt="T3" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        </div>
        <span
          className="gradient-text"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '26px',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          T3
        </span>
      </div>
      <p
        className="text-slate-400 text-center"
        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', letterSpacing: '0.04em' }}
      >
        Track. Trust. Transform.
      </p>
    </div>
  );
}

function Spinner({ size = 'h-4 w-4' }) {
  return (
    <svg
      className={`animate-spin ${size} text-white`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }) {
  const highlights = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Track',
      desc: 'Monitor AI mentions',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      label: 'Trust',
      desc: 'Fix hallucinations',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
      label: 'Transform',
      desc: 'Improve AI visibility',
    },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="text-3xl font-extrabold text-slate-900 mb-3 leading-tight"
        style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
      >
        Welcome to T3!
      </h1>
      <p
        className="text-slate-500 mb-8 text-sm leading-relaxed max-w-xs"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Let's get your brand tracked in under 2 minutes.
      </p>

      <div className="flex items-stretch gap-3 w-full mb-8">
        {highlights.map((h, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))' }}
          >
            <div
              className="flex items-center justify-center rounded-xl text-violet-600"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.12))',
              }}
              aria-hidden="true"
            >
              {h.icon}
            </div>
            <span
              className="text-sm font-bold text-slate-800"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {h.label}
            </span>
            <span
              className="text-[11px] text-slate-400 leading-tight text-center"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {h.desc}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className={GRADIENT_BTN}
        style={GRADIENT_STYLE}
      >
        Let's Go
      </button>
    </div>
  );
}

// ─── Step 1: Choose Plan ──────────────────────────────────────────────────────

function StepChoosePlan({ session, onNext, onBack }) {
  const [loading, setLoading] = useState(null); // plan id currently loading, or 'skip'
  const [error, setError] = useState('');

  const isAnyLoading = loading !== null;

  async function handleSelectPlan(planId) {
    setError('');
    setLoading(planId);
    try {
      const userId = session?.user?.id;
      if (userId) {
        const existing = await getSubscription(userId);
        if (!existing) {
          await createTrialSubscription(userId, planId);
        }
      }
      onNext();
    } catch (err) {
      setError(err.message || 'Could not start trial. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleSkip() {
    setError('');
    setLoading('skip');
    try {
      const userId = session?.user?.id;
      if (userId) {
        const existing = await getSubscription(userId);
        if (!existing) {
          await createTrialSubscription(userId, 1); // Starter plan trial
        }
      }
      onNext();
    } catch (err) {
      setError(err.message || 'Could not start trial. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h2
        className="text-2xl font-extrabold text-slate-900 mb-1 text-center"
        style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
      >
        Choose your plan
      </h2>
      <p
        className="text-slate-400 text-sm text-center mb-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Start your 14-day free trial — no credit card required.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border transition-all duration-200"
            style={{
              borderColor: plan.highlight ? '#8B5CF6' : '#E2E8F0',
              background: plan.highlight
                ? 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(236,72,153,0.04))'
                : '#FFFFFF',
              boxShadow: plan.highlight ? '0 0 0 1px #8B5CF6' : 'none',
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-base font-bold text-slate-900"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
                      >
                        POPULAR
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs text-slate-400 mt-0.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {plan.description}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <span
                    className="text-xl font-extrabold text-slate-900"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-xs text-slate-400"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1 text-xs text-slate-500"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <svg className="h-3 w-3 text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isAnyLoading}
                className="w-full py-2.5 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-60"
                style={
                  plan.highlight
                    ? { ...GRADIENT_STYLE, boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)' }
                    : {
                        background: 'transparent',
                        border: '1.5px solid #E2E8F0',
                        color: '#64748B',
                        cursor: isAnyLoading ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }
                }
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Starting trial...
                  </span>
                ) : (
                  'Start 14-Day Free Trial'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center mb-3" role="alert" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSkip}
        disabled={isAnyLoading}
        className="w-full text-xs text-slate-400 hover:text-violet-600 transition-colors py-1 disabled:opacity-50"
        style={{ fontFamily: "'DM Sans', sans-serif", background: 'none', border: 'none', cursor: isAnyLoading ? 'not-allowed' : 'pointer' }}
      >
        {loading === 'skip' ? (
          <span className="flex items-center justify-center gap-1.5">
            <svg className="animate-spin h-3 w-3 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting free trial...
          </span>
        ) : (
          'Skip — start with free trial'
        )}
      </button>

      <div className="flex justify-center mt-3">
        <button
          onClick={onBack}
          disabled={isAnyLoading}
          className="text-xs text-slate-500 hover:text-violet-600 transition-colors disabled:opacity-50"
          style={{ fontFamily: "'DM Sans', sans-serif", background: 'none', border: 'none', cursor: isAnyLoading ? 'not-allowed' : 'pointer' }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Add Your Brand ───────────────────────────────────────────────────

function StepAddBrand({ session, onNext, onBack }) {
  const [brandName, setBrandName] = useState(session?.user?.user_metadata?.company_name || '');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!brandName.trim()) {
      setError('Brand name is required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data: newBrand, error: insertError } = await supabase
        .from('brands')
        .insert({
          name: brandName.trim(),
          website: website.trim() || null,
          industry: industry || null,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (newBrand.website) {
        setLoading(false);
        setDiscovering(true);
        // Give the discovery state a moment to render, then move on
        await new Promise((res) => setTimeout(res, 1200));
        setDiscovering(false);
      }

      onNext(newBrand);
    } catch (err) {
      setError(err.message || 'Failed to create brand. Please try again.');
      setLoading(false);
      setDiscovering(false);
    }
  }

  if (discovering) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          aria-hidden="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
        <p
          className="text-base font-bold text-slate-800 mb-1"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Discovering products...
        </p>
        <p
          className="text-sm text-slate-400"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Scanning your website for product information.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2
        className="text-2xl font-extrabold text-slate-900 mb-1 text-center"
        style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
      >
        Add your brand
      </h2>
      <p
        className="text-slate-400 text-sm text-center mb-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Tell us about the brand you want to track.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="ob-brand-name"
              className="block text-xs font-semibold text-slate-500 mb-1.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Brand Name <span className="text-red-400">*</span>
            </label>
            <input
              id="ob-brand-name"
              type="text"
              placeholder="e.g. Acme Inc."
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
              autoFocus
              className={INPUT_CLASS}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>

          <div>
            <label
              htmlFor="ob-website"
              className="block text-xs font-semibold text-slate-500 mb-1.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Website URL
              <span className="ml-1 text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="ob-website"
              type="url"
              placeholder="https://acme.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={INPUT_CLASS}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>

          <div>
            <label
              htmlFor="ob-industry"
              className="block text-xs font-semibold text-slate-500 mb-1.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Industry
            </label>
            <div className="relative">
              <select
                id="ob-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className={SELECT_CLASS}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select an industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {error && (
          <p
            className="mt-3 text-sm text-red-500"
            role="alert"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`mt-6 ${GRADIENT_BTN}`}
          style={{ ...GRADIENT_STYLE, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner />
              Creating brand...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      <div className="flex justify-center mt-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-violet-600 transition-colors disabled:opacity-50"
          style={{ fontFamily: "'DM Sans', sans-serif", background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: First Scan ───────────────────────────────────────────────────────

function StepFirstScan({ brand, onComplete, onBack }) {
  const [scanPhase, setScanPhase] = useState('scanning'); // 'scanning' | 'done'
  const [currentPlatformIdx, setCurrentPlatformIdx] = useState(0);
  const [scanResults, setScanResults] = useState(null);
  const [scanError, setScanError] = useState('');
  const hasScanRun = useRef(false);

  useEffect(() => {
    if (hasScanRun.current) return;
    hasScanRun.current = true;

    async function runScan() {
      // Animate through platform labels while the real scan runs
      const interval = setInterval(() => {
        setCurrentPlatformIdx((prev) => {
          if (prev >= SCAN_PLATFORMS.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);

      try {
        const queryText = `Tell me about ${brand.name}`;
        const results = await runVisibilityScan(queryText, brand);
        clearInterval(interval);
        setCurrentPlatformIdx(SCAN_PLATFORMS.length - 1);
        setScanResults(results);
        setScanPhase('done');
      } catch (err) {
        clearInterval(interval);
        setScanError(err.message || 'Scan failed. You can run a manual scan from the dashboard.');
        setScanPhase('done');
      }
    }

    runScan();
  }, [brand]);

  const totalClaims = scanResults?.visibility_summary?.total_claims_extracted ?? 0;
  const attentionCount =
    (scanResults?.visibility_summary?.total_hallucinations ?? 0) +
    (scanResults?.visibility_summary?.platforms_checked ?? 4) -
    (scanResults?.visibility_summary?.platforms_mentioned ?? 0);
  const clamped = Math.max(0, attentionCount);

  if (scanPhase === 'scanning') {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <h2
          className="text-2xl font-extrabold text-slate-900 mb-2"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
        >
          Running your first scan
        </h2>
        <p
          className="text-slate-400 text-sm mb-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Checking how AI platforms describe <strong className="text-slate-700">{brand.name}</strong>...
        </p>

        <div className="w-full flex flex-col gap-3 mb-6">
          {SCAN_PLATFORMS.map((platform, i) => {
            const isDone = i < currentPlatformIdx;
            const isActive = i === currentPlatformIdx;
            return (
              <div
                key={platform}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))'
                    : isDone
                    ? 'rgba(16, 185, 129, 0.06)'
                    : '#F8FAFC',
                  border: isActive ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid transparent',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDone
                      ? '#10B981'
                      : isActive
                      ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                      : '#E2E8F0',
                  }}
                  aria-hidden="true"
                >
                  {isDone ? (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : isActive ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: isDone ? '#10B981' : isActive ? '#7C3AED' : '#94A3B8',
                  }}
                >
                  {isDone ? `${platform} scanned` : isActive ? `Scanning ${platform}...` : platform}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Done state
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2
        className="text-2xl font-extrabold text-slate-900 mb-2"
        style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
      >
        Scan complete!
      </h2>

      {scanError ? (
        <p
          className="text-slate-400 text-sm mb-6 max-w-xs"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {scanError}
        </p>
      ) : (
        <p
          className="text-slate-500 text-sm mb-6 max-w-xs leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          We found{' '}
          <strong className="text-slate-800">{totalClaims} claim{totalClaims !== 1 ? 's' : ''}</strong>{' '}
          about <strong className="text-slate-800">{brand.name}</strong>
          {clamped > 0 ? (
            <>, <strong className="text-pink-600">{clamped} need{clamped === 1 ? 's' : ''} attention</strong></>
          ) : (
            <> — everything looks accurate</>
          )}.
        </p>
      )}

      {!scanError && scanResults && (
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {[
            {
              value: `${scanResults.visibility_summary?.inclusion_rate ?? 0}%`,
              label: 'Inclusion Rate',
              color: '#7C3AED',
            },
            {
              value: scanResults.visibility_summary?.platforms_mentioned ?? 0,
              label: 'Platforms found',
              color: '#10B981',
            },
            {
              value: scanResults.visibility_summary?.total_hallucinations ?? 0,
              label: 'Hallucinations',
              color: clamped > 0 ? '#EC4899' : '#10B981',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl py-3 px-2 flex flex-col items-center"
              style={{ background: '#F8FAFC' }}
            >
              <span
                className="text-xl font-extrabold"
                style={{ fontFamily: "'Outfit', sans-serif", color: stat.color }}
              >
                {stat.value}
              </span>
              <span
                className="text-[11px] text-slate-400 text-center leading-tight mt-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onComplete}
        className={GRADIENT_BTN}
        style={GRADIENT_STYLE}
      >
        View Dashboard
      </button>

      <div className="flex justify-center mt-3">
        <button
          onClick={onBack}
          className="text-xs text-slate-500 hover:text-violet-600 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif", background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────

export default function Onboarding({ session, onComplete }) {
  const [step, setStep] = useState(0);
  const [createdBrand, setCreatedBrand] = useState(null);

  function goNext(data) {
    if (step === 2 && data) {
      setCreatedBrand(data);
    }
    setStep((prev) => prev + 1);
  }

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: '#F5F7FA' }}
    >
      {/* Decorative blur blobs — matches AuthPage */}
      <div
        className="absolute top-[-80px] left-[-100px] w-[420px] h-[420px] rounded-full bg-purple-400/30 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-60px] right-[-80px] w-[380px] h-[380px] rounded-full bg-purple-400/30 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-[40%] left-[60%] w-[260px] h-[260px] rounded-full bg-pink-400/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative z-10 w-full animate-fade-in"
        style={{
          maxWidth: '560px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 8px 48px rgba(0, 0, 0, 0.10), 0 2px 12px rgba(124, 58, 237, 0.08)',
          margin: '24px',
          padding: '40px 36px 36px',
        }}
      >
        <LogoRow />
        <ProgressDots step={step} total={4} />

        {/* Step panels */}
        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && <StepChoosePlan session={session} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepAddBrand session={session} onNext={goNext} onBack={() => setStep(1)} />}
        {step === 3 && createdBrand ? (
          <StepFirstScan brand={createdBrand} onComplete={onComplete} onBack={() => setStep(2)} />
        ) : step === 3 && !createdBrand ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Something went wrong creating your brand. Please try again.
            </p>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', cursor: 'pointer' }}
            >
              Go Back
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
