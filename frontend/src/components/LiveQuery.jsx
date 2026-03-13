import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Left border color per claim status — hex values used as inline styles
// to avoid Tailwind purging dynamically constructed class names in production.
const claimBorderColor = {
  accurate:    '#10B981',
  hallucinated:'#EF4444',
  outdated:    '#F59E0B',
  missing:     '#CBD5E1',
};

// Badge style per claim status (light theme)
const claimBadgeStyle = {
  accurate:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  hallucinated:'bg-red-50 text-red-700 border border-red-200',
  outdated:    'bg-amber-50 text-amber-700 border border-amber-200',
  missing:     'bg-slate-50 text-slate-600 border border-slate-200',
};

// Claim card background per status (light theme)
const claimCardBg = {
  accurate:    'bg-emerald-50 border-emerald-200',
  hallucinated:'bg-red-50 border-red-200',
  outdated:    'bg-amber-50 border-amber-200',
  missing:     'bg-slate-50 border-slate-200',
};

// Platform display labels
const platformLabel = {
  chatgpt:    'ChatGPT',
  gemini:     'Gemini',
  perplexity: 'Perplexity',
  copilot:    'Copilot',
};

// Platform accent colors (light header bar gradient)
const platformGradient = {
  chatgpt:    'from-emerald-100 to-teal-50',
  gemini:     'from-blue-100 to-indigo-50',
  perplexity: 'from-sky-100 to-cyan-50',
  copilot:    'from-violet-100 to-purple-50',
};

export default function LiveQuery({ brand }) {
  const [query, setQuery]                 = useState('');
  const [platform, setPlatform]           = useState('chatgpt');
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
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
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="mb-2">
        <h2
          className="text-2xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Live AI Query
        </h2>
        <p className="text-sm text-slate-500">
          Query AI platforms and analyze how{' '}
          <span className="text-violet-600 font-medium">{brand.name}</span> is represented
        </p>
      </div>

      {/* ── Query Input Panel ── */}
      <div className="card p-6">

        {/* Input row */}
        <div className="flex gap-3 mb-5">

          {/* Text input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            placeholder={`e.g., "Best products from ${brand.name}..."`}
            className="flex-1 px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:outline-none transition-all duration-200 bg-white border border-slate-200 rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
          />

          {/* Platform selector */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-4 py-3 text-slate-800 text-sm focus:outline-none cursor-pointer transition-all duration-200 bg-white border border-slate-200 rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            style={{ minWidth: '130px' }}
          >
            <option value="chatgpt">ChatGPT</option>
            <option value="gemini">Gemini</option>
            <option value="perplexity">Perplexity</option>
            <option value="copilot">Copilot</option>
          </select>

          {/* Run Query button */}
          <button
            onClick={runQuery}
            disabled={loading || !query.trim()}
            className={`
              px-6 py-3 rounded-lg font-semibold text-sm text-white
              bg-gradient-to-r from-violet-500 to-pink-500
              transition-all duration-200
              hover:shadow-lg hover:scale-[1.02]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none
              ${loading ? 'animate-pulse' : ''}
            `}
            style={{ fontFamily: "'Outfit', sans-serif", minWidth: '120px' }}
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Querying...
              </span>
            ) : (
              'Run Query'
            )}
          </button>
        </div>

        {/* Suggested queries */}
        {suggestedQueries.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Suggested queries
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q.query_text)}
                  className="px-3 py-1.5 text-slate-500 text-[11px] font-medium transition-all duration-200 hover:text-violet-600 bg-white border border-slate-200 rounded-lg hover:border-violet-300 cursor-pointer"
                >
                  {q.query_text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Error State ── */}
      {result && result.error && (
        <div className="card border-red-200 bg-red-50 rounded-2xl p-5 animate-fade-in flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-600" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Query Failed
            </p>
            <p className="text-sm text-red-500 mt-0.5">{result.error}</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && !result.error && (
        <div className="space-y-6">

          {/* AI Response box */}
          <div
            className="card overflow-hidden animate-fade-in"
            style={{ animationDelay: '0ms' }}
          >
            {/* Gradient header bar */}
            <div className={`bg-gradient-to-r ${platformGradient[result.platform] || 'from-sky-100 to-indigo-50'} px-6 py-3 border-b border-slate-200 flex items-center gap-3`}>
              <span
                className="text-xs font-bold uppercase tracking-widest text-slate-500"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                AI Response
              </span>
              <span className="badge-purple px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {platformLabel[result.platform] || result.platform}
              </span>
            </div>
            <div className="p-6">
              <div className="inner-card p-4 text-slate-600 text-sm whitespace-pre-wrap leading-relaxed" style={{ borderRadius: '14px' }}>
                {result.response}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in"
            style={{ animationDelay: '80ms' }}
          >
            {/* Total Claims */}
            <div className="card rounded-2xl p-5 text-center">
              <p
                className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-3"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Total Claims
              </p>
              <p
                className="text-3xl font-bold text-violet-600"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {result.summary?.total_claims || 0}
              </p>
            </div>

            {/* Accurate */}
            <div className="card rounded-2xl p-5 text-center">
              <p
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Accurate
              </p>
              <p
                className="text-3xl font-bold text-emerald-600"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {result.summary?.accurate || 0}
              </p>
            </div>

            {/* Hallucinated */}
            <div className="card rounded-2xl p-5 text-center">
              <p
                className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-3"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Hallucinated
              </p>
              <p
                className="text-3xl font-bold text-red-600"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {result.summary?.hallucinated || 0}
              </p>
            </div>

            {/* Outdated */}
            <div className="card rounded-2xl p-5 text-center">
              <p
                className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-3"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Outdated
              </p>
              <p
                className="text-3xl font-bold text-amber-600"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {result.summary?.outdated || 0}
              </p>
            </div>
          </div>

          {/* Extracted Claims */}
          {result.claims && result.claims.length > 0 && (
            <div
              className="card p-6 animate-fade-in"
              style={{ animationDelay: '160ms' }}
            >
              <h4
                className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-widest"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Extracted Claims
              </h4>
              <div className="space-y-3">
                {result.claims.map((claim, i) => (
                  <div
                    key={i}
                    className={`
                      border
                      ${claimCardBg[claim.status] || 'bg-slate-50 border-slate-200'}
                      p-4 animate-fade-in
                    `}
                    style={{
                      borderLeft: `4px solid ${claimBorderColor[claim.status] || claimBorderColor.missing}`,
                      borderRadius: '14px',
                      animationDelay: `${160 + i * 50}ms`,
                    }}
                  >
                    {/* Status badge + claim type */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`
                          px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          ${claimBadgeStyle[claim.status] || claimBadgeStyle.missing}
                        `}
                      >
                        {claim.status}
                      </span>
                      {claim.claim_type && (
                        <span className="badge-purple px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider">
                          {claim.claim_type}
                        </span>
                      )}
                    </div>

                    {/* Claim text */}
                    <p className="text-sm text-slate-700 leading-relaxed">{claim.claim_text}</p>

                    {/* Ground truth — highlighted accent box */}
                    {claim.ground_truth_value && claim.status !== 'accurate' && (
                      <div className="mt-3 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                        <svg className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs leading-relaxed">
                          <span className="text-slate-500 mr-1">Correct value:</span>
                          <span className="text-emerald-600 font-semibold">{claim.ground_truth_value}</span>
                        </p>
                      </div>
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
