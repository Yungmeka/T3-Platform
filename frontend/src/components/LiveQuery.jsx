import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const BACKEND = 'http://localhost:8000';

const statusColors = {
  accurate: 'bg-green-500/10 text-green-400 border-green-500/30',
  hallucinated: 'bg-red-500/10 text-red-400 border-red-500/30',
  outdated: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  missing: 'bg-[#111827] text-slate-400 border-[#1E293B]',
};

export default function LiveQuery({ brand }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('chatgpt');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [suggestedQueries, setSuggestedQueries] = useState([]);

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
  }, [brand.id]);

  async function runQuery() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${BACKEND}/api/queries/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_text: query,
          platform,
          brand_id: brand.id,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Backend not running' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Live AI Query</h2>
        <p className="text-sm text-slate-500">Query AI platforms and analyze how {brand.name} is represented</p>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            placeholder={`e.g., "Best products from ${brand.name}..."`}
            className="flex-1 bg-[#0B1120] border border-[#253347] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-[#0B1120] border border-[#253347] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="chatgpt">ChatGPT</option>
            <option value="gemini">Gemini</option>
            <option value="perplexity">Perplexity</option>
            <option value="copilot">Copilot</option>
          </select>
          <button
            onClick={runQuery}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Querying...' : 'Run Query'}
          </button>
        </div>

        {suggestedQueries.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Suggested queries:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q.query_text)}
                  className="px-3 py-1 bg-[#1A2332] text-slate-400 rounded-lg text-[11px] hover:bg-[#253347] transition-colors"
                >
                  {q.query_text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {result && result.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-6">
          <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">AI Response ({result.platform})</h4>
            <div className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] text-slate-300 text-sm whitespace-pre-wrap">
              {result.response}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Claims</p>
              <p className="text-2xl font-bold text-white">{result.summary?.total_claims || 0}</p>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-green-500/30 p-5 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Accurate</p>
              <p className="text-2xl font-bold text-green-400">{result.summary?.accurate || 0}</p>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-red-500/30 p-5 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Hallucinated</p>
              <p className="text-2xl font-bold text-red-400">{result.summary?.hallucinated || 0}</p>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-amber-500/30 p-5 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Outdated</p>
              <p className="text-2xl font-bold text-amber-400">{result.summary?.outdated || 0}</p>
            </div>
          </div>

          {result.claims && result.claims.length > 0 && (
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Extracted Claims</h4>
              <div className="space-y-3">
                {result.claims.map((claim, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${statusColors[claim.status] || 'border-[#1E293B]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[claim.status]}`}>
                        {claim.status}
                      </span>
                      <span className="text-xs text-slate-500">{claim.claim_type}</span>
                    </div>
                    <p className="text-sm text-white">{claim.claim_text}</p>
                    {claim.ground_truth_value && claim.status !== 'accurate' && (
                      <p className="text-xs mt-1">
                        <span className="text-slate-400">Correct: </span>
                        <span className="text-green-400">{claim.ground_truth_value}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
