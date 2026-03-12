import { useState, useEffect } from 'react';

const BACKEND = 'http://localhost:8000';

const priorityColors = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-amber-500/20 text-amber-400',
  maintain: 'bg-green-500/20 text-green-400',
};

export default function Audience({ brand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/audience/${brand.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [brand.id]);

  if (loading) return <div className="text-slate-500 py-20 text-center">Analyzing audiences...</div>;

  const reached = data?.reached_audiences || [];
  const underserved = data?.underserved_audiences || [];
  const invisible = data?.invisible_audiences || [];
  const segments = data?.segments || [];
  const recommendations = data?.recommendations || [];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Audience Targeting</h2>
        <p className="text-sm text-slate-500">Which customers is AI reaching for {brand.name}?</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111827] rounded-2xl border border-green-500/30 p-5 text-center glow-green">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Reached</p>
          <p className="text-3xl font-bold text-green-400">{reached.length}</p>
          <p className="text-xs text-slate-500 mt-1">segments at 50%+ reach</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-amber-500/30 p-5 text-center glow-amber">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Underserved</p>
          <p className="text-3xl font-bold text-amber-400">{underserved.length}</p>
          <p className="text-xs text-slate-500 mt-1">segments at 1-49% reach</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-red-500/30 p-5 text-center glow-red">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Invisible</p>
          <p className="text-3xl font-bold text-red-400">{invisible.length}</p>
          <p className="text-xs text-slate-500 mt-1">segments at 0% reach</p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {segments.map((seg, i) => (
          <div key={i} className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white font-medium text-sm">{seg.segment}</h4>
                <p className="text-xs text-slate-500">{seg.description}</p>
              </div>
              <span className={`text-lg font-bold ${
                seg.reach_rate >= 50 ? 'text-green-400' :
                seg.reach_rate > 0 ? 'text-amber-400' : 'text-red-400'
              }`}>{seg.reach_rate}%</span>
            </div>
            <div className="w-full bg-[#1E293B] rounded-full h-2 mb-3">
              <div className={`rounded-full h-2 transition-all ${
                seg.reach_rate >= 50 ? 'bg-green-500' :
                seg.reach_rate > 0 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${Math.max(seg.reach_rate, 2)}%` }} />
            </div>
            <div className="flex gap-6 text-xs">
              <div><span className="text-slate-500">Demographics: </span><span className="text-slate-300">{seg.demographics}</span></div>
              <div><span className="text-slate-500">AI behavior: </span><span className="text-slate-300">{seg.ai_behavior}</span></div>
            </div>
            {seg.sample_queries?.length > 0 && (
              <div className="flex gap-2 mt-3">
                {seg.sample_queries.map((q, j) => (
                  <span key={j} className="px-2 py-1 bg-[#1E293B] text-slate-400 rounded-lg text-[11px]">"{q}"</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Targeting Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${priorityColors[rec.priority]}`}>{rec.priority}</span>
                  <span className="text-xs text-slate-400">{rec.segment}</span>
                </div>
                <p className="text-sm text-white font-medium mb-1">{rec.action}</p>
                <p className="text-xs text-slate-400">{rec.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
