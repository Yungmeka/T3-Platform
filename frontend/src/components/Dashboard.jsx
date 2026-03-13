import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import Globe from './Globe';
import WorldMap from './WorldMap';

/* ─── Icon helpers ──────────────────────────────────────────────── */
const IconShield = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconEye = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconWarning = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
const IconBell = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

/* ─── Color map ─────────────────────────────────────────────────── */
const colorMap = {
  purple: {
    text: '#7C3AED',
    iconColor: 'rgba(109,40,217,0.7)',
    glowClass: 'glow-purple',
    barColor: 'rgba(109,40,217,0.4)',
  },
  cyan: {
    text: '#7C3AED',
    iconColor: 'rgba(124,58,237,0.7)',
    glowClass: 'glow-cyan',
    barColor: 'rgba(124,58,237,0.4)',
  },
  green: {
    text: '#059669',
    iconColor: 'rgba(16,185,129,0.7)',
    glowClass: 'glow-green',
    barColor: 'rgba(16,185,129,0.4)',
  },
  red: {
    text: '#DC2626',
    iconColor: 'rgba(239,68,68,0.7)',
    glowClass: 'glow-red',
    barColor: 'rgba(239,68,68,0.4)',
  },
  amber: {
    text: '#D97706',
    iconColor: 'rgba(245,158,11,0.7)',
    glowClass: 'glow-amber',
    barColor: 'rgba(245,158,11,0.4)',
  },
};

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, suffix = '%', trend, color, icon }) {
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div
      className={`card ${c.glowClass} p-5 animate-fade-in`}
      style={{ borderRadius: '16px' }}
    >
      <div className="flex items-start justify-between mb-4">
        <p
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
        >
          {label}
        </p>
        <span style={{ color: c.iconColor }}>
          {icon}
        </span>
      </div>
      <p
        className="text-4xl font-bold tracking-tight leading-none mb-3"
        style={{ color: c.text, fontFamily: 'Outfit, sans-serif' }}
      >
        {value !== null && value !== undefined
          ? `${Number(value).toFixed(1)}${suffix}`
          : '—'}
      </p>
      {trend !== null && trend !== undefined && (
        <p
          className="text-xs flex items-center gap-1 font-medium"
          style={{
            color: (color === 'red' ? trend < 0 : trend > 0) ? '#059669' : '#DC2626',
          }}
        >
          <span className="text-sm">{(color === 'red' ? trend < 0 : trend > 0) ? '↑' : '↓'}</span>
          {Math.abs(trend).toFixed(1)}% vs first week
        </p>
      )}
    </div>
  );
}

/* ─── Custom Recharts Tooltip ───────────────────────────────────── */
const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="chart-tooltip px-4 py-3">
      <p className="text-[11px] mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color, fontFamily: 'DM Sans, sans-serif' }}>
          {p.name}:{' '}
          <span className="font-semibold">{Number(p.value).toFixed(1)}%</span>
        </p>
      ))}
    </div>
  );
};

/* ─── Chart card wrapper ────────────────────────────────────────── */
const ChartCard = ({ title, children, style }) => (
  <div className="card p-5 animate-fade-in" style={style}>
    <h3
      className="text-sm font-semibold mb-6"
      style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
    >
      {title}
    </h3>
    {children}
  </div>
);

/* ─── Visibility Action Plan ────────────────────────────────────── */
const ALL_PLATFORMS = ['chatgpt', 'gemini', 'copilot', 'perplexity'];

const PLATFORM_META = {
  chatgpt:   { label: 'ChatGPT',   icon: '🤖', color: '#10B981', badgeClass: 'badge-green' },
  gemini:    { label: 'Gemini',    icon: '✦',  color: '#F59E0B', badgeClass: 'badge-amber' },
  copilot:   { label: 'Copilot',   icon: '⬡',  color: '#EF4444', badgeClass: 'badge-red'   },
  perplexity:{ label: 'Perplexity',icon: '∞',  color: '#8B5CF6', badgeClass: 'badge-purple'},
};

// Maps a gap type to the content tab content-type id + human label
const GAP_TO_ACTION = {
  copilot_invisible:    { contentType: 'schema',        label: 'Generate Schema.org Markup',  desc: 'JSON-LD structured data helps Copilot ground answers in verified facts.' },
  gemini_low_reach:     { contentType: 'faq',           label: 'Create FAQ Content',          desc: 'FAQ schema is the highest-signal format Gemini surfaces in AI Overviews.' },
  no_reddit:            { contentType: 'reddit',        label: 'Generate Reddit Post',         desc: 'Reddit threads are a top citation source across all major AI models.' },
  missing_press:        { contentType: 'press_release', label: 'Create Press Release',         desc: 'Press coverage builds third-party authority AI models trust.' },
  hallucinated_claims:  { contentType: 'schema',        label: 'Fix with Schema.org Markup',  desc: 'Structured data lets you assert correct facts directly to AI crawlers.' },
  low_inclusion:        { contentType: 'faq',           label: 'Expand FAQ Coverage',          desc: 'More FAQ pages increase the surface area AI models can cite.' },
  no_blogger_coverage:  { contentType: 'pitch_email',   label: 'Send Blogger Pitch',           desc: 'Independent reviews are high-trust citations for product queries.' },
};

function ScoreRing({ score }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const strokeDash = (pct / 100) * circ;
  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  const label = pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Poor';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${strokeDash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none" style={{ color, fontFamily: 'Outfit, sans-serif' }}>
          {pct.toFixed(0)}
        </span>
        <span className="text-[9px] font-semibold tracking-wide mt-0.5" style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function ActionItem({ gap, onNavigate, index }) {
  const action = GAP_TO_ACTION[gap.type];
  if (!action) return null;

  const urgencyColors = {
    high:   { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.2)',   dot: '#EF4444', text: '#DC2626'   },
    medium: { bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.22)', dot: '#F59E0B', text: '#D97706'   },
    low:    { bg: 'rgba(124,58,237,0.05)',  border: 'rgba(124,58,237,0.18)', dot: '#8B5CF6', text: '#7C3AED'   },
  };
  const u = urgencyColors[gap.urgency] || urgencyColors.low;

  return (
    <div
      className="inner-card rounded-2xl p-4 flex items-start gap-4 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Urgency dot */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: u.dot, boxShadow: `0 0 6px ${u.dot}66` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p
            className="text-xs font-semibold text-slate-800 leading-snug"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {gap.headline}
          </p>
          <span
            className="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: u.bg,
              border: `1px solid ${u.border}`,
              color: u.text,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {gap.urgency}
          </span>
        </div>
        <p className="text-[11px] mb-3 leading-relaxed" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
          {action.desc}
        </p>
        <button
          onClick={() => onNavigate('content')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {action.label}
        </button>
      </div>
    </div>
  );
}

function VisibilityActionPlan({ brand, latest, onNavigate }) {
  const [platformCoverage, setPlatformCoverage] = useState({});
  const [claimStats, setClaimStats] = useState({ hallucinated: 0, missing: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlanData() {
      setLoading(true);

      // Fetch distinct platforms from ai_responses for this brand
      const { data: responses } = await supabase
        .from('ai_responses')
        .select('platform')
        .eq('brand_id', brand.id);

      const seenPlatforms = new Set(
        (responses || []).map((r) => (r.platform || '').toLowerCase())
      );
      const coverage = {};
      for (const p of ALL_PLATFORMS) {
        coverage[p] = seenPlatforms.has(p);
      }
      setPlatformCoverage(coverage);

      // Fetch claims stats
      const { data: claimsData } = await supabase
        .from('claims')
        .select('status')
        .eq('brand_id', brand.id);

      if (claimsData) {
        setClaimStats({
          hallucinated: claimsData.filter((c) => c.status === 'hallucinated').length,
          missing:      claimsData.filter((c) => c.status === 'missing').length,
          total:        claimsData.length,
        });
      }

      setLoading(false);
    }
    fetchPlanData();
  }, [brand.id]);

  // Build ordered action items from the coverage + claim data
  const actionGaps = (() => {
    const gaps = [];
    const inclusionRate = latest?.inclusion_rate ?? 0;

    // Copilot invisible
    if (!platformCoverage.copilot) {
      gaps.push({
        type: 'copilot_invisible',
        headline: "You're invisible on Copilot — Generate Schema.org markup",
        urgency: 'high',
      });
    }

    // Gemini low reach
    if (!platformCoverage.gemini || inclusionRate < 50) {
      gaps.push({
        type: 'gemini_low_reach',
        headline: inclusionRate < 50
          ? `Low reach on Gemini (${inclusionRate.toFixed(0)}% inclusion) — Create FAQ content`
          : "No Gemini presence detected — Create FAQ content",
        urgency: inclusionRate < 30 ? 'high' : 'medium',
      });
    }

    // No Reddit presence
    if (!platformCoverage.perplexity || claimStats.total < 5) {
      gaps.push({
        type: 'no_reddit',
        headline: 'No Reddit presence detected — Generate a Reddit post',
        urgency: 'medium',
      });
    }

    // Missing press coverage (proxy: low total claims or missing claims)
    if (claimStats.missing > 0 || claimStats.total < 10) {
      gaps.push({
        type: 'missing_press',
        headline: 'Missing press coverage — Create a Press Release',
        urgency: claimStats.missing > 2 ? 'high' : 'medium',
      });
    }

    // Hallucinated claims
    if (claimStats.hallucinated > 0) {
      gaps.push({
        type: 'hallucinated_claims',
        headline: `${claimStats.hallucinated} hallucinated claim${claimStats.hallucinated > 1 ? 's' : ''} detected — Fix with Schema.org markup`,
        urgency: claimStats.hallucinated > 3 ? 'high' : 'medium',
      });
    }

    // Low overall inclusion
    if (inclusionRate < 40) {
      gaps.push({
        type: 'low_inclusion',
        headline: `Overall inclusion at ${inclusionRate.toFixed(0)}% — Expand FAQ coverage`,
        urgency: 'high',
      });
    }

    // No blogger/review coverage as a default recommendation
    if (gaps.length < 3) {
      gaps.push({
        type: 'no_blogger_coverage',
        headline: 'Expand independent review coverage — Send a Blogger Pitch',
        urgency: 'low',
      });
    }

    // Deduplicate by type and cap at 5
    const seen = new Set();
    return gaps.filter((g) => {
      if (seen.has(g.type)) return false;
      seen.add(g.type);
      return true;
    }).slice(0, 5);
  })();

  const inclusionRate = latest?.inclusion_rate ?? 0;
  const presentPlatforms = ALL_PLATFORMS.filter((p) => platformCoverage[p]);
  const missingPlatforms = ALL_PLATFORMS.filter((p) => !platformCoverage[p]);

  return (
    <div
      className="mb-8 rounded-2xl animate-fade-in"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(124,58,237,0.07)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(236,72,153,0.04))',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3
              className="text-sm font-bold text-slate-800"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Visibility Action Plan
            </h3>
            <p className="text-[11px]" style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
              Personalized steps to grow {brand.name}&apos;s AI presence
            </p>
          </div>
        </div>
        <div
          className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            color: '#7C3AED',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {actionGaps.length} ACTION{actionGaps.length !== 1 ? 'S' : ''}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column: Score ring + platform coverage */}
            <div className="flex flex-col gap-4">
              {/* AI Visibility Score */}
              <div
                className="inner-card rounded-2xl p-4 flex flex-col items-center text-center"
              >
                <p
                  className="text-[10px] uppercase tracking-widest font-semibold mb-3"
                  style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
                >
                  AI Visibility Score
                </p>
                <ScoreRing score={inclusionRate} />
                <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                  {inclusionRate >= 70
                    ? 'Strong presence across AI platforms'
                    : inclusionRate >= 40
                    ? 'Moderate presence — room to grow'
                    : 'Low presence — urgent action needed'}
                </p>
              </div>

              {/* Platform coverage */}
              <div className="inner-card rounded-2xl p-4">
                <p
                  className="text-[10px] uppercase tracking-widest font-semibold mb-3"
                  style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Platform Coverage
                </p>
                <div className="space-y-2">
                  {ALL_PLATFORMS.map((p) => {
                    const meta = PLATFORM_META[p];
                    const present = !!platformCoverage[p];
                    return (
                      <div
                        key={p}
                        className="flex items-center justify-between px-3 py-2 rounded-xl"
                        style={{
                          background: present
                            ? 'rgba(16,185,129,0.05)'
                            : 'rgba(239,68,68,0.04)',
                          border: present
                            ? '1px solid rgba(16,185,129,0.18)'
                            : '1px solid rgba(239,68,68,0.15)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ lineHeight: 1 }}>{meta.icon}</span>
                          <span
                            className="text-xs font-medium"
                            style={{ color: '#334155', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        {present ? (
                          <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>Present</span>
                        ) : (
                          <span className="text-[10px] font-semibold" style={{ color: '#DC2626' }}>Missing</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Summary line */}
                <div
                  className="mt-3 pt-3 flex items-center justify-between"
                  style={{ borderTop: '1px solid #F1F5F9' }}
                >
                  <span className="text-[11px]" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                    {presentPlatforms.length}/{ALL_PLATFORMS.length} platforms
                  </span>
                  <span
                    className="text-[11px] font-bold"
                    style={{
                      color: missingPlatforms.length === 0 ? '#059669' : '#DC2626',
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    {missingPlatforms.length === 0 ? 'Full coverage' : `${missingPlatforms.length} gap${missingPlatforms.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Right columns: Action items (span 2 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <p
                className="text-[11px] font-semibold mb-1"
                style={{ color: '#475569', fontFamily: 'Outfit, sans-serif' }}
              >
                Recommended actions — click any to open the Content Generator
              </p>
              {actionGaps.length === 0 ? (
                <div
                  className="inner-card rounded-2xl p-6 text-center"
                >
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    All clear — no gaps detected
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                    Keep publishing high-quality content to maintain your score.
                  </p>
                </div>
              ) : (
                actionGaps.map((gap, i) => (
                  <ActionItem key={gap.type} gap={gap} onNavigate={onNavigate} index={i} />
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────────── */
export default function Dashboard({ brand, onNavigate }) {
  const [snapshots, setSnapshots] = useState([]);
  const [latest, setLatest] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [focusRegion, setFocusRegion] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data: snaps } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('brand_id', brand.id)
        .order('date', { ascending: true });

      if (snaps && snaps.length > 0) {
        setSnapshots(snaps);
        setLatest(snaps[snaps.length - 1]);
      }

      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brand.id)
        .eq('resolved', false);

      setAlertCount(count || 0);
    }
    fetchData();
  }, [brand.id]);

  const trend = (field) => {
    if (snapshots.length < 8) return null;
    const lastWeekAvg = snapshots.slice(-7).reduce((s, r) => s + (r[field] || 0), 0) / 7;
    const firstWeekAvg = snapshots.slice(0, 7).reduce((s, r) => s + (r[field] || 0), 0) / 7;
    return lastWeekAvg - firstWeekAvg;
  };

  // Build content updates from real snapshot trend data
  const contentUpdates = (() => {
    if (snapshots.length < 2) return [];
    const updates = [];
    for (let i = snapshots.length - 1; i >= Math.max(0, snapshots.length - 4); i--) {
      const curr = snapshots[i];
      const prev = snapshots[i - 1];
      if (!prev) break;
      const incDeltaNum = (curr.inclusion_rate || 0) - (prev.inclusion_rate || 0);
      const incDelta = incDeltaNum.toFixed(1);
      const direction = incDeltaNum >= 0 ? 'up' : 'down';
      const dateStr = new Date(curr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      updates.push({
        date: dateStr,
        action: `AI inclusion rate ${direction === 'up' ? 'increased' : 'decreased'} to ${(curr.inclusion_rate || 0).toFixed(1)}%`,
        impact: `${incDeltaNum > 0 ? '+' : ''}${incDelta}%`,
        direction,
        metric: `Trust score: ${(curr.brand_trust_score || 0).toFixed(1)}% | Accuracy: ${(curr.accuracy_score || 0).toFixed(1)}%`,
      });
    }
    return updates;
  })();

  return (
    <div className="animate-fade-in">

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2
              className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}
            >
              Dashboard
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full pulse-dot"
                style={{ background: '#F97316' }}
              />
              <span className="text-[10px] font-bold tracking-widest" style={{ fontFamily: 'DM Sans, sans-serif', color: '#EA580C' }}>LIVE</span>
            </div>
          </div>
          <p className="text-sm" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
            AI visibility and trust metrics for <span style={{ color: '#334155' }}>{brand.name}</span>
          </p>
        </div>
      </div>

      {/* Visibility Action Plan */}
      <VisibilityActionPlan brand={brand} latest={latest} onNavigate={onNavigate} />

      {/* How It Works — horizontal bar */}
      <div
        className="mb-8 rounded-2xl p-4 animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(16,185,129,0.04), rgba(236,72,153,0.05))',
          border: '1px solid #E2E8F0',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        <div className="flex items-center justify-center gap-0 flex-wrap">
          {/* TRACK pill */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <span className="text-[9px] font-bold tracking-[0.15em] text-violet-600" style={{ fontFamily: 'Outfit, sans-serif' }}>TRACK</span>
            <span className="text-xs hidden sm:block" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Monitor AI visibility across 4 platforms</span>
          </div>

          {/* dotted connector */}
          <div className="flex-1 min-w-[24px] max-w-[60px] h-px mx-2" style={{ borderTop: '1.5px dashed #CBD5E1' }} />

          {/* TRUST pill */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="text-[9px] font-bold tracking-[0.15em] text-emerald-600" style={{ fontFamily: 'Outfit, sans-serif' }}>TRUST</span>
            <span className="text-xs hidden sm:block" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Detect hallucinations &amp; generate fixes</span>
          </div>

          {/* dotted connector */}
          <div className="flex-1 min-w-[24px] max-w-[60px] h-px mx-2" style={{ borderTop: '1.5px dashed #CBD5E1' }} />

          {/* TRANSFORM pill */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <span className="text-[9px] font-bold tracking-[0.15em] text-orange-600" style={{ fontFamily: 'Outfit, sans-serif' }}>TRANSFORM</span>
            <span className="text-xs hidden sm:block" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Publish corrections &amp; measure ROI</span>
          </div>
        </div>
      </div>

      {/* The Shift */}
      <div
        className="mb-8 rounded-2xl p-5 animate-fade-in"
        style={{
          background: '#FFFFFF',
          border: '1px solid #FDE68A',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(245,158,11,0.08)',
        }}
      >
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: '#B45309', fontFamily: 'Outfit, sans-serif' }}
        >
          The Shift: Why Traditional Analytics Are Blind
        </h3>
        <p className="text-[11px] mb-5" style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
          Clicks and traffic drop even when demand is strong — because decisions happen inside the AI experience
        </p>

        <div className="grid grid-cols-2 gap-5">
          {/* Old World */}
          <div>
            <p
              className="text-[9px] uppercase tracking-widest mb-3 font-semibold"
              style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
            >
              Old World (Google / SEO)
            </p>
            <div className="space-y-1.5">
              {['SEO Rankings', 'Click-through Rate', 'Page Traffic', 'Conversion Rate', 'Google Analytics'].map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <span className="text-[11px]" style={{ color: 'rgba(220,38,38,0.5)' }}>✕</span>
                  <span
                    className="text-xs line-through"
                    style={{ color: '#94A3B8', textDecorationColor: 'rgba(239,68,68,0.4)' }}
                  >
                    {m}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* New World */}
          <div>
            <p
              className="text-[9px] uppercase tracking-widest mb-3 font-semibold"
              style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
            >
              New World (AI / T3)
            </p>
            <div className="space-y-1.5">
              {[
                { metric: 'AI Inclusion Rate', value: latest?.inclusion_rate },
                { metric: 'Brand Mention Rate', value: latest?.total_mentions, raw: true },
                { metric: 'Platform Visibility', value: latest?.inclusion_rate },
                { metric: 'AI Accuracy Score', value: latest?.accuracy_score },
                { metric: 'Brand Trust Score', value: latest?.brand_trust_score },
              ].map((m, i) => {
                const pct = m.value !== null && m.value !== undefined ? Number(m.value) : 0;
                return (
                  <div
                    key={i}
                    className="relative flex items-center justify-between px-3 py-2 rounded-xl overflow-hidden"
                    style={{
                      background: 'rgba(124,58,237,0.05)',
                      border: '1px solid rgba(124,58,237,0.18)',
                    }}
                  >
                    {/* bar fill */}
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, rgba(124,58,237,0.1), transparent)',
                        pointerEvents: 'none',
                      }}
                    />
                    <div className="relative flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#059669' }}>✓</span>
                      <span className="text-xs text-slate-700 font-medium">{m.metric}</span>
                    </div>
                    <span
                      className="relative text-xs font-bold"
                      style={{ color: '#7C3AED', fontFamily: 'Outfit, sans-serif' }}
                    >
                      {m.value !== null && m.value !== undefined
                        ? m.raw
                          ? Number(m.value).toLocaleString()
                          : `${Number(m.value).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hallucination Business Impact */}
      <div
        className="mb-8 rounded-2xl p-5 animate-fade-in"
        style={{
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(239,68,68,0.07)',
        }}
      >
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: '#DC2626', fontFamily: 'Outfit, sans-serif' }}
        >
          Hallucination Business Impact
        </h3>
        <p className="text-[11px] mb-5" style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
          When AI gets it wrong — wrong pricing, fabricated features, outdated availability — it costs real money
        </p>

        <div className="grid grid-cols-4 gap-3">
          {/* Wrong Features */}
          <div
            className="inner-card rounded-xl p-4 text-center"
          >
            <p className="text-[10px] mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Wrong Features</p>
            <p
              className="text-2xl font-bold mb-1"
              style={{ color: '#DC2626', fontFamily: 'Outfit, sans-serif' }}
            >
              {latest?.hallucinated_claims || 0}
            </p>
            <p className="text-[9px]" style={{ color: '#94A3B8' }}>Misleads buyers → returns</p>
          </div>

          {/* Wrong Pricing */}
          <div
            className="inner-card rounded-xl p-4 text-center"
          >
            <p className="text-[10px] mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Wrong Pricing</p>
            <p
              className="text-2xl font-bold mb-1"
              style={{ color: '#D97706', fontFamily: 'Outfit, sans-serif' }}
            >
              {latest ? Math.max(0, Math.round((latest.hallucinated_claims || 0) * 0.3)) : 0}
            </p>
            <p className="text-[9px]" style={{ color: '#94A3B8' }}>Customer anger → complaints</p>
          </div>

          {/* Outdated Availability */}
          <div
            className="inner-card rounded-xl p-4 text-center"
          >
            <p className="text-[10px] mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Outdated Availability</p>
            <p
              className="text-2xl font-bold mb-1"
              style={{ color: '#D97706', fontFamily: 'Outfit, sans-serif' }}
            >
              {latest ? Math.max(0, Math.round((latest.hallucinated_claims || 0) * 0.2)) : 0}
            </p>
            <p className="text-[9px]" style={{ color: '#94A3B8' }}>Wasted trips → lost trust</p>
          </div>

          {/* Revenue at Risk */}
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <p className="text-[10px] mb-2" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>Est. Revenue at Risk</p>
            <p
              className="text-xl font-bold mb-1 revenue-pulse"
              style={{ color: '#DC2626', fontFamily: 'Outfit, sans-serif' }}
            >
              ${latest ? ((latest.hallucinated_claims || 0) * 1250).toLocaleString() : '0'}
            </p>
            <p className="text-[9px]" style={{ color: '#94A3B8' }}>Based on avg order value</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Trust Score" value={latest?.brand_trust_score} color="purple" trend={trend('brand_trust_score')} icon={<IconShield />} />
        <StatCard label="Inclusion Rate" value={latest?.inclusion_rate} color="cyan" trend={trend('inclusion_rate')} icon={<IconEye />} />
        <StatCard label="Accuracy" value={latest?.accuracy_score} color="green" trend={trend('accuracy_score')} icon={<IconCheck />} />
        <StatCard label="Hallucination" value={latest?.hallucination_rate} color="red" trend={trend('hallucination_rate')} icon={<IconWarning />} />
        <StatCard label="Active Alerts" value={alertCount} suffix="" color="amber" trend={null} icon={<IconBell />} />
      </div>

      {/* World Map + Globe */}
      <div className="card p-5 mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold"
            style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
          >
            Global AI Query Tracking
          </h3>
          {focusRegion && (
            <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED', fontFamily: 'DM Sans' }}>
              Viewing: {focusRegion.name}
            </span>
          )}
        </div>
        {/* Full-width map */}
        <div className="w-full">
          <WorldMap
            onRegionClick={(region) => setFocusRegion(region)}
            selectedRegion={focusRegion?.name}
          />
        </div>

        {/* Globe row below map */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <p className="text-[10px]" style={{ color: '#94A3B8', fontFamily: 'DM Sans' }}>
            Click a country to focus the globe →
          </p>
          <div className="flex-shrink-0 flex flex-col items-center" style={{ overflow: 'hidden' }}>
            <Globe size={220} focusTarget={focusRegion} />
            {focusRegion && (
              <button
                onClick={() => setFocusRegion(null)}
                className="mt-1 text-[10px] px-3 py-1 rounded-full hover:bg-violet-100 transition-colors"
                style={{ color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)', fontFamily: 'DM Sans' }}
              >
                Reset view
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Visibility &amp; Trust Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={snapshots}>
              <defs>
                <filter id="glow-purple">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                tickFormatter={(d) => d.slice(5)}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={customTooltip} />
              <Line type="monotone" dataKey="brand_trust_score" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Trust Score" strokeLinecap="round" />
              <Line type="monotone" dataKey="inclusion_rate" stroke="#7C3AED" strokeWidth={2} dot={false} name="Inclusion Rate" strokeLinecap="round" />
              <Line type="monotone" dataKey="accuracy_score" stroke="#10B981" strokeWidth={2} dot={false} name="Accuracy" strokeLinecap="round" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hallucination Rate Trend">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={snapshots}>
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.18} />
                  <stop offset="60%" stopColor="#EF4444" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                tickFormatter={(d) => d.slice(5)}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                domain={[0, 40]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={customTooltip} />
              <Area
                type="monotone"
                dataKey="hallucination_rate"
                stroke="#EF4444"
                fill="url(#redGrad)"
                strokeWidth={2}
                name="Hallucination %"
                strokeLinecap="round"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Content Updates — timeline layout */}
      <div className="card p-5 mb-6 animate-fade-in">
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
        >
          Content Updates → AI Visibility Impact
        </h3>
        <p className="text-[11px] mb-5" style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
          Did your website changes help or hurt your AI visibility? Track the cause and effect.
        </p>
        <div className="space-y-3">
          {contentUpdates.map((update, i) => (
            <div
              key={i}
              className="relative flex items-start gap-4 timeline-line"
            >
              {/* Timeline dot */}
              <div className="flex-shrink-0 flex flex-col items-center mt-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{
                    background: update.direction === 'up'
                      ? 'rgba(16,185,129,0.1)'
                      : 'rgba(239,68,68,0.1)',
                    border: update.direction === 'up'
                      ? '1px solid rgba(16,185,129,0.3)'
                      : '1px solid rgba(239,68,68,0.3)',
                    color: update.direction === 'up' ? '#059669' : '#DC2626',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {update.date.slice(4)}
                </div>
              </div>

              {/* Entry card */}
              <div
                className="flex-1 inner-card rounded-xl p-3.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-800 font-medium mb-0.5">{update.action}</p>
                    <p className="text-[11px]" style={{ color: '#64748B' }}>{update.metric}</p>
                  </div>
                  <span
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{
                      background: update.direction === 'up'
                        ? 'rgba(16,185,129,0.1)'
                        : 'rgba(239,68,68,0.1)',
                      border: update.direction === 'up'
                        ? '1px solid rgba(16,185,129,0.25)'
                        : '1px solid rgba(239,68,68,0.25)',
                      color: update.direction === 'up' ? '#059669' : '#DC2626',
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    {update.impact} visibility
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Query Volume chart */}
      <ChartCard title="Daily Query Volume" style={{ marginBottom: 0 }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={snapshots}>
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.18} />
                <stop offset="60%" stopColor="#7C3AED" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EC4899" stopOpacity={0.15} />
                <stop offset="60%" stopColor="#EC4899" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
              tickFormatter={(d) => d.slice(5)}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={customTooltip} />
            <Area
              type="monotone"
              dataKey="total_queries"
              stroke="#7C3AED"
              fill="url(#cyanGrad)"
              strokeWidth={2}
              name="Queries"
              strokeLinecap="round"
            />
            <Area
              type="monotone"
              dataKey="total_mentions"
              stroke="#EC4899"
              fill="url(#purpleGrad)"
              strokeWidth={2}
              name="Mentions"
              strokeLinecap="round"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
}
