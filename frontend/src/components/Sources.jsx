import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const sourceIcons = {
  product_page: '🌐', review_site: '⭐', community: '💬', comparison_article: '📊',
  general_knowledge: '🧠', news: '📰',
};

const sourceIconBg = {
  product_page: 'rgba(14,165,233,0.1)',
  review_site: 'rgba(245,158,11,0.1)',
  community: 'rgba(139,92,246,0.1)',
  comparison_article: 'rgba(99,102,241,0.1)',
  general_knowledge: 'rgba(16,185,129,0.1)',
  news: 'rgba(236,72,153,0.1)',
};

const sourceIconBorder = {
  product_page: 'rgba(14,165,233,0.25)',
  review_site: 'rgba(245,158,11,0.25)',
  community: 'rgba(139,92,246,0.25)',
  comparison_article: 'rgba(99,102,241,0.25)',
  general_knowledge: 'rgba(16,185,129,0.25)',
  news: 'rgba(236,72,153,0.25)',
};

function SkeletonBar({ width = '100%', height = '0.75rem', className = '' }) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: '9999px',
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header skeleton */}
      <div className="mb-8">
        <SkeletonBar width="220px" height="1.5rem" className="mb-2" />
        <SkeletonBar width="320px" height="0.875rem" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top sources skeleton */}
        <div className="card p-5">
          <SkeletonBar width="140px" height="0.875rem" className="mb-5" />
          <div className="space-y-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                  background: '#f1f5f9',
                  flexShrink: 0,
                }} />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <SkeletonBar width="110px" height="0.75rem" />
                    <SkeletonBar width="80px" height="0.75rem" />
                  </div>
                  <SkeletonBar width="100%" height="0.5rem" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content gaps skeleton */}
        <div className="card p-5">
          <SkeletonBar width="160px" height="0.875rem" className="mb-5" />
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="inner-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <SkeletonBar width="52px" height="1.2rem" />
                  <SkeletonBar width="70px" height="0.75rem" />
                </div>
                <SkeletonBar width="90%" height="0.75rem" />
                <SkeletonBar width="75%" height="0.75rem" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analyses skeleton */}
      <div className="card p-5">
        <SkeletonBar width="240px" height="0.875rem" className="mb-5" />
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="inner-card p-4">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="space-y-2">
                    <SkeletonBar width="80px" height="0.65rem" />
                    <SkeletonBar width="100%" height="0.65rem" />
                    <SkeletonBar width="85%" height="0.65rem" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sources({ brand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSources() {
      setLoading(true);
      try {
        // Fetch AI responses for this brand (via queries)
        const { data: responses } = await supabase
          .from('ai_responses')
          .select('platform, response_text, queried_at, query_id, queries!inner(target_brand_id, query_text)')
          .eq('queries.target_brand_id', brand.id)
          .order('queried_at', { ascending: false });

        // Fetch claims for this brand
        const { data: claims } = await supabase
          .from('claims')
          .select('*')
          .eq('brand_id', brand.id);

        // Build top sources from platform frequency + claim confidence
        const platformMap = {};
        (responses || []).forEach(r => {
          if (!platformMap[r.platform]) platformMap[r.platform] = { count: 0, totalConf: 0, confCount: 0 };
          platformMap[r.platform].count++;
        });
        (claims || []).forEach(c => {
          if (c.confidence && platformMap) {
            // distribute confidence across platforms
          }
        });

        // Map platforms to source types for display
        const platformToSource = {
          chatgpt: 'general_knowledge',
          perplexity: 'news',
          gemini: 'review_site',
          copilot: 'comparison_article',
        };

        const topSources = Object.entries(platformMap)
          .map(([platform, info]) => ({
            type: platformToSource[platform] || 'product_page',
            frequency: info.count,
            avg_confidence: claims?.length > 0
              ? (claims.filter(c => c.status === 'accurate').length / claims.length)
              : 0.5,
          }))
          .sort((a, b) => b.frequency - a.frequency);

        // Also add claim-type based sources
        const claimTypeMap = {};
        (claims || []).forEach(c => {
          if (!claimTypeMap[c.claim_type]) claimTypeMap[c.claim_type] = { count: 0, totalConf: 0, confCount: 0 };
          claimTypeMap[c.claim_type].count++;
          if (c.confidence) {
            claimTypeMap[c.claim_type].totalConf += Number(c.confidence);
            claimTypeMap[c.claim_type].confCount++;
          }
        });
        const claimSources = Object.entries(claimTypeMap).map(([type, info]) => ({
          type: type === 'price' ? 'product_page' : type === 'feature' ? 'review_site' : 'community',
          frequency: info.count,
          avg_confidence: info.confCount > 0 ? info.totalConf / info.confCount : 0.5,
        }));

        // Merge and deduplicate
        const allSources = [...topSources, ...claimSources]
          .reduce((acc, s) => {
            const existing = acc.find(x => x.type === s.type);
            if (existing) {
              existing.frequency += s.frequency;
              existing.avg_confidence = (existing.avg_confidence + s.avg_confidence) / 2;
            } else {
              acc.push({ ...s });
            }
            return acc;
          }, [])
          .sort((a, b) => b.frequency - a.frequency);

        // Build content gaps from hallucinated/outdated claims
        const hallucinated = (claims || []).filter(c => c.status === 'hallucinated');
        const outdated = (claims || []).filter(c => c.status === 'outdated');

        const gaps = [];
        if (hallucinated.length > 0) {
          gaps.push({
            impact: 'high',
            frequency: hallucinated.length,
            gap: `${hallucinated.length} hallucinated claims detected — AI platforms are generating incorrect ${hallucinated[0]?.claim_type || 'product'} information`,
            recommendation: 'Publish verified product data with schema markup to correct AI training sources.',
          });
        }
        if (outdated.length > 0) {
          gaps.push({
            impact: 'medium',
            frequency: outdated.length,
            gap: `${outdated.length} outdated claims found across AI responses`,
            recommendation: 'Update product pages and submit fresh structured data to major search indexes.',
          });
        }
        // Check for missing platforms
        const platforms = ['chatgpt', 'gemini', 'perplexity', 'copilot'];
        const missingPlatforms = platforms.filter(p => !platformMap[p]);
        if (missingPlatforms.length > 0) {
          gaps.push({
            impact: 'medium',
            frequency: missingPlatforms.length,
            gap: `Brand not detected on ${missingPlatforms.join(', ')}`,
            recommendation: 'Create content optimized for these AI platforms to increase brand visibility.',
          });
        }

        // Build individual analyses from recent responses
        const analyses = (responses || []).slice(0, 5).map(r => {
          const responseClaims = (claims || []).filter(c => c.response_id === undefined); // can't join here
          return {
            likely_sources: [
              { type: platformToSource[r.platform] || 'general_knowledge', name: `${r.platform} response to "${r.queries?.query_text?.slice(0, 40)}..."` },
            ],
            content_gaps: hallucinated.slice(0, 2).map(c => ({ gap: c.claim_text?.slice(0, 60) })),
            outdated_info: outdated.slice(0, 1).map(c => ({ claim: c.claim_text?.slice(0, 60) })),
          };
        });

        setData({
          aggregated: { top_sources: allSources, recurring_gaps: gaps },
          individual_analyses: analyses,
        });
      } catch (err) {
        console.error('Sources fetch error:', err);
        setData({ aggregated: { top_sources: [], recurring_gaps: [] }, individual_analyses: [] });
      }
      setLoading(false);
    }
    fetchSources();
  }, [brand.id]);

  if (loading) return <LoadingSkeleton />;

  const agg = data?.aggregated || {};
  const topSources = agg.top_sources || [];
  const gaps = agg.recurring_gaps || [];
  const analyses = data?.individual_analyses || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h2
          className="text-2xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: 'Outfit' }}
        >
          Source Intelligence
        </h2>
        <p className="text-sm text-slate-600">
          What information does AI rely on for{' '}
          <span className="text-violet-600 font-medium">{brand.name}</span>?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Source Types */}
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <h3
            className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2"
            style={{ fontFamily: 'Outfit' }}
          >
            <span
              className="inline-block w-1.5 h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, #7C3AED, #EC4899)' }}
            />
            Top Source Types
          </h3>

          <div className="space-y-4">
            {topSources.length === 0 ? (
              <div className="inner-card p-6 text-center">
                <div className="text-3xl mb-3 opacity-40">📡</div>
                <p className="text-slate-400 text-sm">Run queries to analyze sources.</p>
              </div>
            ) : (
              topSources.map((source, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 animate-fade-in"
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '50%',
                      background: sourceIconBg[source.type] || 'rgba(148,163,184,0.1)',
                      border: `1px solid ${sourceIconBorder[source.type] || 'rgba(148,163,184,0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {sourceIcons[source.type] || '📄'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm text-slate-700 capitalize font-medium">
                        {source.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0 ml-2">
                        {source.frequency}x &middot; {(source.avg_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar h-2">
                      <div
                        className="progress-fill transition-all duration-700"
                        style={{ width: `${source.avg_confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Gaps */}
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '140ms' }}>
          <h3
            className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2"
            style={{ fontFamily: 'Outfit' }}
          >
            <span
              className="inline-block w-1.5 h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, #F59E0B, #EF4444)' }}
            />
            Content Gaps Found
          </h3>

          <div className="space-y-3">
            {gaps.length === 0 ? (
              <div className="inner-card p-6 text-center">
                <div className="text-3xl mb-3 opacity-40">✅</div>
                <p className="text-slate-400 text-sm">No recurring gaps detected yet.</p>
              </div>
            ) : (
              gaps.map((gap, i) => {
                const isHigh = gap.impact === 'high';
                const isMedium = gap.impact === 'medium';

                const borderStyle = isHigh
                  ? { border: '1px solid rgba(239,68,68,0.25)' }
                  : isMedium
                  ? { border: '1px solid rgba(245,158,11,0.25)' }
                  : {};

                return (
                  <div
                    key={i}
                    className="inner-card p-4 animate-fade-in"
                    style={{
                      animationDelay: `${180 + i * 70}ms`,
                      ...borderStyle,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide ${
                          isHigh
                            ? 'badge-red'
                            : isMedium
                            ? 'badge-amber'
                            : 'badge-green'
                        }`}
                        style={{ fontFamily: 'Outfit', letterSpacing: '0.06em' }}
                      >
                        {gap.impact}
                      </span>
                      <span className="text-xs text-slate-500">Found {gap.frequency}x</span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2 leading-relaxed">{gap.gap}</p>
                    <p className="text-xs text-violet-600 leading-relaxed">{gap.recommendation}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Individual Response Analyses */}
      <div className="card p-5 animate-fade-in" style={{ animationDelay: '220ms' }}>
        <h3
          className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2"
          style={{ fontFamily: 'Outfit' }}
        >
          <span
            className="inline-block w-1.5 h-4 rounded-full"
            style={{ background: 'linear-gradient(180deg, #6366F1, #EC4899)' }}
          />
          Individual Response Analyses
          {analyses.length > 0 && (
            <span
              className="badge-purple text-xs px-2 py-0.5 rounded-full ml-1"
              style={{ fontFamily: 'Outfit' }}
            >
              {analyses.length}
            </span>
          )}
        </h3>

        {analyses.length === 0 ? (
          <div
            className="inner-card p-10 text-center animate-fade-in"
            style={{ animationDelay: '280ms' }}
          >
            <div className="text-4xl mb-4 opacity-30">🔬</div>
            <p className="text-slate-400 text-sm font-medium mb-1">No analyses yet</p>
            <p className="text-slate-400 text-xs">Run queries first to generate source analysis.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis, i) => (
              <div
                key={i}
                className="inner-card p-4 animate-fade-in"
                style={{
                  animationDelay: `${260 + i * 50}ms`,
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="grid grid-cols-3 gap-4">
                  {/* Likely Sources */}
                  <div>
                    <p
                      className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider"
                      style={{ fontFamily: 'Outfit', letterSpacing: '0.08em', fontSize: '0.65rem' }}
                    >
                      Likely Sources
                    </p>
                    {(analysis.likely_sources || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">None identified</p>
                    ) : (
                      (analysis.likely_sources || []).map((s, j) => (
                        <div key={j} className="flex items-start gap-1.5 mb-1">
                          <span
                            className="shrink-0 mt-0.5"
                            style={{
                              width: '1.25rem',
                              height: '1.25rem',
                              borderRadius: '50%',
                              background: sourceIconBg[s.type] || 'rgba(148,163,184,0.1)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                            }}
                          >
                            {sourceIcons[s.type] || '📄'}
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed">{s.name?.slice(0, 50)}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Content Gaps */}
                  <div>
                    <p
                      className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider"
                      style={{ fontFamily: 'Outfit', letterSpacing: '0.08em', fontSize: '0.65rem' }}
                    >
                      Content Gaps
                    </p>
                    {(analysis.content_gaps || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">None detected</p>
                    ) : (
                      (analysis.content_gaps || []).map((g, j) => (
                        <p key={j} className="text-xs text-amber-600 leading-relaxed mb-1">
                          {g.gap?.slice(0, 60)}
                        </p>
                      ))
                    )}
                  </div>

                  {/* Outdated Info */}
                  <div>
                    <p
                      className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider"
                      style={{ fontFamily: 'Outfit', letterSpacing: '0.08em', fontSize: '0.65rem' }}
                    >
                      Outdated Info
                    </p>
                    {(analysis.outdated_info || []).length === 0 ? (
                      <p className="text-xs text-emerald-600">None detected</p>
                    ) : (
                      (analysis.outdated_info || []).map((o, j) => (
                        <p key={j} className="text-xs text-red-600 leading-relaxed mb-1">{o.claim}</p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
