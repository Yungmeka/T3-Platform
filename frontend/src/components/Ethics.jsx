import { useState, useEffect } from 'react';

const BACKEND = 'http://localhost:8000';

export default function Ethics({ brand }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/ethics/report/${brand.id}`)
      .then(r => r.json())
      .then(d => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [brand.id]);

  if (loading) return <div className="text-slate-500 py-20 text-center">Generating ethics report...</div>;
  if (!report) return null;

  const score = report.ethics_score;
  const monitoring = report.monitoring;
  const actions = report.actions;
  const trust = report.trust_improvement;

  const gradeColors = { A: 'text-green-400 border-green-500/30', B: 'text-cyan-400 border-cyan-500/30', C: 'text-amber-400 border-amber-500/30', D: 'text-red-400 border-red-500/30' };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Ethics Monitor</h2>
        <p className="text-sm text-slate-500">Ethics compliance report for {brand.name}</p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className={`bg-[#111827] rounded-2xl border ${gradeColors[score.grade]} p-5 text-center col-span-1`}>
          <p className="text-xs text-slate-500 uppercase mb-2">Ethics Grade</p>
          <p className={`text-5xl font-bold ${gradeColors[score.grade].split(' ')[0]}`}>{score.grade}</p>
          <p className="text-sm text-slate-400 mt-1">{score.overall}/100</p>
        </div>
        {Object.entries(score.components).map(([key, val]) => (
          <div key={key} className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5 text-center">
            <p className="text-xs text-slate-500 uppercase mb-2 capitalize">{key.replace(/_/g, ' ')}</p>
            <p className={`text-2xl font-bold ${val >= 75 ? 'text-green-400' : val >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{val}</p>
            <div className="w-full bg-[#1E293B] rounded-full h-1.5 mt-2">
              <div className={`rounded-full h-1.5 ${val >= 75 ? 'bg-green-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${val}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Section 1: How We Monitor */}
      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">How We Monitor Issues Over Time</h3>
        <p className="text-xs text-slate-500 mb-4">Case prompt question 1</p>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] text-center">
            <p className="text-2xl font-bold text-white">{monitoring.total_claims_analyzed}</p>
            <p className="text-xs text-slate-500 mt-1">Claims Analyzed</p>
          </div>
          <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] text-center">
            <p className="text-2xl font-bold text-red-400">{monitoring.hallucinations_detected}</p>
            <p className="text-xs text-slate-500 mt-1">Hallucinations</p>
          </div>
          <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] text-center">
            <p className="text-2xl font-bold text-amber-400">{monitoring.outdated_info_detected}</p>
            <p className="text-xs text-slate-500 mt-1">Outdated Info</p>
          </div>
          <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] text-center">
            <p className={`text-2xl font-bold ${monitoring.hallucination_trend.direction === 'improving' ? 'text-green-400' : 'text-red-400'}`}>
              {monitoring.hallucination_trend.direction === 'improving' ? '↓' : '↑'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Trend: {monitoring.hallucination_trend.direction}</p>
          </div>
        </div>
        <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
          <p className="text-xs text-slate-500 mb-1">Most common hallucination type</p>
          <p className="text-sm text-white capitalize">{monitoring.most_common_hallucination}</p>
          <p className="text-xs text-slate-500 mt-2">Monitoring frequency</p>
          <p className="text-sm text-cyan-400">{monitoring.monitoring_frequency}</p>
        </div>
      </div>

      {/* Section 2: Actions When Problems Found */}
      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Actions When Problems Are Found</h3>
        <p className="text-xs text-slate-500 mb-4">Case prompt question 2</p>
        <div className="flex gap-2 mb-4">
          {actions.action_pipeline.map((step, i) => (
            <div key={i} className="flex-1 relative">
              <div className="bg-[#0B1120] rounded-xl p-3 border border-[#1E293B] text-center">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2 text-xs font-bold">{step.step}</div>
                <p className="text-xs text-white font-medium">{step.action}</p>
                <p className="text-[10px] text-slate-500 mt-1">{step.description.slice(0, 50)}...</p>
                <span className="inline-block mt-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">Automated</span>
              </div>
              {i < actions.action_pipeline.length - 1 && (
                <div className="absolute top-1/2 -right-2 text-slate-600 z-10">→</div>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0B1120] rounded-xl p-3 border border-[#1E293B] text-center">
            <p className="text-xl font-bold text-white">{actions.total_alerts}</p>
            <p className="text-xs text-slate-500">Total Alerts</p>
          </div>
          <div className="bg-[#0B1120] rounded-xl p-3 border border-green-500/20 text-center">
            <p className="text-xl font-bold text-green-400">{actions.resolved}</p>
            <p className="text-xs text-slate-500">Resolved</p>
          </div>
          <div className="bg-[#0B1120] rounded-xl p-3 border border-[#1E293B] text-center">
            <p className="text-xl font-bold text-white">{actions.resolution_rate}%</p>
            <p className="text-xs text-slate-500">Resolution Rate</p>
          </div>
        </div>
      </div>

      {/* Section 3: Proving Trust Improvement */}
      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Proving Improved Customer Trust</h3>
        <p className="text-xs text-slate-500 mb-4">Case prompt question 3 | {trust.period}</p>
        {trust.brand_trust_score && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Trust Score', data: trust.brand_trust_score, good: 'improved' },
              { label: 'Accuracy', data: trust.accuracy_score, good: 'improved' },
              { label: 'Hallucination', data: trust.hallucination_rate, good: 'improved' },
              { label: 'Visibility', data: trust.inclusion_rate, good: 'improved' },
            ].map((item, i) => (
              <div key={i} className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
                <p className="text-xs text-slate-500 mb-2">{item.label}</p>
                <p className="text-xl font-bold text-white">{item.data.current}</p>
                <p className={`text-xs mt-1 ${item.data.direction === 'improved' ? 'text-green-400' : item.data.direction === 'stable' ? 'text-slate-400' : 'text-red-400'}`}>
                  {item.data.change > 0 ? '+' : ''}{item.data.change} ({item.data.direction})
                </p>
              </div>
            ))}
          </div>
        )}
        {trust.business_impact_indicators && (
          <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
            <p className="text-xs text-slate-500 mb-2">Business Impact</p>
            {trust.business_impact_indicators.map((indicator, i) => (
              <p key={i} className="text-xs text-slate-300 py-1">• {indicator}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
