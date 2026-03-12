import { useState, useEffect } from 'react';

const BACKEND = 'http://localhost:8000';

const sourceIcons = {
  product_page: '🌐', review_site: '⭐', community: '💬', comparison_article: '📊',
  general_knowledge: '🧠', news: '📰',
};

export default function Sources({ brand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/sources/${brand.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [brand.id]);

  if (loading) return <div className="text-slate-500 py-20 text-center">Analyzing sources...</div>;

  const agg = data?.aggregated || {};
  const topSources = agg.top_sources || [];
  const gaps = agg.recurring_gaps || [];
  const analyses = data?.individual_analyses || [];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Source Intelligence</h2>
        <p className="text-sm text-slate-500">What information does AI rely on for {brand.name}?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Source Types</h3>
          <div className="space-y-3">
            {topSources.map((source, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{sourceIcons[source.type] || '📄'}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300 capitalize">{source.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-500">{source.frequency}x found | {(source.avg_confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                  <div className="w-full bg-[#1E293B] rounded-full h-2">
                    <div className="bg-cyan-500 rounded-full h-2 transition-all" style={{ width: `${source.avg_confidence * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {topSources.length === 0 && <p className="text-slate-500 text-sm">Run queries to analyze sources.</p>}
          </div>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Content Gaps Found</h3>
          <div className="space-y-3">
            {gaps.map((gap, i) => (
              <div key={i} className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    gap.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                    gap.impact === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
                  }`}>{gap.impact}</span>
                  <span className="text-xs text-slate-500">Found {gap.frequency}x</span>
                </div>
                <p className="text-sm text-slate-300 mb-1">{gap.gap}</p>
                <p className="text-xs text-cyan-400">{gap.recommendation}</p>
              </div>
            ))}
            {gaps.length === 0 && <p className="text-slate-500 text-sm">No recurring gaps detected yet.</p>}
          </div>
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Individual Response Analyses</h3>
        <div className="space-y-3">
          {analyses.map((analysis, i) => (
            <div key={i} className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Likely Sources</p>
                  {(analysis.likely_sources || []).map((s, j) => (
                    <p key={j} className="text-xs text-slate-300">{sourceIcons[s.type] || '📄'} {s.name?.slice(0, 50)}</p>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Content Gaps</p>
                  {(analysis.content_gaps || []).map((g, j) => (
                    <p key={j} className="text-xs text-amber-400">{g.gap?.slice(0, 60)}</p>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Outdated Info</p>
                  {(analysis.outdated_info || []).length === 0
                    ? <p className="text-xs text-green-400">None detected</p>
                    : (analysis.outdated_info || []).map((o, j) => (
                      <p key={j} className="text-xs text-red-400">{o.claim}</p>
                    ))
                  }
                </div>
              </div>
            </div>
          ))}
          {analyses.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Run queries first to generate source analysis.</p>}
        </div>
      </div>
    </div>
  );
}
