import { useState, useEffect } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const priorityBadge = {
  critical: 'badge-red',
  high: 'badge-amber',
  maintain: 'badge-green',
};

const priorityBorder = {
  critical: { borderColor: 'rgba(239,68,68,0.25)' },
  high: { borderColor: 'rgba(245,158,11,0.25)' },
  maintain: { borderColor: 'rgba(16,185,129,0.25)' },
};

function SkeletonCard({ className = '' }) {
  return (
    <div className={`card p-5 animate-pulse ${className}`}>
      <div className="h-3 bg-slate-200 rounded-full w-1/3 mb-4" />
      <div className="h-8 bg-slate-200 rounded-full w-1/2 mb-3" />
      <div className="h-2 bg-slate-200 rounded-full w-2/3" />
    </div>
  );
}

function SkeletonSegment() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1 mr-8">
          <div className="h-3 bg-slate-200 rounded-full w-1/3" />
          <div className="h-2 bg-slate-200 rounded-full w-2/3" />
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-12" />
      </div>
      <div className="h-2 bg-slate-200 rounded-full w-full mb-4" />
      <div className="flex gap-4">
        <div className="h-2 bg-slate-200 rounded-full w-1/4" />
        <div className="h-2 bg-slate-200 rounded-full w-1/3" />
      </div>
    </div>
  );
}

function ReachBar({ rate }) {
  const isHigh = rate >= 50;
  const isMed = rate > 0 && rate < 50;

  const gradientClass = isHigh
    ? 'bg-gradient-to-r from-violet-500 to-pink-500'
    : isMed
    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
    : 'bg-gradient-to-r from-red-500 to-rose-500';

  return (
    <div className="progress-bar h-2">
      <div
        className={`progress-fill transition-all duration-700 ${gradientClass}`}
        style={{ width: `${Math.max(rate, 2)}%` }}
      />
    </div>
  );
}

const DEMO_DATA = {
  reached_audiences: [
    { segment: 'Tech-savvy professionals', reach_rate: 78 },
    { segment: 'Enterprise decision makers', reach_rate: 65 },
  ],
  underserved_audiences: [
    { segment: 'Small business owners', reach_rate: 32 },
    { segment: 'International markets', reach_rate: 18 },
  ],
  invisible_audiences: [
    { segment: 'Gen Z consumers', reach_rate: 0 },
  ],
  segments: [
    {
      segment: 'Tech-Savvy Professionals',
      description: 'Software engineers, data scientists, and IT managers who evaluate tools for their teams.',
      reach_rate: 78,
      demographics: '25-45, urban, high income',
      ai_behavior: 'Ask detailed technical comparison questions',
      sample_queries: ['best tools for data pipeline', 'enterprise API comparison 2026'],
    },
    {
      segment: 'Enterprise Decision Makers',
      description: 'CTOs, VPs of Engineering, and procurement leads evaluating solutions at scale.',
      reach_rate: 65,
      demographics: '35-55, corporate, director+',
      ai_behavior: 'Focus on ROI, compliance, and integration capabilities',
      sample_queries: ['enterprise security compliance tools', 'SOC 2 certified platforms'],
    },
    {
      segment: 'Small Business Owners',
      description: 'Founders and operators of companies with 1-50 employees seeking affordable solutions.',
      reach_rate: 32,
      demographics: '28-50, varied locations, budget-conscious',
      ai_behavior: 'Price-sensitive queries, seek simplicity and quick setup',
      sample_queries: ['affordable business tools for startups', 'easy to use project management'],
    },
    {
      segment: 'International Markets',
      description: 'Users outside North America searching in local languages or regional context.',
      reach_rate: 18,
      demographics: 'Global, non-English primary, varied',
      ai_behavior: 'Search in local languages, prioritize regional availability',
      sample_queries: ['outils de gestion de projet', 'herramientas empresariales'],
    },
    {
      segment: 'Gen Z Consumers',
      description: 'Digital-native users aged 18-26 who discover brands through social and AI assistants.',
      reach_rate: 0,
      demographics: '18-26, digital-first, mobile-heavy',
      ai_behavior: 'Conversational queries, voice search, TikTok-style discovery',
      sample_queries: ['what app should I use for X', 'is this brand legit'],
    },
  ],
  recommendations: [
    { priority: 'critical', segment: 'Gen Z Consumers', action: 'Create conversational content optimized for AI assistants', detail: 'Gen Z users are completely invisible in AI responses. Build FAQ-style content, social proof snippets, and conversational landing pages that AI models can easily reference.' },
    { priority: 'high', segment: 'International Markets', action: 'Localize key pages and structured data', detail: 'Only 18% reach in international markets. Translate product pages, create region-specific case studies, and add hreflang tags for multilingual SEO.' },
    { priority: 'maintain', segment: 'Tech-Savvy Professionals', action: 'Continue publishing technical deep-dives', detail: 'Strong 78% reach. Maintain momentum with regular technical blog posts, API documentation updates, and developer community engagement.' },
  ],
};

export default function Audience({ brand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${BACKEND}/api/audience/${brand.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => {
        // Fallback to demo data when backend is unreachable
        setData(DEMO_DATA);
        setLoading(false);
      });
  }, [brand.id]);

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-sm">{error}</div>
  );
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-slate-200 rounded-full w-48" />
          <div className="h-3 bg-slate-200 rounded-full w-72" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Segment skeletons */}
        <div className="space-y-3">
          <SkeletonSegment />
          <SkeletonSegment />
          <SkeletonSegment />
        </div>
      </div>
    );
  }

  const reached = data?.reached_audiences || [];
  const underserved = data?.underserved_audiences || [];
  const invisible = data?.invisible_audiences || [];
  const segments = data?.segments || [];
  const recommendations = data?.recommendations || [];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div style={{ animationDelay: '0ms' }} className="animate-fade-in">
        <h2
          className="text-2xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: 'Outfit' }}
        >
          Audience Targeting
        </h2>
        <p className="text-sm text-slate-600">
          Which customers is AI reaching for{' '}
          <span className="text-slate-700 font-medium">{brand.name}</span>?
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Reached */}
        <div
          className="card glow-green p-6 text-center animate-fade-in"
          style={{ animationDelay: '80ms' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-medium">
            Reached
          </p>
          <p
            className="text-4xl font-bold text-emerald-600 leading-none mb-2"
            style={{ fontFamily: 'Outfit' }}
          >
            {reached.length}
          </p>
          <p className="text-[11px] text-slate-500">segments at 50%+ reach</p>
        </div>

        {/* Underserved */}
        <div
          className="card glow-amber p-6 text-center animate-fade-in"
          style={{ animationDelay: '130ms' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-medium">
            Underserved
          </p>
          <p
            className="text-4xl font-bold text-amber-600 leading-none mb-2"
            style={{ fontFamily: 'Outfit' }}
          >
            {underserved.length}
          </p>
          <p className="text-[11px] text-slate-500">segments at 1–49% reach</p>
        </div>

        {/* Invisible */}
        <div
          className="card glow-red p-6 text-center animate-fade-in"
          style={{ animationDelay: '180ms' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-medium">
            Invisible
          </p>
          <p
            className="text-4xl font-bold text-red-600 leading-none mb-2"
            style={{ fontFamily: 'Outfit' }}
          >
            {invisible.length}
          </p>
          <p className="text-[11px] text-slate-500">segments at 0% reach</p>
        </div>
      </div>

      {/* ── Segment Cards ── */}
      <div className="space-y-3">
        {segments.map((seg, i) => {
          const isHigh = seg.reach_rate >= 50;
          const isMed = seg.reach_rate > 0 && seg.reach_rate < 50;

          const rateColor = isHigh
            ? 'text-emerald-600'
            : isMed
            ? 'text-amber-600'
            : 'text-red-600';

          return (
            <div
              key={i}
              className="card p-5 animate-fade-in"
              style={{ animationDelay: `${240 + i * 60}ms` }}
            >
              {/* Top row: name + reach rate */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-4">
                  <h4
                    className="text-slate-800 font-semibold text-sm leading-snug"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    {seg.segment}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {seg.description}
                  </p>
                </div>
                <span
                  className={`text-2xl font-bold shrink-0 ${rateColor}`}
                  style={{ fontFamily: 'Outfit' }}
                >
                  {seg.reach_rate}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <ReachBar rate={seg.reach_rate} />
              </div>

              {/* Meta row */}
              <div className="inner-card px-4 py-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500">Demographics: </span>
                  <span className="text-slate-700">{seg.demographics}</span>
                </div>
                <div>
                  <span className="text-slate-500">AI behavior: </span>
                  <span className="text-slate-700">{seg.ai_behavior}</span>
                </div>
              </div>

              {/* Sample query pills */}
              {seg.sample_queries?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {seg.sample_queries.map((q, j) => (
                    <span
                      key={j}
                      className="inner-card px-3 py-1 text-slate-500 text-[11px] rounded-lg
                                 cursor-default transition-all duration-200
                                 hover:border-violet-300 hover:text-violet-600"
                    >
                      "{q}"
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div
          className="card p-6 animate-fade-in"
          style={{ animationDelay: `${240 + segments.length * 60 + 60}ms` }}
        >
          <h3
            className="text-base font-semibold text-slate-800 mb-5"
            style={{ fontFamily: 'Outfit' }}
          >
            Targeting Recommendations
          </h3>

          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={`inner-card p-4 border animate-fade-in transition-all duration-200
                            hover:border-slate-300`}
                style={{
                  animationDelay: `${300 + segments.length * 60 + i * 50}ms`,
                  ...(priorityBorder[rec.priority] || {}),
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider
                                ${priorityBadge[rec.priority]}`}
                    style={{ fontFamily: 'Outfit' }}
                  >
                    {rec.priority}
                  </span>
                  <span className="text-[11px] text-slate-500">{rec.segment}</span>
                </div>
                <p className="text-sm text-slate-800 font-medium mb-1 leading-snug">
                  {rec.action}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
