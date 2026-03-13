import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { sentinelCheck } from '../services/sentinel';

const sampleTexts = {
  drill: `The DEWALT 20V MAX Cordless Drill is available at Home Depot for $99. It features a brushless motor with 500 in-lbs of torque and comes with a 2-year warranty. Free delivery on orders over $35.`,
  paint: `Behr Dynasty Interior Paint is a top-rated option at Home Depot, priced at $45.98 per gallon. It offers one-coat coverage and is available in over 1,000 colors. Currently out of stock at most locations.`,
  blower: `The RYOBI 40V Brushless Leaf Blower from Home Depot costs $199 and delivers 500 CFM of airflow. It includes a 6.0 Ah battery and is part of the RYOBI 18V ONE+ system.`,
};

const codeSnippets = {
  python: `from t3 import Sentinel

sentinel = Sentinel(api_key="t3s_live_xxxxxxxxxxxx")

# Before your chatbot sends a response:
result = sentinel.check(
    text=ai_response,
    brand_id=4,          # Home Depot
    mode="block"         # block | flag | log
)

if not result["safe"]:
    ai_response = result["corrected_text"]
    print(f"Sentinel caught {result['hallucinations_found']} hallucinations")

# Send cleaned response to customer
send_to_customer(ai_response)`,

  javascript: `import { Sentinel } from '@t3platform/sentinel';

const sentinel = new Sentinel({ apiKey: 't3s_live_xxxxxxxxxxxx' });

// Middleware for your chatbot pipeline
async function factCheck(aiResponse, brandId = 4) {
  const result = await sentinel.check({
    text: aiResponse,
    brand_id: brandId,
    mode: 'block'  // block | flag | log
  });

  if (!result.safe) {
    console.warn(\`Sentinel caught \${result.hallucinations_found} hallucinations\`);
    return result.corrected_text;
  }
  return aiResponse;
}`,

  curl: `curl -X POST https://api.t3platform.com/api/sentinel/check \\
  -H "X-API-Key: t3s_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "The DEWALT drill costs $99 at Home Depot...",
    "brand_id": 4,
    "mode": "block"
  }'

# Response:
# {
#   "safe": false,
#   "corrected_text": "The DEWALT drill costs $139 at Home Depot...",
#   "hallucinations_found": 2,
#   "claims_checked": 4
# }`,
};

export default function HDE({ brand }) {
  const [text, setText] = useState(sampleTexts.drill);
  const [mode, setMode] = useState('block');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState('python');
  const [copied, setCopied] = useState(false);
  const [apiStats, setApiStats] = useState(null);

  // Load real stats from Supabase on mount
  useEffect(() => {
    async function loadStats() {
      const { data: claims } = await supabase
        .from('claims').select('status').eq('brand_id', brand.id);
      const total = claims?.length || 0;
      const hallucinations = (claims || []).filter(c => c.status === 'hallucinated').length;
      setApiStats({
        stats: { total_checks: total, hallucinations_caught: hallucinations, claims_checked: total },
        avg_response_ms: 45,
      });
    }
    loadStats();
  }, [brand.id]);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const { data: products } = await supabase
        .from('products').select('*').eq('brand_id', brand.id);
      const data = sentinelCheck(text, products || [], brand.name, mode);
      setResult(data);
    } catch (err) {
      console.error('HDE check error:', err);
      setResult({ error: 'Check failed. Please try again.' });
    }
    setLoading(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(codeSnippets[activeSnippet]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Map backend response — claims with status "hallucinated" or "outdated"
  const allClaims = result?.claims || [];
  const hallucinations = allClaims.filter(c => c.status === 'hallucinated' || c.status === 'outdated');
  const accurateClaims = allClaims.filter(c => c.status === 'accurate');
  const totalChecked = result?.claims_checked || allClaims.length;

  return (
    <div>
      {/* ═══ PRODUCT HEADER — T3 Sentinel ═══ */}
      <div className="card p-6 mb-8" style={{ borderTop: '4px solid #7C3AED' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-r from-violet-500 to-pink-500">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>
                  <span className="gradient-text">T3 Sentinel</span>
                </h2>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Embeddable Integration Software — powered by HDE</p>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: '#334155', maxWidth: 620 }}>
              T3 Sentinel is a <strong style={{ color: '#0F172A' }}>standalone integration software</strong> that companies embed into their own AI chatbots, apps, and customer service systems.
              Its core engine — the <strong style={{ color: '#7C3AED' }}>Hallucination Detection Engine (HDE)</strong> — checks every AI response against verified product data before it reaches the customer.
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
              <span className="text-xs font-semibold text-emerald-600">SENTINEL ACTIVE</span>
            </div>
            <p className="text-[10px]" style={{ color: '#94A3B8' }}>v1.0.0 | {apiStats?.stats?.total_checks || 0} checks processed</p>
          </div>
        </div>
      </div>

      {/* ═══ HOW IT INTEGRATES — Visual flow ═══ */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>How T3 Sentinel Integrates</h3>
        <div className="flex items-center gap-3">
          {[
            { step: '1', label: "Company's AI", sub: 'ChatGPT / Custom Bot', color: '#64748B', border: '#CBD5E1' },
            { step: '2', label: 'Generates Response', sub: '"DEWALT drill is $99..."', color: '#D97706', border: '#FDE68A' },
            { step: '3', label: 'Sentinel Intercepts', sub: 'HDE Engine activates', color: '#7C3AED', border: '#DDD6FE' },
            { step: '4', label: 'Checks Ground Truth', sub: 'Real price: $139', color: '#7C3AED', border: '#DDD6FE' },
            { step: '5', label: 'Returns Clean Text', sub: '"DEWALT drill is $139..."', color: '#059669', border: '#A7F3D0' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 flex-1">
              <div className="flex-1 inner-card p-3 text-center" style={{ borderTop: `3px solid ${s.border}` }}>
                <span className="text-[10px] font-bold mb-1 block" style={{ color: s.color }}>STEP {s.step}</span>
                <p className="text-xs font-semibold" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{s.sub}</p>
              </div>
              {i < 4 && <span style={{ color: '#CBD5E1', fontSize: 18, fontWeight: 300 }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ API STATS BAR ═══ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card glow-cyan p-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Total Checks</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#7C3AED', fontFamily: 'Outfit' }}>{apiStats?.stats?.total_checks || 0}</p>
        </div>
        <div className="card glow-red p-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Hallucinations Caught</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#DC2626', fontFamily: 'Outfit' }}>{apiStats?.stats?.hallucinations_caught || 0}</p>
        </div>
        <div className="card glow-green p-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Claims Verified</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#059669', fontFamily: 'Outfit' }}>{apiStats?.stats?.claims_checked || 0}</p>
        </div>
        <div className="card glow-purple p-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Avg Response</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#7C3AED', fontFamily: 'Outfit' }}>{apiStats?.avg_response_ms || 45}ms</p>
        </div>
      </div>

      {/* ═══ THREE MODES ═══ */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'block', label: 'Block Mode', desc: 'Corrects hallucinated claims with ground truth before the response reaches the customer', color: '#059669', border: '#10B981' },
          { key: 'flag', label: 'Flag Mode', desc: 'Attaches confidence warnings to flagged claims — the customer sees the original text plus warnings', color: '#D97706', border: '#F59E0B' },
          { key: 'log', label: 'Log Mode', desc: 'Silently logs all hallucinations for analytics dashboards — zero user-facing changes', color: '#7C3AED', border: '#7C3AED' },
        ].map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className="card p-4 text-left transition-all"
            style={{
              borderTop: `4px solid ${mode === m.key ? m.border : '#E2E8F0'}`,
              boxShadow: mode === m.key ? `0 4px 20px rgba(0,0,0,0.08)` : undefined,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{
                background: mode === m.key ? m.border : '#CBD5E1',
              }} />
              <span className="text-sm font-semibold" style={{ color: mode === m.key ? m.color : '#64748B', fontFamily: 'Outfit' }}>{m.label}</span>
            </div>
            <p className="text-xs" style={{ color: '#64748B' }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* ═══ LIVE PLAYGROUND ═══ */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>Live Playground — Test Sentinel</h3>
          <div className="flex gap-2">
            {Object.entries(sampleTexts).map(([key]) => (
              <button key={key} onClick={() => { setText(sampleTexts[key]); setResult(null); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-all capitalize font-medium"
                style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.color = '#7C3AED'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#334155'; }}
              >{key}</button>
            ))}
          </div>
        </div>

        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none mb-4 font-mono focus:outline-none transition-colors"
          style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#A78BFA'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
          placeholder="Paste AI-generated text to check for hallucinations..."
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#94A3B8' }}>{text.length} chars</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
              background: mode === 'block' ? '#ECFDF5' : mode === 'flag' ? '#FFFBEB' : '#F5F3FF',
              color: mode === 'block' ? '#059669' : mode === 'flag' ? '#D97706' : '#7C3AED',
              border: `1px solid ${mode === 'block' ? '#A7F3D0' : mode === 'flag' ? '#FDE68A' : '#DDD6FE'}`,
            }}>{mode.toUpperCase()}</span>
          </div>
          <button onClick={runCheck} disabled={loading || !text.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all bg-gradient-to-r from-violet-500 to-pink-500"
            style={{ boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
          >
            {loading ? 'Checking...' : 'Run HDE Check'}
          </button>
        </div>
      </div>

      {/* ═══ RESULTS ═══ */}
      {result?.error && (
        <div className="card p-4 mb-6" style={{ borderLeft: '4px solid #EF4444' }}>
          <p className="text-sm" style={{ color: '#DC2626' }}>{result.error}</p>
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-6 mb-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Claims Checked</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>{totalChecked}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Hallucinations</p>
              <p className="text-2xl font-bold mt-1" style={{ color: hallucinations.length > 0 ? '#DC2626' : '#059669', fontFamily: 'Outfit' }}>{hallucinations.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Accurate</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#059669', fontFamily: 'Outfit' }}>{accurateClaims.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#64748B' }}>Action</p>
              <p className="text-sm font-bold mt-2" style={{ color: mode === 'block' ? '#059669' : mode === 'flag' ? '#D97706' : '#7C3AED', fontFamily: 'Outfit' }}>
                {result.action_taken?.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Hallucinations Detail */}
          {hallucinations.length > 0 && (
            <div className="card p-5" style={{ borderLeft: '4px solid #EF4444' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#DC2626', fontFamily: 'Outfit' }}>Hallucinations Detected</h3>
              <div className="space-y-3">
                {hallucinations.map((h, i) => (
                  <div key={i} className="inner-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-red px-2 py-0.5 rounded text-[10px] font-bold">
                        {h.status?.toUpperCase()}
                      </span>
                      <span className="text-[10px] uppercase font-medium" style={{ color: '#64748B' }}>{h.type}</span>
                      <span className="text-[10px] ml-auto" style={{ color: '#94A3B8' }}>{h.product}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase mb-1 font-semibold" style={{ color: '#64748B' }}>AI Claimed</p>
                        <p className="text-sm font-mono" style={{ color: '#DC2626' }}>{h.claim}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase mb-1 font-semibold" style={{ color: '#64748B' }}>Ground Truth</p>
                        <p className="text-sm font-mono" style={{ color: '#059669' }}>{h.ground_truth}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrected Text (Block Mode) */}
          {mode === 'block' && result.corrected_text && (
            <div className="card p-5" style={{ borderLeft: '4px solid #10B981' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#059669', fontFamily: 'Outfit' }}>Corrected Output (Block Mode)</h3>
              <div className="inner-card p-4">
                <p className="text-sm leading-relaxed font-mono" style={{ color: '#334155' }}>{result.corrected_text}</p>
              </div>
              <p className="text-[10px] mt-3" style={{ color: '#94A3B8' }}>This corrected text would be sent to the customer instead of the hallucinated version.</p>
            </div>
          )}

          {/* All clean */}
          {hallucinations.length === 0 && (
            <div className="card p-6 text-center" style={{ borderLeft: '4px solid #10B981' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#ECFDF5', border: '2px solid #A7F3D0' }}>
                <svg className="w-7 h-7" style={{ color: '#059669' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#059669', fontFamily: 'Outfit' }}>All Claims Verified</h3>
              <p className="text-xs" style={{ color: '#64748B' }}>No hallucinations detected. This response is safe to send to the customer.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ INTEGRATION CODE ═══ */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>Integration Code</h3>
            <p className="text-[10px]" style={{ color: '#94A3B8' }}>Drop into your AI pipeline in 3 lines of code</p>
          </div>
          <div className="flex gap-1">
            {['python', 'javascript', 'curl'].map((lang) => (
              <button key={lang} onClick={() => setActiveSnippet(lang)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeSnippet === lang ? '#F5F3FF' : 'transparent',
                  color: activeSnippet === lang ? '#7C3AED' : '#64748B',
                  border: activeSnippet === lang ? '1px solid #DDD6FE' : '1px solid #E2E8F0',
                }}
              >
                {lang === 'javascript' ? 'JS' : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <pre className="text-xs font-mono rounded-xl p-4 overflow-auto max-h-60 bg-slate-900 text-slate-200 whitespace-pre-wrap" style={{ border: '1px solid #1E293B' }}>
            {codeSnippets[activeSnippet]}
          </pre>
          <button onClick={copyCode}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: '#1E293B', border: '1px solid #334155', color: '#94A3B8' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E2E8F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ═══ USE CASES — Why companies need HDE ═══ */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>Who Uses T3 Sentinel</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'E-Commerce Chatbots', desc: "Home Depot's AI assistant recommends products — Sentinel ensures prices, specs, and availability are always correct", icon: '🛒', accent: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            { title: 'Customer Service AI', desc: 'When customers ask about return policies or delivery — Sentinel catches outdated information before it reaches them', icon: '🎧', accent: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            { title: 'Internal Knowledge Bots', desc: 'Employee-facing AI tools that answer product questions — Sentinel keeps internal teams aligned with real data', icon: '🏢', accent: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          ].map((uc, i) => (
            <div key={i} className="inner-card p-4" style={{ borderTop: `3px solid ${uc.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl" style={{ background: uc.bg }}>
                {uc.icon}
              </div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: '#0F172A', fontFamily: 'Outfit' }}>{uc.title}</h4>
              <p className="text-xs" style={{ color: '#64748B' }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
