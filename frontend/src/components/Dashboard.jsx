import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import Globe from './Globe';

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

/* ─── Main Dashboard ────────────────────────────────────────────── */
export default function Dashboard({ brand }) {
  const [snapshots, setSnapshots] = useState([]);
  const [latest, setLatest] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

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
      const incDelta = ((curr.inclusion_rate || 0) - (prev.inclusion_rate || 0)).toFixed(1);
      const direction = incDelta >= 0 ? 'up' : 'down';
      const dateStr = new Date(curr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      updates.push({
        date: dateStr,
        action: `AI inclusion rate ${direction === 'up' ? 'increased' : 'decreased'} to ${(curr.inclusion_rate || 0).toFixed(1)}%`,
        impact: `${incDelta > 0 ? '+' : ''}${incDelta}%`,
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

      {/* World Map */}
      <div className="card p-5 mb-8 animate-fade-in">
        <h3
          className="text-sm font-semibold mb-4"
          style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}
        >
          Global AI Query Tracking
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <Globe size={360} />
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
