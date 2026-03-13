import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

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

export default function Audience({ brand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudience() {
      setLoading(true);
      try {
        // Fetch AI responses for this brand grouped by platform
        const { data: responses } = await supabase
          .from('ai_responses')
          .select('platform, response_text, queries!inner(target_brand_id, query_text, category)')
          .eq('queries.target_brand_id', brand.id);

        // Fetch latest analytics snapshot
        const { data: snapshots } = await supabase
          .from('analytics_snapshots')
          .select('*')
          .eq('brand_id', brand.id)
          .order('date', { ascending: false })
          .limit(1);

        // Fetch queries for sample queries
        const { data: queries } = await supabase
          .from('queries')
          .select('query_text, category')
          .eq('target_brand_id', brand.id);

        const latest = snapshots?.[0];
        const inclusionRate = Number(latest?.inclusion_rate || 0);

        // Build platform segments as audience segments
        const platformInfo = {
          chatgpt: { segment: 'ChatGPT Users', description: 'Users asking product and shopping questions through ChatGPT — the largest AI assistant audience.', demographics: 'Broad, 18-55, tech-forward', ai_behavior: 'Conversational product research and comparisons' },
          gemini: { segment: 'Gemini Users', description: 'Google Gemini users who discover brands through integrated AI search and recommendations.', demographics: 'Google ecosystem, 25-50, search-heavy', ai_behavior: 'Search-integrated queries, factual lookups' },
          perplexity: { segment: 'Perplexity Users', description: 'Research-oriented users who rely on Perplexity for sourced, detailed product analysis.', demographics: '25-45, researchers, detail-oriented', ai_behavior: 'Deep research queries with source verification' },
          copilot: { segment: 'Copilot Users', description: 'Microsoft Copilot users in enterprise and productivity contexts discovering brands.', demographics: '30-55, enterprise, Microsoft ecosystem', ai_behavior: 'Work-integrated queries, enterprise focus' },
        };

        const platformCounts = {};
        const totalResponses = responses?.length || 0;
        (responses || []).forEach(r => {
          platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
        });

        // Check which responses actually mention the brand
        const brandName = brand.name.toLowerCase();
        const platformMentions = {};
        (responses || []).forEach(r => {
          if (!platformMentions[r.platform]) platformMentions[r.platform] = { total: 0, mentions: 0 };
          platformMentions[r.platform].total++;
          if (r.response_text?.toLowerCase().includes(brandName)) {
            platformMentions[r.platform].mentions++;
          }
        });

        const segments = Object.entries(platformInfo).map(([platform, info]) => {
          const pm = platformMentions[platform] || { total: 0, mentions: 0 };
          const reachRate = pm.total > 0 ? Math.round((pm.mentions / pm.total) * 100) : 0;
          const platformQueries = (queries || []).slice(0, 2).map(q => q.query_text);
          return {
            ...info,
            reach_rate: reachRate,
            sample_queries: platformQueries,
          };
        }).sort((a, b) => b.reach_rate - a.reach_rate);

        const reached = segments.filter(s => s.reach_rate >= 50);
        const underserved = segments.filter(s => s.reach_rate > 0 && s.reach_rate < 50);
        const invisible = segments.filter(s => s.reach_rate === 0);

        // Build recommendations from real data
        const recommendations = [];
        invisible.forEach(s => {
          recommendations.push({
            priority: 'critical',
            segment: s.segment,
            action: `Increase brand presence for ${s.segment}`,
            detail: `${brand.name} has 0% reach on this platform. Create optimized content and structured data targeting this AI channel.`,
          });
        });
        underserved.forEach(s => {
          recommendations.push({
            priority: 'high',
            segment: s.segment,
            action: `Improve reach for ${s.segment} (currently ${s.reach_rate}%)`,
            detail: `Brand is mentioned in only ${s.reach_rate}% of responses. Publish more detailed product content and FAQ schemas.`,
          });
        });
        reached.forEach(s => {
          recommendations.push({
            priority: 'maintain',
            segment: s.segment,
            action: `Maintain strong ${s.reach_rate}% reach on ${s.segment}`,
            detail: `Good visibility on this platform. Continue publishing fresh content and monitor for accuracy.`,
          });
        });

        setData({
          reached_audiences: reached.map(s => ({ segment: s.segment, reach_rate: s.reach_rate })),
          underserved_audiences: underserved.map(s => ({ segment: s.segment, reach_rate: s.reach_rate })),
          invisible_audiences: invisible.map(s => ({ segment: s.segment, reach_rate: s.reach_rate })),
          segments,
          recommendations,
        });
      } catch (err) {
        console.error('Audience fetch error:', err);
        setData({ reached_audiences: [], underserved_audiences: [], invisible_audiences: [], segments: [], recommendations: [] });
      }
      setLoading(false);
    }
    fetchAudience();
  }, [brand.id]);

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
