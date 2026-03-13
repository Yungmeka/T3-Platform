import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { runFullScan } from '../services/sentinel';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const CONTENT_TYPES = ['schema', 'press_release', 'reddit', 'pitch_email', 'faq'];

const CONTENT_TYPE_LABELS = {
  schema: 'Schema JSON-LD',
  press_release: 'Press Release',
  reddit: 'Reddit Post',
  pitch_email: 'Blogger Pitch',
  faq: 'FAQ Schema',
};

const CONTENT_TYPE_ICONS = {
  schema: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  press_release: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  ),
  reddit: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  pitch_email: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  faq: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  ),
};

const IMPACT_COLORS = {
  'Very High': { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', text: '#7C3AED' },
  'High': { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#059669' },
  'Medium-High': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#D97706' },
  'Medium': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', text: '#64748B' },
};

const PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot'];

/* ─── Step Definitions ──────────────────────────────────────────────────── */

const STEPS = [
  {
    id: 'scan',
    label: 'Scanning Platforms',
    sublabel: 'Querying ChatGPT, Gemini, Perplexity & Copilot',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    id: 'gaps',
    label: 'Analyzing Gaps',
    sublabel: 'Identifying visibility gaps and hallucinations',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    id: 'generate',
    label: 'Generating Content',
    sublabel: 'Creating 5 content types for every product',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    id: 'done',
    label: 'Package Ready',
    sublabel: 'All content generated and ready to deploy',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

/* ─── Sub-components ────────────────────────────────────────────────────── */

function CopyButton({ text, label = 'Copy', small = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 font-medium transition-all rounded-lg ${
        small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
      style={{
        background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.08)',
        border: copied ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(124,58,237,0.2)',
        color: copied ? '#059669' : '#7C3AED',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.262c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function Stepper({ currentStep, scanResult }) {
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-start gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < stepIndex || currentStep === 'done';
        const isActive = step.id === currentStep && currentStep !== 'done';
        const isPending = i > stepIndex && currentStep !== 'done';
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-start flex-1">
            <div className="flex flex-col items-center flex-1">
              {/* Circle + connector row */}
              <div className="flex items-center w-full">
                {/* Step circle */}
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    background: isDone || (step.id === 'done' && currentStep === 'done')
                      ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
                      : isActive
                        ? 'rgba(124,58,237,0.12)'
                        : 'rgba(148,163,184,0.12)',
                    border: isActive
                      ? '2px solid #7C3AED'
                      : isDone
                        ? 'none'
                        : '2px solid rgba(148,163,184,0.3)',
                    color: isDone ? '#fff' : isActive ? '#7C3AED' : '#94A3B8',
                    boxShadow: isActive ? '0 0 0 4px rgba(124,58,237,0.12)' : 'none',
                  }}
                >
                  {isDone ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div
                        className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full"
                        style={{ animation: 'spin 0.8s linear infinite' }}
                      />
                    </div>
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className="flex-1 h-0.5 mx-1 transition-all duration-700"
                    style={{
                      background: i < stepIndex || currentStep === 'done'
                        ? 'linear-gradient(90deg, #7C3AED, #EC4899)'
                        : '#E2E8F0',
                    }}
                  />
                )}
              </div>

              {/* Label below */}
              <div className="mt-2 text-center px-1">
                <p
                  className="text-[11px] font-semibold leading-tight"
                  style={{
                    color: isDone || isActive ? '#0F172A' : '#94A3B8',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {step.label}
                </p>
                <p
                  className="text-[10px] mt-0.5 leading-tight hidden sm:block"
                  style={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {step.sublabel}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlatformScanRow({ platform, scanResult }) {
  const details = scanResult?.details || [];
  const platformKey = platform.toLowerCase();
  const platformEntries = details.filter(d => d.platform === platformKey);
  const mentioned = platformEntries.filter(d => d.brand_mentioned).length;
  const total = platformEntries.length;
  const hallucinations = platformEntries.reduce((sum, d) => sum + (d.hallucinations || 0), 0);
  const inclusionPct = total > 0 ? Math.round((mentioned / total) * 100) : 0;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))', color: '#7C3AED', fontFamily: 'Outfit' }}
      >
        {platform[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'DM Sans' }}>{platform}</p>
        <p className="text-[10px]" style={{ color: '#94A3B8', fontFamily: 'DM Sans' }}>
          {total > 0 ? `${mentioned}/${total} queries mention brand` : 'Queried'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: inclusionPct >= 70 ? 'rgba(16,185,129,0.1)' : inclusionPct >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: inclusionPct >= 70 ? '#059669' : inclusionPct >= 40 ? '#D97706' : '#DC2626',
            border: `1px solid ${inclusionPct >= 70 ? 'rgba(16,185,129,0.25)' : inclusionPct >= 40 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
            fontFamily: 'Outfit',
          }}
        >
          {inclusionPct}%
        </div>
        {hallucinations > 0 && (
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'Outfit' }}
          >
            {hallucinations} hal.
          </div>
        )}
      </div>
    </div>
  );
}

function ContentBlock({ contentData, contentType }) {
  const impactStyle = IMPACT_COLORS[contentData.impact] || IMPACT_COLORS['Medium'];

  return (
    <div className="space-y-3">
      {/* Impact + instructions bar */}
      <div className="flex items-start gap-3 flex-wrap">
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
          style={{ background: impactStyle.bg, border: `1px solid ${impactStyle.border}`, color: impactStyle.text, fontFamily: 'Outfit' }}
        >
          {contentData.impact} impact
        </span>
        <p className="text-[11px] flex-1" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
          {contentData.instructions}
        </p>
      </div>

      {/* Content block */}
      <div className="relative">
        <pre
          className="text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto whitespace-pre-wrap"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#334155',
            fontFamily: contentType === 'schema' || contentType === 'faq' ? 'monospace' : 'DM Sans, sans-serif',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {contentData.content}
        </pre>
        <div className="absolute top-2 right-2">
          <CopyButton text={contentData.content} small />
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, contentMap }) {
  const [activeTab, setActiveTab] = useState('schema');

  const activeContent = contentMap[activeTab];

  return (
    <div className="card rounded-2xl overflow-hidden animate-fade-in">
      {/* Product header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(236,72,153,0.03))',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            {product.name?.[0]?.toUpperCase() || 'P'}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {product.name}
            </p>
            <p className="text-[11px]" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
              {product.category || 'Product'} · ${product.price || 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'DM Sans' }}
          >
            {CONTENT_TYPES.length} assets generated
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        {CONTENT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all rounded-t-lg flex-shrink-0"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: activeTab === type ? '#7C3AED' : '#64748B',
              background: activeTab === type ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === type ? '2px solid #7C3AED' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <span style={{ color: activeTab === type ? '#7C3AED' : '#94A3B8' }}>
              {CONTENT_TYPE_ICONS[type]}
            </span>
            {CONTENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeContent ? (
          <ContentBlock contentData={activeContent} contentType={activeTab} />
        ) : (
          <p className="text-sm text-slate-400" style={{ fontFamily: 'DM Sans' }}>No content for this type.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function FullPipeline({ brand }) {
  const [pipelineState, setPipelineState] = useState('idle'); // idle | running | done | error
  const [currentStep, setCurrentStep] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [products, setProducts] = useState([]);
  const [generatedContent, setGeneratedContent] = useState({}); // { productId: { schema: {...}, ... } }
  const [errorMsg, setErrorMsg] = useState('');
  const [copyAllDone, setCopyAllDone] = useState(false);

  const runPipeline = useCallback(async () => {
    setPipelineState('running');
    setErrorMsg('');
    setScanResult(null);
    setProducts([]);
    setGeneratedContent({});

    try {
      // ── STEP 1: Scan all 4 AI platforms ─────────────────────────────
      setCurrentStep('scan');
      const scanRes = await runFullScan(brand);

      if (scanRes?.error) {
        setErrorMsg(scanRes.error);
        setPipelineState('error');
        return;
      }
      setScanResult(scanRes);

      // ── STEP 2: Fetch products + analyze gaps ────────────────────────
      setCurrentStep('gaps');

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('brand_id', brand.id);

      if (productError) throw new Error(productError.message);

      const fetchedProducts = productData || [];
      setProducts(fetchedProducts);

      // Brief pause so user sees the "Analyzing gaps" step
      await new Promise(r => setTimeout(r, 600));

      // ── STEP 3: Generate all 5 content types for every product via AI ──
      setCurrentStep('generate');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const allContent = {};

      for (const product of fetchedProducts) {
        const productContent = {};
        for (const type of CONTENT_TYPES) {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
              body: JSON.stringify({ product, brandName: brand.name, contentType: type }),
            });
            productContent[type] = await res.json();
          } catch (err) {
            productContent[type] = { title: type, content: `Generation failed: ${err.message}`, impact: 'N/A', instructions: 'Try again' };
          }
        }
        allContent[product.id] = productContent;
        setGeneratedContent({ ...allContent });
      }

      setGeneratedContent(allContent);

      // ── STEP 4: Done ─────────────────────────────────────────────────
      setCurrentStep('done');
      setPipelineState('done');
    } catch (err) {
      console.error('Full pipeline error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
      setPipelineState('error');
    }
  }, [brand]);

  // Build the full "copy all" text
  const buildCopyAllText = useCallback(() => {
    const lines = [];
    lines.push(`T3 FULL AI PIPELINE PACKAGE`);
    lines.push(`Brand: ${brand.name}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`${'='.repeat(60)}\n`);

    // Scan summary
    if (scanResult) {
      lines.push(`SCAN SUMMARY`);
      lines.push(`Platforms scanned: ${(scanResult.platforms_queried || []).join(', ')}`);
      lines.push(`Queries run: ${scanResult.queries_run || 0}`);
      lines.push(`Hallucinations found: ${scanResult.hallucinations_found || 0}`);
      lines.push(`Alerts created: ${scanResult.alerts_created || 0}`);
      lines.push(`${'─'.repeat(60)}\n`);
    }

    // Content per product
    for (const product of products) {
      const contentMap = generatedContent[product.id] || {};
      lines.push(`PRODUCT: ${product.name} ($${product.price || 0})`);
      lines.push(`${'─'.repeat(60)}`);

      for (const type of CONTENT_TYPES) {
        const c = contentMap[type];
        if (!c) continue;
        lines.push(`\n[${CONTENT_TYPE_LABELS[type].toUpperCase()}]`);
        lines.push(`Impact: ${c.impact}`);
        lines.push(`Instructions: ${c.instructions}`);
        lines.push('');
        lines.push(c.content);
      }
      lines.push(`\n${'='.repeat(60)}\n`);
    }

    return lines.join('\n');
  }, [brand.name, scanResult, products, generatedContent]);

  const handleCopyAll = useCallback(async () => {
    const text = buildCopyAllText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopyAllDone(true);
    setTimeout(() => setCopyAllDone(false), 2500);
  }, [buildCopyAllText]);

  const handleDownload = useCallback(() => {
    const text = buildCopyAllText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.name.replace(/\s+/g, '_')}_AI_Pipeline_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildCopyAllText, brand.name]);

  const totalAssets = products.length * CONTENT_TYPES.length;

  return (
    <div className="animate-fade-in">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h2
            className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}
          >
            Full AI Pipeline
          </h2>
          <div
            className="px-2.5 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#7C3AED', boxShadow: '0 0 4px rgba(124,58,237,0.6)' }}
            />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#7C3AED', fontFamily: 'DM Sans' }}>ONE-CLICK</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
          Scan all 4 AI platforms, identify gaps, and generate a complete content package for{' '}
          <span style={{ color: '#334155', fontWeight: 600 }}>{brand.name}</span> — in one click.
        </p>
      </div>

      {/* Hero launch card */}
      {pipelineState === 'idle' && (
        <div
          className="rounded-2xl p-8 mb-6 text-center animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(236,72,153,0.04) 50%, rgba(124,58,237,0.06) 100%)',
            border: '1px solid rgba(124,58,237,0.15)',
            boxShadow: '0 4px 24px rgba(124,58,237,0.08)',
          }}
        >
          {/* Feature grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'AI Platforms Scanned', value: '4', icon: '🔍', color: '#7C3AED' },
              { label: 'Content Types Generated', value: '5', icon: '📄', color: '#EC4899' },
              { label: 'Automated Steps', value: '3', icon: '⚡', color: '#7C3AED' },
              { label: 'Time to Complete', value: '~15s', icon: '⏱', color: '#EC4899' },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(124,58,237,0.1)' }}
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div
                  className="text-2xl font-bold mb-0.5"
                  style={{ color: item.color, fontFamily: 'Outfit, sans-serif' }}
                >
                  {item.value}
                </div>
                <div className="text-[10px] font-medium" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* What it does */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center mb-8 flex-wrap">
            {[
              'Scan ChatGPT, Gemini, Perplexity & Copilot',
              'Identify visibility gaps and hallucinations',
              'Generate schema, press releases, Reddit posts, pitch emails & FAQs',
              'Package everything for copy or download',
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #E2E8F0', color: '#334155', fontFamily: 'DM Sans' }}
              >
                <span style={{ color: '#7C3AED' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                {item}
              </div>
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={runPipeline}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base text-white transition-all hover:scale-105 active:scale-100"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4), 0 2px 8px rgba(236,72,153,0.3)',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
            Run Full AI Pipeline
          </button>

          <p className="mt-4 text-[11px]" style={{ color: '#94A3B8', fontFamily: 'DM Sans' }}>
            Scans all platforms, generates content for every product, packages everything in seconds
          </p>
        </div>
      )}

      {/* Running / Done state */}
      {(pipelineState === 'running' || pipelineState === 'done') && (
        <div className="space-y-6">

          {/* Progress stepper card */}
          <div className="card rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-sm font-bold text-slate-800"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {pipelineState === 'done' ? 'Pipeline Complete' : 'Running Pipeline...'}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
                  {pipelineState === 'done'
                    ? `Generated ${totalAssets} content assets across ${products.length} product${products.length !== 1 ? 's' : ''}`
                    : `Executing automated pipeline for ${brand.name}`}
                </p>
              </div>
              {pipelineState === 'done' && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <Stepper currentStep={currentStep} scanResult={scanResult} />
          </div>

          {/* Scan results */}
          {scanResult && (
            <div className="card rounded-2xl p-5 animate-fade-in">
              <h4
                className="text-sm font-bold text-slate-800 mb-4"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Platform Scan Results
              </h4>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Queries Run', value: scanResult.queries_run || 0, color: '#7C3AED' },
                  { label: 'Responses Collected', value: scanResult.responses_collected || 0, color: '#059669' },
                  { label: 'Hallucinations', value: scanResult.hallucinations_found || 0, color: scanResult.hallucinations_found > 0 ? '#DC2626' : '#059669' },
                  { label: 'Alerts Created', value: scanResult.alerts_created || 0, color: scanResult.alerts_created > 0 ? '#D97706' : '#059669' },
                ].map((stat, i) => (
                  <div key={i} className="inner-card rounded-xl p-3 text-center">
                    <p
                      className="text-2xl font-bold"
                      style={{ color: stat.color, fontFamily: 'Outfit, sans-serif' }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Per-platform rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLATFORMS.map(platform => (
                  <PlatformScanRow key={platform} platform={platform} scanResult={scanResult} />
                ))}
              </div>
            </div>
          )}

          {/* Generated content — product cards */}
          {pipelineState === 'done' && products.length > 0 && (
            <>
              {/* Header row with Copy All + Download */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3
                    className="text-base font-bold text-slate-800"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    Generated Content Package
                  </h3>
                  <p className="text-[11px]" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
                    {totalAssets} assets · {products.length} product{products.length !== 1 ? 's' : ''} · 5 content types each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: copyAllDone ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.08)',
                      border: copyAllDone ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(124,58,237,0.2)',
                      color: copyAllDone ? '#059669' : '#7C3AED',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {copyAllDone ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.262c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Copy All
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                      fontFamily: 'DM Sans, sans-serif',
                      boxShadow: '0 2px 10px rgba(124,58,237,0.25)',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Package
                  </button>
                  <button
                    onClick={() => {
                      setPipelineState('idle');
                      setCurrentStep(null);
                      setScanResult(null);
                      setProducts([]);
                      setGeneratedContent({});
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#64748B',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Run Again
                  </button>
                </div>
              </div>

              {/* Product cards */}
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  contentMap={generatedContent[product.id] || {}}
                />
              ))}
            </>
          )}

          {/* No products found */}
          {pipelineState === 'done' && products.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center animate-fade-in"
              style={{ background: '#FFFFFF', border: '1px solid #FDE68A', boxShadow: '0 4px 16px rgba(245,158,11,0.08)' }}
            >
              <div className="text-3xl mb-3">📦</div>
              <p className="text-sm font-semibold text-slate-700 mb-1" style={{ fontFamily: 'Outfit' }}>
                No products found
              </p>
              <p className="text-[12px]" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
                Add products for <strong>{brand.name}</strong> to generate content. Go to your product catalog to add them.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {pipelineState === 'error' && (
        <div
          className="rounded-2xl p-6 animate-fade-in"
          style={{ background: '#FFFFFF', border: '1px solid #FECACA', boxShadow: '0 4px 16px rgba(239,68,68,0.07)' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <svg className="w-5 h-5" style={{ color: '#DC2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold mb-1" style={{ color: '#DC2626', fontFamily: 'Outfit' }}>
                Pipeline Failed
              </p>
              <p className="text-xs mb-4" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
                {errorMsg || 'An unexpected error occurred. Please try again.'}
              </p>
              <button
                onClick={() => setPipelineState('idle')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontFamily: 'DM Sans' }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
