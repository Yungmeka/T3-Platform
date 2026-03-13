import { useState } from 'react';

// ─── Code snippets ────────────────────────────────────────────────────────────
const codeSnippets = {
  python: `import requests

response = requests.post(
    "https://api.t3sentinel.com/api/hde/check",
    headers={"X-API-Key": "your-api-key"},
    json={"text": "Brand X was founded in 2020", "brand_id": "..."}
)
print(response.json())`,

  javascript: `const response = await fetch(
  "https://api.t3sentinel.com/api/hde/check",
  {
    method: "POST",
    headers: {
      "X-API-Key": "your-api-key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Brand X was founded in 2020",
      brand_id: "...",
    }),
  }
);
const data = await response.json();
console.log(data);`,

  curl: `curl -X POST https://api.t3sentinel.com/api/hde/check \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Brand X was founded in 2020",
    "brand_id": "..."
  }'`,
};

// ─── Icon components ──────────────────────────────────────────────────────────
function IconKey() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

function IconWebhook() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconPython() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656L6.207 5.4h5.81v.82H3.887S0 5.77 0 11.948c0 6.18 3.403 5.96 3.403 5.96h2.031v-2.867s-.109-3.404 3.35-3.404h5.765s3.24.052 3.24-3.13V3.26S18.28 0 11.915 0zm-3.2 1.874a1.049 1.049 0 110 2.098 1.049 1.049 0 010-2.098z"/>
      <path d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.744h-5.81v-.82h8.13S24 18.23 24 12.052c0-6.18-3.403-5.96-3.403-5.96h-2.031v2.867s.109 3.404-3.35 3.404H9.451s-3.24-.052-3.24 3.13V20.74S5.72 24 12.086 24zm3.2-1.874a1.049 1.049 0 110-2.098 1.049 1.049 0 010 2.098z"/>
    </svg>
  );
}

function IconNpm() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/>
    </svg>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
      <span className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>{value}</span>
      <span className="text-[11px] text-white/70" style={{ fontFamily: 'DM Sans' }}>{label}</span>
    </div>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────
function IntegrationCard({ icon, title, description, buttonLabel, accentColor, borderColor, bgColor, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="card p-6 flex flex-col gap-4 cursor-default animate-fade-in"
      style={{
        borderTop: `4px solid ${borderColor}`,
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon badge */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bgColor, color: accentColor }}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1">
        <h3 className="text-base font-bold mb-1" style={{ fontFamily: 'Outfit', color: '#0F172A' }}>{title}</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>{description}</p>
      </div>

      {/* CTA */}
      <button
        onClick={onClick}
        className="flex items-center gap-2 self-start px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: hovered ? accentColor : 'transparent',
          color: hovered ? '#FFFFFF' : accentColor,
          border: `1.5px solid ${accentColor}`,
          fontFamily: 'DM Sans',
        }}
      >
        {buttonLabel}
        <IconArrowRight />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Integrations({ brand, onNavigate }) {
  const [activeSnippet, setActiveSnippet] = useState('python');
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(codeSnippets[activeSnippet]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const integrationCards = [
    {
      icon: <IconKey />,
      title: 'API Keys',
      description: 'Authenticate your apps with T3 Sentinel API. Generate, rotate, and revoke keys with granular permission scopes.',
      buttonLabel: 'Manage API Keys',
      accentColor: '#7C3AED',
      borderColor: '#7C3AED',
      bgColor: '#F5F3FF',
      target: 'apikeys',
    },
    {
      icon: <IconWebhook />,
      title: 'Webhooks',
      description: 'Get real-time notifications for brand events. Push hallucination alerts and scan results directly to your systems.',
      buttonLabel: 'Manage Webhooks',
      accentColor: '#EC4899',
      borderColor: '#EC4899',
      bgColor: '#FDF2F8',
      target: 'webhooks',
    },
    {
      icon: <IconShield />,
      title: 'HDE Engine',
      description: 'Embed hallucination detection directly into your AI pipeline. Intercept, verify, and correct AI output before it reaches customers.',
      buttonLabel: 'Open HDE',
      accentColor: '#059669',
      borderColor: '#10B981',
      bgColor: '#ECFDF5',
      target: 'hde',
    },
  ];

  const sdkFeatures = {
    python: [
      'Async & sync support',
      'Automatic retries with backoff',
      'Type hints throughout',
      'Pydantic response models',
      'Streaming support',
    ],
    javascript: [
      'ESM & CommonJS builds',
      'TypeScript definitions',
      'Fetch & Node http support',
      'Promise & callback APIs',
      'Edge runtime compatible',
    ],
  };

  const tabs = ['python', 'javascript', 'curl'];
  const tabLabels = { python: 'Python', javascript: 'JavaScript', curl: 'cURL' };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 45%, #EC4899 100%)',
          boxShadow: '0 8px 40px rgba(124,58,237,0.35)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 pulse-dot" />
            <span className="text-[11px] font-semibold text-white tracking-wide" style={{ fontFamily: 'DM Sans' }}>
              API v1 &mdash; Live
            </span>
          </div>

          <h1
            className="text-3xl font-extrabold text-white mb-3 leading-tight"
            style={{ fontFamily: 'Outfit' }}
          >
            Integrate T3 Sentinel
          </h1>
          <p
            className="text-white/75 text-[15px] max-w-xl leading-relaxed mb-8"
            style={{ fontFamily: 'DM Sans' }}
          >
            Connect your AI systems to detect hallucinations, verify claims, and protect your brand in real-time.
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3">
            <StatPill value="99.9%" label="API Uptime" />
            <StatPill value="&lt;200ms" label="Avg Response" />
            <StatPill value="12.4k" label="Events Processed" />
          </div>
        </div>
      </div>

      {/* ═══ INTEGRATION CARDS ═════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#94A3B8', fontFamily: 'Outfit' }}>
          Integration Points
        </h2>
        <div className="grid grid-cols-3 gap-5">
          {integrationCards.map((card) => (
            <IntegrationCard
              key={card.target}
              icon={card.icon}
              title={card.title}
              description={card.description}
              buttonLabel={card.buttonLabel}
              accentColor={card.accentColor}
              borderColor={card.borderColor}
              bgColor={card.bgColor}
              onClick={() => onNavigate(card.target)}
            />
          ))}
        </div>
      </div>

      {/* ═══ QUICK START ═══════════════════════════════════════════════════════ */}
      <div className="card p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold" style={{ fontFamily: 'Outfit', color: '#0F172A' }}>Quick Start</h2>
            <p className="text-[13px] mt-0.5" style={{ color: '#64748B', fontFamily: 'DM Sans' }}>
              Make your first API call in under a minute
            </p>
          </div>

          {/* Language tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F1F5F9' }}>
            {tabs.map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveSnippet(lang)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeSnippet === lang ? '#FFFFFF' : 'transparent',
                  color: activeSnippet === lang ? '#7C3AED' : '#64748B',
                  boxShadow: activeSnippet === lang ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  fontFamily: 'DM Sans',
                }}
              >
                {tabLabels[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Code block */}
        <div className="relative">
          <pre
            className="text-[13px] font-mono rounded-xl p-5 overflow-x-auto leading-relaxed"
            style={{
              background: '#0F172A',
              color: '#CBD5E1',
              border: '1px solid #1E293B',
              minHeight: 140,
            }}
          >
            <code>{codeSnippets[activeSnippet]}</code>
          </pre>

          {/* Copy button */}
          <button
            onClick={copyCode}
            className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: copied ? '#064E3B' : '#1E293B',
              border: `1px solid ${copied ? '#065F46' : '#334155'}`,
              color: copied ? '#6EE7B7' : '#94A3B8',
              fontFamily: 'DM Sans',
            }}
          >
            {copied ? <IconCheck /> : <IconCopy />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Inline hint */}
        <p className="text-[12px] mt-3 flex items-center gap-1.5" style={{ color: '#94A3B8', fontFamily: 'DM Sans' }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Replace <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: '#F1F5F9', color: '#7C3AED' }}>your-api-key</code> with a real key from the API Keys section.
        </p>
      </div>

      {/* ═══ SDK SECTION ═══════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#94A3B8', fontFamily: 'Outfit' }}>
          Official SDKs
        </h2>

        <div className="grid grid-cols-2 gap-5">

          {/* Python SDK */}
          <div className="card p-6" style={{ borderTop: '4px solid #3B82F6' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                <IconPython />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Outfit', color: '#0F172A' }}>Python SDK</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE' }}>
                  v1.0.0
                </span>
              </div>
            </div>

            {/* Install command */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl mb-4"
              style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <code className="text-sm font-mono" style={{ color: '#A78BFA' }}>pip install t3-sentinel</code>
              <button
                onClick={() => navigator.clipboard.writeText('pip install t3-sentinel')}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <IconCopy />
              </button>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {sdkFeatures.python.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: '#334155', fontFamily: 'DM Sans' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* JavaScript SDK */}
          <div className="card p-6" style={{ borderTop: '4px solid #F59E0B' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: '#FFFBEB', color: '#D97706' }}>
                <IconNpm />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Outfit', color: '#0F172A' }}>JavaScript SDK</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                  v1.0.0
                </span>
              </div>
            </div>

            {/* Install command */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl mb-4"
              style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <code className="text-sm font-mono" style={{ color: '#FCD34D' }}>npm install @t3/sentinel</code>
              <button
                onClick={() => navigator.clipboard.writeText('npm install @t3/sentinel')}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <IconCopy />
              </button>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {sdkFeatures.javascript.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: '#334155', fontFamily: 'DM Sans' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

    </div>
  );
}
