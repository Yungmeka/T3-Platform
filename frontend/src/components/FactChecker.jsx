import { useState } from 'react';

const statusColors = {
  verified:        { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-50 border border-emerald-200 text-emerald-700' },
  accurate:        { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-50 border border-emerald-200 text-emerald-700' },
  unverified:      { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-600',   badge: 'bg-slate-50 border border-slate-200 text-slate-600' },
  likely_incorrect:{ bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-50 border border-red-200 text-red-700' },
  hallucinated:    { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-50 border border-red-200 text-red-700' },
  misleading:      { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-50 border border-amber-200 text-amber-700' },
  outdated:        { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-50 border border-amber-200 text-amber-700' },
  missing:         { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-600',   badge: 'bg-slate-50 border border-slate-200 text-slate-600' },
};

const statusBorderSolid = {
  verified:         '#10B981',
  accurate:         '#10B981',
  unverified:       '#CBD5E1',
  likely_incorrect: '#EF4444',
  hallucinated:     '#EF4444',
  misleading:       '#F59E0B',
  outdated:         '#F59E0B',
  missing:          '#CBD5E1',
};

function TrustGauge({ score }) {
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const glowColor = score >= 70
    ? 'rgba(16, 185, 129, 0.35)'
    : score >= 40
    ? 'rgba(245, 158, 11, 0.35)'
    : 'rgba(239, 68, 68, 0.35)';
  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center relative">
      <div
        className="rounded-full"
        style={{
          filter: `drop-shadow(0 0 18px ${glowColor}) drop-shadow(0 0 6px ${glowColor})`,
        }}
      >
        <svg width="160" height="160" className="-rotate-90">
          <circle cx="80" cy="80" r="60" fill="none" stroke="#E2E8F0" strokeWidth="10" />
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000"
          />
        </svg>
      </div>
      <div className="absolute mt-12 text-center">
        <p
          className="text-4xl font-bold"
          style={{ color, fontFamily: "'Outfit', sans-serif" }}
        >
          {score}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">Trust Score</p>
      </div>
    </div>
  );
}

export default function FactChecker({ brand }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const exampleTexts = [
    "The Dell Inspiron 16 is the best laptop under $800 with 32GB RAM, a 16-inch display, and Intel Core i5 processor. It costs $699 with free shipping.",
    "NFL+ costs $9.99/month and includes all local games. Sunday Ticket is $449/season or $199 for students.",
    "HEB offers free curbside pickup on all orders and same-day delivery across all of Texas.",
  ];

  async function check() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/fact-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text: input, brandName: brand?.name || '' }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Fact check error:', err);
      setResult({ error: 'Fact check failed. Please try again.' });
    }
    setLoading(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2
            className="text-xl font-bold text-slate-800 mb-1"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            AI Shopping Fact-Checker
          </h2>
          <p className="text-sm text-slate-500">
            Paste any AI recommendation and get a trust score — built for consumers
          </p>
        </div>
        {/* Powered by T3 badge */}
        <span
          className="inner-card flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase shrink-0 ml-4 mt-0.5"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '0.12em' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
          Powered by T3
        </span>
      </div>

      {/* Input card */}
      <div className="card p-6 mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste an AI shopping recommendation here..."
          rows={5}
          className="w-full px-4 py-3 text-slate-800 text-sm placeholder-slate-400 resize-none mb-4 focus:outline-none transition-all duration-200 bg-white border border-slate-200 rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
          style={{ fontFamily: 'inherit' }}
        />

        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Example buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500 mr-1 py-1">Try:</span>
            {exampleTexts.map((text, i) => (
              <button
                key={i}
                onClick={() => setInput(text)}
                className="px-3 py-1.5 text-slate-500 text-[11px] font-medium transition-all duration-200 hover:text-violet-600 bg-white border border-slate-200 rounded-lg hover:border-violet-300"
              >
                Example {i + 1}
              </button>
            ))}
          </div>

          {/* Submit button */}
          <button
            onClick={check}
            disabled={loading || !input.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg font-semibold text-sm disabled:opacity-40 transition-all duration-300 shrink-0 hover:shadow-lg hover:-translate-y-px"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Checking...
              </span>
            ) : (
              'Check This Recommendation'
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {result?.error && (
        <div className="card border-red-200 p-4 text-red-600 text-sm animate-fade-in bg-red-50">
          {result.error}
        </div>
      )}

      {/* Results */}
      {result && !result.error && (
        <div className="space-y-6 animate-fade-in">

          {/* Score + Summary row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* TrustGauge card */}
            <div className="card p-6 flex flex-col items-center justify-center relative">
              <TrustGauge score={result.trust_score} />
              <p
                className="text-[10px] text-slate-500 uppercase tracking-widest mt-4"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '0.15em' }}
              >
                Reliability Rating
              </p>
            </div>

            {/* Summary card */}
            <div className="card lg:col-span-2 p-6 flex flex-col gap-4">
              <h3
                className="text-sm font-semibold text-slate-800"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Summary
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>

              {/* Red flags */}
              {result.red_flags &&
                result.red_flags.length > 0 &&
                result.red_flags[0] !== 'No major red flags detected' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p
                      className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      Red Flags
                    </p>
                    <ul className="space-y-1">
                      {result.red_flags.map((flag, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">&#9888;</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Advice */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <p
                  className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  What You Should Do
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{result.overall_advice}</p>
              </div>
            </div>
          </div>

          {/* Claims analysis card */}
          <div className="card p-6">
            <h3
              className="text-sm font-semibold text-slate-800 mb-5"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Claims Analysis
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({result.claims?.length || 0} claims found)
              </span>
            </h3>

            <div className="space-y-3">
              {(result.claims || []).map((claim, i) => {
                const s = statusColors[claim.status] || statusColors.unverified;
                const borderColor = statusBorderSolid[claim.status] || statusBorderSolid.unverified;
                return (
                  <div
                    key={i}
                    className={`p-4 transition-all duration-200 border ${s.border} ${s.bg} rounded-2xl`}
                    style={{
                      borderLeft: `4px solid ${borderColor}`,
                      borderRadius: '14px',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold capitalize ${s.badge}`}
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        {claim.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 mb-1 leading-snug">{claim.claim}</p>
                    <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">{claim.explanation}</p>
                    <p className="text-xs text-violet-600 leading-relaxed">{claim.suggestion}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
