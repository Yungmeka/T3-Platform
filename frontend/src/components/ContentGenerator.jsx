import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const BACKEND = 'http://localhost:8000';

const contentTypes = [
  { id: 'schema', name: 'Schema.org', desc: 'JSON-LD markup for AI crawlers', color: 'cyan' },
  { id: 'press_release', name: 'Press Release', desc: 'PR for AI-indexed channels', color: 'purple' },
  { id: 'reddit', name: 'Reddit Post', desc: 'Community content AI cites', color: 'orange' },
  { id: 'pitch_email', name: 'Blogger Pitch', desc: 'Outreach for review content', color: 'pink' },
  { id: 'faq', name: 'FAQ Content', desc: 'FAQ schema for AI answers', color: 'green' },
];

export default function ContentGenerator({ brand }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeType, setActiveType] = useState('schema');
  const [actionResult, setActionResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Original generate state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('action'); // 'action' or 'optimize'

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*').eq('brand_id', brand.id);
      setProducts(data || []);
      setSelectedProduct(data?.[0] || null);
      setResult(null);
      setActionResult(null);
    }
    fetchProducts();
  }, [brand.id]);

  async function generateAction() {
    if (!selectedProduct) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch(`${BACKEND}/api/content/action/${selectedProduct.id}/${activeType}`, { method: 'POST' });
      const data = await res.json();
      setActionResult(data);
    } catch { setActionResult({ error: 'Backend not running' }); }
    setActionLoading(false);
  }

  async function generateOptimized() {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/content/generate/${selectedProduct.id}`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch { setResult({ error: 'Backend not running' }); }
    setLoading(false);
  }

  function copyContent() {
    navigator.clipboard.writeText(actionResult?.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const content = result?.generated_content;
  const validation = result?.validation;

  return (
    <div>
      <div className="mb-8">
        <h2
          className="text-xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: 'Outfit' }}
        >
          Content Action Hub
        </h2>
        <p className="text-sm text-slate-500">
          Generate ready-to-publish content that gets {brand.name} into AI shopping answers
        </p>
      </div>

      {/* Product Selector */}
      <div className="card rounded-2xl p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Select Product
            </label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)));
                setActionResult(null);
                setResult(null);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-violet-400"
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('action')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeView === 'action'
                  ? 'bg-violet-50 text-violet-600 border border-violet-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Action Hub
            </button>
            <button
              onClick={() => setActiveView('optimize')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeView === 'optimize'
                  ? 'bg-violet-50 text-violet-600 border border-violet-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              AI Optimize
            </button>
          </div>
        </div>
      </div>

      {/* ===== ACTION HUB VIEW ===== */}
      {activeView === 'action' && (
        <>
          {/* Content Type Tabs */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {contentTypes.map((ct) => (
              <button
                key={ct.id}
                onClick={() => { setActiveType(ct.id); setActionResult(null); }}
                className={`card rounded-2xl p-4 text-left transition-all ${
                  activeType === ct.id
                    ? 'border-violet-300 bg-violet-50'
                    : 'hover:border-slate-300'
                }`}
              >
                <span className={`text-sm font-semibold ${activeType === ct.id ? 'text-violet-700' : 'text-slate-600'}`}>
                  {ct.name}
                </span>
                <p className="text-xs text-slate-500 mt-1">{ct.desc}</p>
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={generateAction}
              disabled={actionLoading || !selectedProduct}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {actionLoading ? 'Generating...' : `Generate ${contentTypes.find(c => c.id === activeType)?.name}`}
            </button>
          </div>

          {actionResult?.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm mb-6">
              {actionResult.error}
            </div>
          )}

          {/* Action Result */}
          {actionResult && !actionResult.error && (
            <div className="space-y-4">
              {/* Header */}
              <div className="card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-sm font-semibold text-slate-800"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    {actionResult.title}
                  </h3>
                  <button
                    onClick={copyContent}
                    className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-all"
                  >
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
                {/* Code blocks stay dark */}
                <pre className="text-xs text-slate-200 bg-slate-900 rounded-xl p-4 border border-slate-700 overflow-auto max-h-96 whitespace-pre-wrap font-mono">
                  {actionResult.content}
                </pre>
              </div>

              {/* Instructions & Impact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card rounded-2xl p-5">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">How to Use</h4>
                  <p className="text-sm text-slate-600">{actionResult.instructions}</p>
                </div>
                <div className="card rounded-2xl p-5">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">AI Visibility Impact</h4>
                  <p className="text-sm text-violet-600 font-medium">{actionResult.impact}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== OPTIMIZE VIEW (original) ===== */}
      {activeView === 'optimize' && (
        <>
          <div className="flex justify-end mb-6">
            <button
              onClick={generateOptimized}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Generating...' : 'Generate Optimized Content'}
            </button>
          </div>

          {result?.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
              {result.error}
            </div>
          )}

          {content && (
            <div className="space-y-6">
              {validation && (
                <div className="card rounded-2xl p-5">
                  <h3
                    className="text-sm font-semibold text-slate-800 mb-4"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    3-Step Verification
                  </h3>
                  <div className="flex gap-4">
                    {validation.steps_completed.map((step, i) => (
                      <div key={i} className="flex-1 inner-card rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            validation.valid || i < 2
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {validation.valid || i < 2 ? '✓' : '!'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">Step {i + 1}</span>
                        </div>
                        <p className="text-xs text-slate-600">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      validation.valid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {validation.valid ? 'Content Approved' : `${validation.issues.length} Issue(s) Found`}
                    </span>
                  </div>
                </div>
              )}

              <div className="card rounded-2xl p-5">
                <h3
                  className="text-sm font-semibold text-slate-800 mb-3"
                  style={{ fontFamily: 'Outfit' }}
                >
                  Optimized Description
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed inner-card rounded-xl p-4">
                  {content.optimized_description}
                </p>
              </div>

              <div className="card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-sm font-semibold text-slate-800"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    Schema.org JSON-LD
                  </h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(content.schema_jsonld, null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-violet-600 hover:text-violet-700 text-xs font-medium transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy JSON-LD'}
                  </button>
                </div>
                {/* Code block stays dark */}
                <pre className="text-xs text-slate-200 bg-slate-900 rounded-xl p-4 border border-slate-700 overflow-auto max-h-60">
                  {JSON.stringify(content.schema_jsonld, null, 2)}
                </pre>
              </div>

              <div className="card rounded-2xl p-5">
                <h3
                  className="text-sm font-semibold text-slate-800 mb-3"
                  style={{ fontFamily: 'Outfit' }}
                >
                  FAQ Content
                </h3>
                <div className="space-y-2">
                  {(content.faq_content || []).map((faq, i) => (
                    <div key={i} className="inner-card rounded-xl p-4">
                      <p className="text-sm text-slate-800 font-medium mb-1">{faq.question}</p>
                      <p className="text-sm text-slate-500">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card rounded-2xl p-5">
                  <h3
                    className="text-sm font-semibold text-slate-800 mb-3"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    Key Phrases
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(content.key_phrases || []).map((phrase, i) => (
                      <span key={i} className="badge-purple px-3 py-1.5 rounded-lg text-xs">{phrase}</span>
                    ))}
                  </div>
                </div>
                <div className="card rounded-2xl p-5">
                  <h3
                    className="text-sm font-semibold text-slate-800 mb-3"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    Content Recommendations
                  </h3>
                  <div className="space-y-2">
                    {(content.content_recommendations || []).map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-violet-500 mt-0.5 text-xs">→</span>
                        <p className="text-xs text-slate-600">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
