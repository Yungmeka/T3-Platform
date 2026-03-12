import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const BACKEND = 'http://localhost:8000';

const platformIcons = {
  chatgpt: '🟢',
  gemini: '🔵',
  perplexity: '🟣',
  copilot: '🟠',
};

const platformNames = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
};

const statusColors = {
  accurate: 'bg-green-500/10 text-green-400 border-green-500/30',
  hallucinated: 'bg-red-500/10 text-red-400 border-red-500/30',
  outdated: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

export default function VisibilityScan({ brand }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [suggestedQueries, setSuggestedQueries] = useState([]);
  const [expandedPlatform, setExpandedPlatform] = useState(null);

  useEffect(() => {
    async function fetchQueries() {
      const { data } = await supabase
        .from('queries')
        .select('query_text')
        .eq('target_brand_id', brand.id);
      setSuggestedQueries(data || []);
    }
    fetchQueries();
    setResult(null);
    setQuery('');
    setExpandedPlatform(null);
  }, [brand.id]);

  async function runScan() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setExpandedPlatform(null);

    try {
      const res = await fetch(`${BACKEND}/api/queries/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_text: query, brand_id: brand.id }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Backend not running — start with ./run.sh' });
    } finally {
      setLoading(false);
    }
  }

  const summary = result?.visibility_summary;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Visibility Scan</h2>
        <p className="text-sm text-slate-500">
          See exactly how {brand.name} appears across all 4 AI platforms — side by side
        </p>
      </div>

      {/* Query Input */}
      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">
          Ask AI what your customers ask
        </p>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runScan()}
            placeholder={`e.g., "Best products from ${brand.name}..."`}
            className="flex-1 bg-[#0B1120] border border-[#253347] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={runScan}
            disabled={loading || !query.trim()}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning 4 platforms...
              </span>
            ) : 'Scan All Platforms'}
          </button>
        </div>

        {suggestedQueries.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Consumer queries to test:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q.query_text)}
                  className="px-3 py-1.5 bg-[#1A2332] text-slate-400 rounded-lg text-[11px] hover:bg-[#253347] hover:text-white transition-colors"
                >
                  {q.query_text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
          {result.error}
        </div>
      )}

      {summary && (
        <>
          {/* Visibility Verdict */}
          <div className={`rounded-2xl border p-5 mb-6 ${
            summary.inclusion_rate >= 75 ? 'border-green-500/30 bg-green-500/5' :
            summary.inclusion_rate >= 50 ? 'border-amber-500/30 bg-amber-500/5' :
            'border-red-500/30 bg-red-500/5'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Visibility Verdict</h3>
              <span className={`text-3xl font-bold ${
                summary.inclusion_rate >= 75 ? 'text-green-400' :
                summary.inclusion_rate >= 50 ? 'text-amber-400' :
                'text-red-400'
              }`}>{summary.inclusion_rate}%</span>
            </div>
            <p className={`text-sm ${
              summary.inclusion_rate >= 75 ? 'text-green-300' :
              summary.inclusion_rate >= 50 ? 'text-amber-300' :
              'text-red-300'
            }`}>{summary.verdict}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Platforms Checked</p>
              <p className="text-2xl font-bold text-white">{summary.platforms_checked}</p>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-cyan-500/30 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Mentioned On</p>
              <p className="text-2xl font-bold text-cyan-400">{summary.platforms_mentioned}</p>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Claims Found</p>
              <p className="text-2xl font-bold text-white">{summary.total_claims_extracted}</p>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-red-500/30 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hallucinations</p>
              <p className="text-2xl font-bold text-red-400">{summary.total_hallucinations}</p>
            </div>
          </div>

          {/* Competitor Alert */}
          {summary.top_competitors?.length > 0 && (
            <div className="bg-[#111827] rounded-2xl border border-amber-500/20 p-5 mb-6">
              <h3 className="text-sm font-semibold text-amber-400 mb-3">Competitors Appearing Instead</h3>
              <div className="flex flex-wrap gap-3">
                {summary.top_competitors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-amber-300">{c.name}</span>
                    <span className="text-xs text-amber-400/60">on {c.mentions} platform{c.mentions > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform-by-Platform Results */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-300">Platform-by-Platform Breakdown</h3>
            {result.platforms?.map((p, i) => (
              <div key={i} className={`bg-[#111827] rounded-2xl border ${
                p.mentioned ? 'border-green-500/20' : 'border-red-500/20'
              } overflow-hidden`}>
                {/* Platform Header */}
                <button
                  onClick={() => setExpandedPlatform(expandedPlatform === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 hover:bg-[#151D2E] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{platformIcons[p.platform]}</span>
                    <span className="text-sm font-semibold text-white">{platformNames[p.platform]}</span>
                    {p.mentioned ? (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs font-medium">
                        VISIBLE {p.rank ? `#${p.rank}` : ''} {p.position ? `(${p.position})` : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs font-medium">
                        NOT MENTIONED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {p.claim_summary && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-400">{p.claim_summary.accurate} accurate</span>
                        {p.claim_summary.hallucinated > 0 && (
                          <span className="text-red-400">{p.claim_summary.hallucinated} wrong</span>
                        )}
                      </div>
                    )}
                    <span className="text-slate-500 text-xs">{expandedPlatform === i ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedPlatform === i && (
                  <div className="border-t border-[#1E293B] p-5 space-y-4">
                    {/* AI Response */}
                    <div>
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                        What {platformNames[p.platform]} tells your customers
                      </h4>
                      <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {p.response}
                      </div>
                    </div>

                    {/* Competitors on this platform */}
                    {p.competitors?.length > 0 && (
                      <div>
                        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                          Competitors mentioned
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {p.competitors.map((comp, ci) => (
                            <span key={ci} className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Claims */}
                    {p.claims?.length > 0 && (
                      <div>
                        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                          Claims about {brand.name}
                        </h4>
                        <div className="space-y-2">
                          {p.claims.map((claim, ci) => (
                            <div key={ci} className={`rounded-lg border p-3 ${statusColors[claim.status] || 'border-[#1E293B]'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[claim.status]}`}>
                                  {claim.status}
                                </span>
                                <span className="text-[10px] text-slate-500">{claim.claim_type}</span>
                              </div>
                              <p className="text-xs text-white">{claim.claim_text}</p>
                              {claim.ground_truth_value && claim.status !== 'accurate' && (
                                <p className="text-[11px] mt-1">
                                  <span className="text-slate-400">Correct: </span>
                                  <span className="text-green-400">{claim.ground_truth_value}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources AI relies on */}
                    {p.sources?.length > 0 && (
                      <div>
                        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                          What information AI seems to rely on
                        </h4>
                        <div className="space-y-2">
                          {p.sources.map((src, si) => (
                            <div key={si} className="flex items-start gap-2 bg-[#0B1120] rounded-lg p-3 border border-[#1E293B]">
                              <div className="flex-1">
                                <p className="text-xs text-cyan-400 font-medium">{src.name}</p>
                                <p className="text-[11px] text-slate-500">{src.reasoning}</p>
                              </div>
                              <span className="text-[10px] text-slate-500">{Math.round((src.confidence || 0) * 100)}% confidence</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Gaps */}
                    {p.content_gaps?.length > 0 && (
                      <div>
                        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                          How to improve on this platform
                        </h4>
                        <div className="space-y-2">
                          {p.content_gaps.map((gap, gi) => (
                            <div key={gi} className="flex items-start gap-2">
                              <span className={`mt-0.5 text-xs ${
                                gap.impact === 'high' ? 'text-red-400' : gap.impact === 'medium' ? 'text-amber-400' : 'text-slate-400'
                              }`}>→</span>
                              <div>
                                <p className="text-xs text-white">{gap.gap}</p>
                                <p className="text-[11px] text-cyan-400">{gap.recommendation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
