import { useState, useEffect } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const DEMO_DATA = {
  ethics_score: {
    grade: 'B',
    overall: 76,
    components: {
      accuracy: 82,
      transparency: 71,
      fairness: 78,
      harm_prevention: 73,
    },
  },
  monitoring: {
    total_claims_analyzed: 847,
    hallucinations_detected: 23,
    outdated_info_detected: 14,
    hallucination_trend: { direction: 'improving', change: -12 },
    most_common_hallucination: 'fabricated product features',
    monitoring_frequency: 'Every 6 hours',
  },
  actions: {
    action_pipeline: [
      { step: 1, action: 'Detect', description: 'AI continuously monitors brand mentions across all major AI platforms for inaccuracies and hallucinations' },
      { step: 2, action: 'Classify', description: 'Each issue is classified by severity, type, and potential business impact using our proprietary scoring model' },
      { step: 3, action: 'Alert', description: 'Stakeholders are notified via webhook, email, or Slack with full context and recommended actions' },
      { step: 4, action: 'Correct', description: 'Automated correction requests are filed with AI platforms along with verified source documentation' },
    ],
    total_alerts: 37,
    resolved: 31,
    resolution_rate: 84,
  },
  trust_improvement: {
    period: 'Last 90 days',
    brand_trust_score: { current: '8.2/10', change: 0.6, direction: 'improved' },
    accuracy_score: { current: '82%', change: 5, direction: 'improved' },
    hallucination_rate: { current: '2.7%', change: -1.4, direction: 'improved' },
    inclusion_rate: { current: '74%', change: 3, direction: 'improved' },
    business_impact_indicators: [
      'Brand mention accuracy improved 5% across ChatGPT and Gemini responses',
      'Hallucination rate decreased from 4.1% to 2.7% after automated corrections',
      'Customer support tickets related to AI misinformation dropped by 22%',
      'Brand visibility score increased in 3 of 4 target audience segments',
    ],
  },
};

export default function Ethics({ brand }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!import.meta.env.VITE_BACKEND_URL) {
      setReport(DEMO_DATA);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    fetch(`${BACKEND}/api/ethics/report/${brand.id}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setReport(d); setLoading(false); })
      .catch(() => {
        setReport(DEMO_DATA);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeout));
  }, [brand.id]);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-6 w-48 rounded-lg bg-slate-200 mb-2" />
        <div className="h-4 w-72 rounded-lg bg-slate-200" />
      </div>
      {/* Score row skeleton */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5 h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      {/* Section skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-6 h-52 rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  if (!report) return null;

  const score = report.ethics_score;
  const monitoring = report.monitoring;
  const actions = report.actions;
  const trust = report.trust_improvement;

  // Grade -> text color
  const gradeText = {
    A: 'text-emerald-600',
    B: 'text-violet-600',
    C: 'text-amber-600',
    D: 'text-red-600',
  };

  // Component score -> gradient bar colors
  const barGradient = (val) =>
    val >= 75
      ? 'from-emerald-500 to-teal-400'
      : val >= 50
      ? 'from-amber-500 to-yellow-400'
      : 'from-red-500 to-rose-400';

  const componentText = (val) =>
    val >= 75 ? 'text-emerald-600' : val >= 50 ? 'text-amber-600' : 'text-red-600';

  const trendColor = (dir) =>
    dir === 'improving' ? 'text-emerald-600' : 'text-red-600';

  const changeColor = (dir) =>
    dir === 'improved' ? 'text-emerald-600' : dir === 'stable' ? 'text-slate-400' : 'text-red-600';

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '0ms' }}>
        <h2
          className="text-2xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Ethics Monitor
        </h2>
        <p className="text-sm text-slate-500">Ethics compliance report for {brand.name}</p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {/* Grade card */}
        <div
          className="card rounded-2xl p-5 text-center col-span-1 animate-fade-in flex flex-col items-center justify-center"
          style={{ animationDelay: '60ms' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Ethics Grade
          </p>
          <p
            className={`text-6xl font-bold ${gradeText[score.grade]}`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {score.grade}
          </p>
          <p className="text-sm text-slate-500 mt-2 font-medium">{score.overall}/100</p>
        </div>

        {/* Component score cards */}
        {Object.entries(score.components).map(([key, val], idx) => (
          <div
            key={key}
            className="card rounded-2xl p-5 text-center animate-fade-in flex flex-col justify-between"
            style={{ animationDelay: `${(idx + 2) * 60}ms` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 capitalize leading-tight">
              {key.replace(/_/g, ' ')}
            </p>
            <p
              className={`text-2xl font-bold ${componentText(val)}`}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {val}
            </p>
            {/* Gradient progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-1.5 rounded-full bg-gradient-to-r ${barGradient(val)}`}
                style={{ width: `${val}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Section 1: How We Monitor */}
      <div
        className="card rounded-2xl p-6 mb-6 animate-fade-in"
        style={{ animationDelay: '360ms' }}
      >
        <h3
          className="text-base font-bold text-slate-800 mb-0.5"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          How We Monitor Issues Over Time
        </h3>
        <p className="text-xs text-slate-500 mb-5">Compliance Monitoring</p>

        <div className="grid grid-cols-4 gap-4 mb-4">
          {/* Claims Analyzed */}
          <div className="inner-card p-4 text-center">
            <p
              className="text-2xl font-bold text-violet-600"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {monitoring.total_claims_analyzed}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Claims Analyzed</p>
          </div>

          {/* Hallucinations */}
          <div className="inner-card p-4 text-center">
            <p
              className="text-2xl font-bold text-red-600"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {monitoring.hallucinations_detected}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Hallucinations</p>
          </div>

          {/* Outdated Info */}
          <div className="inner-card p-4 text-center">
            <p
              className="text-2xl font-bold text-amber-600"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {monitoring.outdated_info_detected}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Outdated Info</p>
          </div>

          {/* Trend */}
          <div className="inner-card p-4 text-center">
            <p
              className={`text-2xl font-bold ${trendColor(monitoring.hallucination_trend.direction)}`}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {monitoring.hallucination_trend.direction === 'improving' ? '↓' : '↑'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 capitalize">
              {monitoring.hallucination_trend.direction}
            </p>
          </div>
        </div>

        {/* Detail row */}
        <div className="inner-card p-4 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wider">
              Most Common Hallucination
            </p>
            <p className="text-sm text-slate-800 capitalize font-medium">
              {monitoring.most_common_hallucination}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wider">
              Monitoring Frequency
            </p>
            <p className="text-sm text-violet-600 font-medium">{monitoring.monitoring_frequency}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Actions When Problems Found */}
      <div
        className="card rounded-2xl p-6 mb-6 animate-fade-in"
        style={{ animationDelay: '420ms' }}
      >
        <h3
          className="text-base font-bold text-slate-800 mb-0.5"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Actions When Problems Are Found
        </h3>
        <p className="text-xs text-slate-500 mb-5">Action Pipeline</p>

        {/* Action pipeline */}
        <div className="flex gap-3 mb-5 items-stretch">
          {actions.action_pipeline.map((step, i) => (
            <div key={i} className="flex-1 flex items-center gap-3">
              {/* Step card */}
              <div className="inner-card p-4 flex-1 flex flex-col items-center text-center">
                {/* Gradient numbered circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-3 text-xs font-bold text-white flex-shrink-0 bg-gradient-to-r from-violet-500 to-pink-500"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {step.step}
                </div>
                <p className="text-xs font-semibold text-slate-800 mb-1 leading-tight">{step.action}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                  {step.description.slice(0, 50)}...
                </p>
                <span className="badge-green inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  Automated
                </span>
              </div>

              {/* Connecting arrow */}
              {i < actions.action_pipeline.length - 1 && (
                <div className="flex-shrink-0 flex flex-col items-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 10h10M11 6l4 4-4 4"
                      stroke="url(#arr)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <defs>
                      <linearGradient id="arr" x1="5" y1="10" x2="15" y2="10" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#7C3AED" />
                        <stop offset="1" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Alert summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="inner-card p-4 text-center">
            <p
              className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {actions.total_alerts}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total Alerts</p>
          </div>
          <div className="inner-card p-4 text-center">
            <p
              className="text-2xl font-bold text-emerald-600"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {actions.resolved}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Resolved</p>
          </div>
          <div className="inner-card p-4 text-center">
            <p
              className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {actions.resolution_rate}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Resolution Rate</p>
          </div>
        </div>
      </div>

      {/* Section 3: Proving Trust Improvement */}
      <div
        className="card rounded-2xl p-6 animate-fade-in"
        style={{ animationDelay: '480ms' }}
      >
        <h3
          className="text-base font-bold text-slate-800 mb-0.5"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Proving Improved Customer Trust
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Brand Trust Analysis &nbsp;|&nbsp; {trust.period}
        </p>

        {trust.brand_trust_score && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Trust Score', data: trust.brand_trust_score },
              { label: 'Accuracy', data: trust.accuracy_score },
              { label: 'Hallucination', data: trust.hallucination_rate },
              { label: 'Visibility', data: trust.inclusion_rate },
            ].map((item, i) => (
              <div
                key={i}
                className="inner-card p-4 animate-fade-in"
                style={{ animationDelay: `${540 + i * 60}ms` }}
              >
                <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wider">
                  {item.label}
                </p>
                <p
                  className="text-xl font-bold text-slate-800"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {item.data.current}
                </p>
                <p className={`text-xs mt-1 font-medium ${changeColor(item.data.direction)}`}>
                  {item.data.change > 0 ? '+' : ''}{item.data.change}&nbsp;
                  <span className="text-slate-500 font-normal">({item.data.direction})</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {trust.business_impact_indicators && (
          <div className="inner-card p-4">
            <p className="text-[11px] text-slate-500 mb-3 uppercase tracking-wider">
              Business Impact
            </p>
            <ul className="space-y-2">
              {trust.business_impact_indicators.map((indicator, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  {/* Gradient bullet dot */}
                  <span
                    className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                  />
                  <p className="text-xs text-slate-600 leading-relaxed">{indicator}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
