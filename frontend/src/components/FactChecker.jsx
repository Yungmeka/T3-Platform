import { useState } from 'react';

const BACKEND = 'http://localhost:8000';

const statusColors = {
  verified: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
  unverified: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
  likely_incorrect: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  misleading: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
};

function TrustGauge({ score }) {
  const color = score >= 70 ? '#4ADE80' : score >= 40 ? '#FBBF24' : '#F87171';
  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" className="-rotate-90">
        <circle cx="80" cy="80" r="60" fill="none" stroke="#1E293B" strokeWidth="10" />
        <circle cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute mt-12 text-center">
        <p className="text-4xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-slate-500">Trust Score</p>
      </div>
    </div>
  );
}

export default function FactChecker() {
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
      const res = await fetch(`${BACKEND}/api/factcheck/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation: input }),
      });
      setResult(await res.json());
    } catch { setResult({ error: 'Backend not running' }); }
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">AI Shopping Fact-Checker</h2>
        <p className="text-sm text-slate-500">Paste any AI recommendation and get a trust score — built for consumers</p>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste an AI shopping recommendation here..."
          rows={5}
          className="w-full bg-[#0B1120] border border-[#253347] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none mb-4"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-slate-500 mr-1 py-1">Try:</span>
            {exampleTexts.map((text, i) => (
              <button key={i} onClick={() => setInput(text)}
                className="px-3 py-1 bg-[#1A2332] text-slate-400 rounded-lg text-[11px] hover:bg-[#253347] transition-colors"
              >Example {i + 1}</button>
            ))}
          </div>
          <button onClick={check} disabled={loading || !input.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >{loading ? 'Checking...' : 'Check This Recommendation'}</button>
        </div>
      </div>

      {result?.error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">{result.error}</div>}

      {result && !result.error && (
        <div className="space-y-6">
          {/* Score + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 flex flex-col items-center justify-center relative">
              <TrustGauge score={result.trust_score} />
            </div>
            <div className="lg:col-span-2 bg-[#111827] rounded-2xl border border-[#1E293B] p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Summary</h3>
              <p className="text-sm text-white mb-4">{result.summary}</p>

              {result.red_flags && result.red_flags.length > 0 && result.red_flags[0] !== 'No major red flags detected' && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                  <p className="text-xs text-red-400 font-medium mb-2">Red Flags</p>
                  {result.red_flags.map((flag, i) => (
                    <p key={i} className="text-xs text-red-300 py-0.5">⚠ {flag}</p>
                  ))}
                </div>
              )}

              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <p className="text-xs text-cyan-400 font-medium mb-2">What You Should Do</p>
                <p className="text-xs text-slate-300">{result.overall_advice}</p>
              </div>
            </div>
          </div>

          {/* Claims */}
          <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Claims Analysis ({result.claims?.length || 0} claims found)</h3>
            <div className="space-y-3">
              {(result.claims || []).map((claim, i) => {
                const s = statusColors[claim.status] || statusColors.unverified;
                return (
                  <div key={i} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${s.badge}`}>{claim.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-white mb-1">{claim.claim}</p>
                    <p className="text-xs text-slate-400 mb-1">{claim.explanation}</p>
                    <p className="text-xs text-cyan-400">{claim.suggestion}</p>
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
