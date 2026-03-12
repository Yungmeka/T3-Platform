import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const BACKEND = 'http://localhost:8000';

export default function ContentGenerator({ brand }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*').eq('brand_id', brand.id);
      setProducts(data || []);
      setSelectedProduct(data?.[0] || null);
      setResult(null);
    }
    fetchProducts();
  }, [brand.id]);

  async function generate() {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/content/generate/${selectedProduct.id}`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch { setResult({ error: 'Backend not running' }); }
    setLoading(false);
  }

  const content = result?.generated_content;
  const validation = result?.validation;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Content Generator</h2>
        <p className="text-sm text-slate-500">Generate AI-optimized content for {brand.name}'s products</p>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Select Product</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}
              className="w-full bg-[#0B1120] border border-[#253347] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Generating...' : 'Generate Content'}
          </button>
        </div>
      </div>

      {result?.error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">{result.error}</div>}

      {content && (
        <div className="space-y-6">
          {/* 3-Step Verification */}
          {validation && (
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">3-Step Verification</h3>
              <div className="flex gap-4">
                {validation.steps_completed.map((step, i) => (
                  <div key={i} className="flex-1 bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        validation.valid || i < 2 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{validation.valid || i < 2 ? '✓' : '!'}</span>
                      <span className="text-xs text-slate-400 font-medium">Step {i + 1}</span>
                    </div>
                    <p className="text-xs text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  validation.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>{validation.valid ? 'Content Approved' : `${validation.issues.length} Issue(s) Found`}</span>
              </div>
            </div>
          )}

          {/* Optimized Description */}
          <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Optimized Description</h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
              {content.optimized_description}
            </p>
          </div>

          {/* Schema.org JSON-LD */}
          <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Schema.org JSON-LD</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(content.schema_jsonld, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-all"
              >
                {copied ? 'Copied!' : 'Copy JSON-LD'}
              </button>
            </div>
            <pre className="text-xs text-cyan-300 bg-[#0B1120] rounded-xl p-4 border border-[#1E293B] overflow-auto max-h-60">
              {JSON.stringify(content.schema_jsonld, null, 2)}
            </pre>
          </div>

          {/* FAQ Content */}
          <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">FAQ Content</h3>
            <div className="space-y-2">
              {(content.faq_content || []).map((faq, i) => (
                <div key={i} className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
                  <p className="text-sm text-white font-medium mb-1">{faq.question}</p>
                  <p className="text-sm text-slate-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Phrases + Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Key Phrases</h3>
              <div className="flex flex-wrap gap-2">
                {(content.key_phrases || []).map((phrase, i) => (
                  <span key={i} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs">{phrase}</span>
                ))}
              </div>
            </div>
            <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Content Recommendations</h3>
              <div className="space-y-2">
                {(content.content_recommendations || []).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5 text-xs">→</span>
                    <p className="text-xs text-slate-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
