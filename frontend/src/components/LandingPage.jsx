import { useState, useEffect, useRef } from 'react';
import Marquee from './Marquee';
import Globe from './Globe';

/* ─────────────────────────────────────────────
   DESIGN TOKENS (mirrors index.css / tailwind)
───────────────────────────────────────────── */
const GRAD = 'linear-gradient(135deg, #7C3AED, #F97316)';
const GRAD_SOFT = 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(249,115,22,0.06))';
const FONT_HEAD = "'Outfit', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";

/* ─────────────────────────────────────────────
   REUSABLE PRIMITIVES
───────────────────────────────────────────── */
function GradientText({ children, style = {} }) {
  return (
    <span
      className="gradient-text"
      style={{ fontFamily: FONT_HEAD, ...style }}
    >
      {children}
    </span>
  );
}

function PillButton({ children, onClick, outline = false, large = false }) {
  const base = {
    fontFamily: FONT_BODY,
    fontWeight: 700,
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.22s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '0.01em',
  };

  const size = large
    ? { padding: '16px 40px', fontSize: '17px' }
    : { padding: '12px 28px', fontSize: '15px' };

  const variant = outline
    ? {
        background: 'transparent',
        color: '#F97316',
        border: '2px solid #FDBA74',
        boxShadow: 'none',
      }
    : {
        background: GRAD,
        color: '#FFFFFF',
        boxShadow: '0 6px 24px rgba(249, 115, 22, 0.25), 0 4px 16px rgba(124, 58, 237, 0.20)',
      };

  return (
    <button
      onClick={onClick}
      style={{ ...base, ...size, ...variant }}
      onMouseEnter={(e) => {
        if (outline) {
          e.currentTarget.style.background = '#FFF7ED';
          e.currentTarget.style.borderColor = '#F97316';
        } else {
          e.currentTarget.style.opacity = '0.92';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 32px rgba(249, 115, 22, 0.35), 0 6px 20px rgba(124, 58, 237, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (outline) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#FDBA74';
        } else {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(249, 115, 22, 0.25), 0 4px 16px rgba(124, 58, 237, 0.20)';
        }
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {}, hover = true }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        boxShadow: hovered
          ? '0 8px 30px rgba(0,0,0,0.08)'
          : '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* Floating blob — decorative background element */
function Blob({ style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(72px)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

/* Animated counter hook */
function useCounter(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* Intersection observer hook */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Check if already in viewport (handles race condition in Chrome)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold, rootMargin: '50px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─────────────────────────────────────────────
   SECTION: NAVBAR
───────────────────────────────────────────── */
function Navbar({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 md:px-12 h-[60px] md:h-[68px] transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(245, 247, 250, 0.92)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: GRAD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src="/logos/t3-logo.png" alt="T3" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        </div>
        <span
          className="gradient-text"
          style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: '20px', letterSpacing: '-0.03em' }}
        >
          T3
        </span>
        <span
          className="hidden md:inline"
          style={{
            fontFamily: FONT_BODY,
            fontSize: '12px',
            color: '#94A3B8',
            marginLeft: '2px',
            marginTop: '2px',
            letterSpacing: '0.04em',
          }}
        >
          AI Brand Visibility
        </span>
      </div>

      {/* Nav links (desktop only) */}
      <div className="hidden md:flex items-center gap-8">
        {['Why T3', 'How It Works', 'Features', 'Pricing'].map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
            style={{
              fontFamily: FONT_BODY,
              fontSize: '14px',
              fontWeight: 500,
              color: '#475569',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F97316')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            {label}
          </a>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onGetStarted}
        className="px-4 py-2 md:px-7 md:py-3 text-xs md:text-sm font-bold text-white rounded-full"
        style={{
          background: GRAD,
          fontFamily: FONT_BODY,
          boxShadow: '0 4px 16px rgba(249, 115, 22, 0.2)',
        }}
      >
        Get Started
      </button>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   FLOATING PATHS — animated SVG background
───────────────────────────────────────────── */
function FloatingPaths({ position }) {
  const pathsRef = useRef(null);
  if (!pathsRef.current) {
    pathsRef.current = Array.from({ length: 36 }, (_, i) => ({
      id: i,
      d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
        380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
        152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
        684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
      width: 0.5 + i * 0.03,
      opacity: 0.1 + i * 0.03,
    }));
  }
  const paths = pathsRef.current;
  const gradId = position > 0 ? 'fpGradA' : 'fpGradB';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.5,
        overflow: 'hidden',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <svg
        className="fp-container"
        style={{ width: '100%', height: '100%' }}
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke={`url(#${gradId})`}
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            vectorEffect="non-scaling-stroke"
            className="floating-path"
          />
        ))}
        <defs>
          <linearGradient id="fpGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="fpGradB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION: HERO
───────────────────────────────────────────── */
function HeroSection({ onGetStarted }) {
  const ref = useRef(null);
  const inView = true; // Hero is always visible — no fade animation (fixes Chrome blink)

  const stats = [
    { value: '4', label: 'AI Platforms Monitored' },
    { value: '$67.4B', label: 'At Risk from AI Misinformation' },
    { value: '64%', label: 'of Consumers Affected' },
  ];

  /* Floating AI platform chips */
  const platforms = [
    { name: 'ChatGPT', color: '#10A37F', icon: '✦' },
    { name: 'Gemini', color: '#4285F4', icon: '✦' },
    { name: 'Perplexity', color: '#6366F1', icon: '✦' },
    { name: 'Copilot', color: '#0078D4', icon: '✦' },
  ];

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: '120px',
        paddingBottom: '80px',
        background: '#F5F7FA',
      }}
    >
      {/* Background blobs */}
      <Blob style={{ top: '-120px', left: '-160px', width: '560px', height: '560px', background: 'rgba(124,58,237,0.10)' }} />
      <Blob style={{ bottom: '-100px', right: '-140px', width: '500px', height: '500px', background: 'rgba(249,115,22,0.07)' }} />
      <Blob style={{ top: '30%', left: '60%', width: '320px', height: '320px', background: 'rgba(124,58,237,0.06)' }} />

      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={ref}
        className=""
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '860px',
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center',
          opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: GRAD_SOFT,
            border: '1px solid rgba(124,58,237,0.18)',
            borderRadius: '999px',
            padding: '6px 18px',
            marginBottom: '32px',
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F97316', flexShrink: 0 }} className="pulse-dot" />
          <span style={{ fontFamily: FONT_BODY, fontSize: '13px', fontWeight: 600, color: '#7C3AED', letterSpacing: '0.02em' }}>
            Built for HBCU Battle of the Brains 2026
          </span>
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: 'clamp(38px, 6.5vw, 72px)',
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            color: '#0F172A',
            margin: '0 0 24px',
          }}
        >
          Track What AI Says{' '}
          <br />
          <GradientText>About Your Brand</GradientText>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: '#475569',
            lineHeight: 1.65,
            maxWidth: '640px',
            margin: '0 auto 44px',
            fontWeight: 400,
          }}
        >
          T3 monitors how your business appears across{' '}
          <strong style={{ color: '#334155', fontWeight: 600 }}>ChatGPT, Gemini, Perplexity, and Copilot</strong>{' '}
          — in real time.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}>
          <PillButton onClick={onGetStarted} large>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Get Started Free
          </PillButton>
          <PillButton
            outline
            large
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="#F97316" stroke="none" />
            </svg>
            See How It Works
          </PillButton>
        </div>

        {/* Platform chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '72px' }}>
          {platforms.map((p) => (
            <div
              key={p.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: '#FFFFFF',
                borderRadius: '999px',
                padding: '7px 16px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: p.color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${p.color}66`,
                }}
              />
              <span style={{ fontFamily: FONT_BODY, fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            maxWidth: '700px',
            margin: '0 auto',
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '24px 20px',
                textAlign: 'center',
                borderRight: i < stats.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}
            >
              <div
                className="gradient-text"
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 800,
                  fontSize: 'clamp(22px, 3.5vw, 30px)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginBottom: '6px',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '12px',
                  color: '#64748B',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: 0.4,
        }}
      >
        <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Scroll
        </span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none" aria-hidden="true">
          <rect x="6" y="2" width="4" height="8" rx="2" fill="#94A3B8" />
          <path d="M8 14l-4 4h8l-4-4z" fill="#94A3B8" />
        </svg>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: BRANDS MARQUEE — inline SVG logos
───────────────────────────────────────────── */

/* Dell — real Dell logo from official vector */
const DellLogo = () => (
  <svg viewBox="16 15 464 463" width="42" height="42" aria-label="Dell">
    <g fill="#007DB8">
      <path d="M241.281 15.478h14.379C325.601 19.422 375.469 45.98 412.44 83.2c36.972 37.22 64.301 86.31 67.953 156.548v13.915c-3.551 71.361-31.363 118.459-67.953 156.78-38.437 36.4-85.688 63.979-157.012 67.488h-14.147c-69.932-3.952-119.809-30.499-156.78-67.721C47.53 372.99 20.2 323.901 16.548 253.663v-13.915c.182-.051.271-.194.232-.464 3.497-69.97 30.976-119.57 67.722-156.316 36.915-36.917 87.3-63.665 156.779-67.49zm-45.457 33.165c-13.78 3.69-26.138 8.376-37.339 13.915-34.094 16.859-62.21 40.979-81.869 71.896-19.188 30.178-35.802 68.999-33.396 119.904 1.517 32.093 8.84 59.089 20.408 82.101 22.845 45.437 57.625 78.916 105.758 99.264 23.802 10.062 53.295 17.12 86.507 15.538 31.857-1.517 59.462-8.678 82.333-20.177 44.824-22.538 80.149-57.312 99.728-105.293 9.902-24.271 17.39-52.31 15.771-86.276-3.064-64.343-29.237-107.971-63.778-141.241-17.091-16.462-37.671-30.465-61.923-40.586-23.531-9.82-54.164-17.101-86.972-15.539-16.129.768-31.344 2.776-45.228 6.494z"/>
      <path d="M227.135 186.637c7.348 4.866 14.864 9.565 21.801 14.843-15.671 9.84-31.034 19.989-46.616 29.918 2.366 1.809 5.056 3.293 7.421 5.102 15.712-9.954 31.429-19.902 47.081-29.918 7.02 4.345 13.931 8.798 20.41 13.684-15.684 9.906-30.842 20.336-46.385 30.381 2.303 1.873 5.126 3.224 7.652 4.871 16.065-9.833 31.73-20.066 47.544-30.149v-32.934h34.789v65.635c9.817.54 20.642.077 30.847.23v30.847h-65.636v-31.311c-19.284 11.716-39.046 24.965-58.444 37.34-20.201-13.117-39.67-26.97-59.836-40.122-5.842 18.517-19.717 32.447-42.675 34.093-14.318 1.024-30.588-.765-47.08 0v-96.712c20.618 1.366 43.258-2.757 59.604 2.319 14.453 4.489 24.7 16.021 29.454 30.382 20.181-12.675 40.038-25.672 60.069-38.499zm-115.963 36.876v34.788c8.287.041 14.59.522 19.481-3.246 7.277-5.605 8.743-19.5 2.319-26.904-4.287-4.94-11.525-5.977-21.569-5.334-.268.039-.251.367-.231.696zM360.722 192.435h34.788v65.866h30.614v30.847h-65.636v-96.017c-.018-.329-.037-.657.234-.696z"/>
    </g>
  </svg>
);

/* eBay — clean text wordmark with official brand colors */
const EbayLogo = () => (
  <svg viewBox="0 0 120 40" width="100" height="34" aria-label="eBay">
    <text fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif" fontWeight="700" fontSize="34" y="32" letterSpacing="-1.5">
      <tspan fill="#E53238">e</tspan>
      <tspan fill="#0064D2">b</tspan>
      <tspan fill="#F5AF02">a</tspan>
      <tspan fill="#86B817">y</tspan>
    </text>
  </svg>
);

/* NFL — real NFL shield from official vector */
const NFLLogo = () => (
  <svg viewBox="24 4 148 188" width="44" height="52" aria-label="NFL">
    <path d="M28.175 15.857c22.292 14.368 44.291 16.03 66.289-7.135 21.115 23.263 46.058 23.166 70.119 7.135v129.02c0 10.557-8.25 23.557-35.748 19.549-15.123 1.076-24.648 10.264-34.371 19.061 5.99 4.594-14.633-20.82-31.818-18.082-16.302 2.443-34.47-9.971-34.47-19.646V15.857z" fill="none" stroke="#0e4c7d" strokeWidth="2.54" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M28.175 15.857c22.292 14.368 44.291 16.03 66.289-7.135 21.115 23.263 46.058 23.166 70.119 7.135v67.54H28.175v-67.54z" fill="#0e4c7d"/>
    {/* Stars */}
    <g fill="#fff">
      <path d="M35.639 75.285l-4.322-3.226 5.5-.293 1.866-5.083 1.866 5.083 5.401.293-4.321 3.226 1.67 5.082-4.616-2.932-4.419 2.932 1.375-5.082z"/>
      <path d="M52.235 75.285l-4.321-3.226 5.5-.293 1.866-5.083 1.866 5.083 5.401.293-4.321 3.226 1.669 5.082-4.615-2.932-4.42 2.932 1.375-5.082z"/>
      <path d="M68.832 75.285l-4.321-3.226 5.499-.293 1.866-5.083 1.866 5.083 5.401.293-4.223 3.226 1.572 5.082-4.616-2.932-4.419 2.932 1.375-5.082z"/>
      <path d="M85.428 75.285l-4.321-3.226 5.5-.293 1.866-5.083 1.866 5.083 5.401.293-4.223 3.226 1.571 5.082-4.615-2.932-4.42 2.932 1.375-5.082z"/>
      <path d="M101.926 75.285l-4.321-3.226 5.5-.293 1.866-5.083 1.865 5.083 5.402.293-4.222 3.226 1.57 5.082-4.615-2.932-4.418 2.932 1.373-5.082z"/>
      <path d="M118.523 75.285l-4.32-3.226 5.498-.293 1.867-5.083 1.866 5.083 5.4.293-4.223 3.226 1.573 5.082-4.616-2.932-4.42 2.932 1.375-5.082z"/>
      <path d="M135.119 75.285l-4.32-3.226 5.5-.293 1.865-5.083 1.865 5.083 5.403.293-4.223 3.226 1.57 5.082-4.615-2.932-4.42 2.932 1.375-5.082z"/>
      <path d="M151.717 75.285l-4.322-3.226 5.5-.293 1.867-5.083 1.865 5.083 5.4.293-4.222 3.226 1.572 5.082-4.615-2.932-4.42 2.932 1.375-5.082z"/>
    </g>
    {/* NFL red letters */}
    <path d="M41.924 144.779v-42.518c0-10.263-4.616-4.594-4.616-8.992v-4.007h14.043l16.499 33.525.098-24.436c0-3.714-6.481-3.42-6.481-4.593v-3.91l17.677-.586v4.007c0 2.541-1.178.195-1.276 6.744l-.884 55.518c.884 5.473-5.106 6.256-8.348-.195l-17.284-37.24-.491 26.684c-.098 6.061-1.374 6.061 1.866 6.744v3.812c-4.91 0-10.704 0-14.632-6.646v-3.91c1.864-3.911 2.65 2.833 3.829-.001zm47.138-38.705c0-12.609-5.401-11.143-5.401-12.805v-3.91h31.72l6.088 11.435c0 3.617-2.75 3.52-5.205.391-3.043-6.743-6.678-4.008-4.025-4.105l-11.883-.391v18.67c1.473.293 8.936 1.467 9.428.781 4.025-6.744 1.768-6.549 7.561-7.721v22.578c-7.463-2.053-3.828-7.525-6.48-6.842-1.08.195-9.035 0-10.508 0v20.623c0 6.939-.885 13 1.865 13 .098 4.398.295 8.699.492 13.098-5.795-3.127-8.348-6.842-17.285-9.188v-3.715c0-2.248 3.634 2.932 3.634-14.857v-37.042h-.001zm36.924 33.819v-39.488c0-4.398-5.008-3.422-5.008-7.331v-4.007h20.623v4.007c0 3.42-5.598-.488-5.598 6.354v45.449c0 2.934-.197 5.865 2.848 5.865 4.715 0 10.998-1.467 11.293-13.391-19.443.488-8.74-20.625.393-13.979 2.357 1.76 5.992 3.129 6.777 6.061 7.758 27.174-11.098 31.57-37.318 30.594-1.473-8.015 5.99-5.865 5.99-20.134z" fill="#cc2229"/>
  </svg>
);

/* Home Depot — orange square with diagonal white stencil text */
const HomeDepotLogo = () => (
  <svg viewBox="0 0 50 50" width="40" height="40" aria-label="The Home Depot">
    <rect x="0" y="0" width="50" height="50" rx="2" fill="#F96302"/>
    <g transform="rotate(-45, 25, 25)">
      <text textAnchor="middle" fontFamily="'Stencil','Arial Black','Helvetica Neue',Arial,sans-serif" fontWeight="900" fill="#FFFFFF">
        <tspan x="25" y="19" fontSize="5" letterSpacing="1.5">THE</tspan>
        <tspan x="25" y="28" fontSize="9" letterSpacing="0.3">HOME</tspan>
        <tspan x="25" y="36" fontSize="5" letterSpacing="1.5">DEPOT</tspan>
      </text>
    </g>
  </svg>
);

/* Cisco — bridge bars + wordmark (clean recreation) */
const CiscoLogo = () => (
  <svg viewBox="0 0 140 50" width="110" height="40" aria-label="Cisco">
    <g fill="#049FD9">
      {/* Bridge bars: 3 groups, short-tall-short pattern */}
      {/* Group 1 */}
      <rect x="14" y="12" width="4" height="14" rx="2"/>
      <rect x="22" y="6" width="4" height="20" rx="2"/>
      <rect x="30" y="12" width="4" height="14" rx="2"/>
      {/* Group 2 */}
      <rect x="46" y="8" width="4" height="18" rx="2"/>
      <rect x="54" y="0" width="4" height="26" rx="2"/>
      <rect x="62" y="8" width="4" height="18" rx="2"/>
      {/* Group 3 */}
      <rect x="78" y="12" width="4" height="14" rx="2"/>
      <rect x="86" y="6" width="4" height="20" rx="2"/>
      <rect x="94" y="12" width="4" height="14" rx="2"/>
    </g>
    <text x="56" y="46" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="17" fill="#049FD9" letterSpacing="3">cisco</text>
  </svg>
);

/* Thrivent — accurate wordmark + flame icon in brand purple */
const ThriventLogo = () => (
  <svg viewBox="0 0 520 120" width="140" height="36" aria-label="Thrivent">
    {/* Flame/shield icon */}
    <g fill="#4C2C92">
      <path d="M30 10c0 0-20 25-20 50c0 22 15 40 35 50c-8-12-12-25-12-40c0-20 10-35 17-45c7 10 17 25 17 45c0 15-4 28-12 40c20-10 35-28 35-50c0-25-20-50-20-50c-8 15-20 20-20 20s-12-5-20-20z"/>
    </g>
    {/* Wordmark */}
    <text x="90" y="82" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif" fontWeight="700" fontSize="62" fill="#4C2C92" letterSpacing="-1">Thrivent</text>
  </svg>
);

/* HEB — real H-E-B logo from official vector (red oval with letters) */
const HEBLogo = () => (
  <svg viewBox="10 65 175 65" width="110" height="40" aria-label="H-E-B">
    <path d="M152.23 121.875c14.93 0 27.115-12.186 27.115-27.266S167.16 67.342 152.23 67.342H41.796c-15.081 0-27.266 12.186-27.266 27.267s12.186 27.266 27.266 27.266H152.23z" fill="#922b3f"/>
    <path d="M152.23 119.438c13.711 0 24.83-11.119 24.83-24.829S165.941 69.78 152.23 69.78H41.796c-13.708 0-24.829 11.12-24.829 24.829s11.12 24.829 24.829 24.829H152.23z" fill="#fff"/>
    <path d="M152.23 117c12.34 0 22.393-10.055 22.393-22.391 0-12.339-10.053-22.392-22.393-22.392H41.796c-12.338 0-22.392 10.053-22.392 22.392 0 12.336 10.053 22.391 22.392 22.391H152.23z" fill="#922b3f"/>
    <g fill="#fff">
      <path d="M55.201 98.264l.152 8.681h10.206L66.93 82.27H54.896l.152 11.12h-7.159l.153-11.12H36.008l1.523 24.675h10.053l.153-8.681h7.464z"/>
      <path d="M70.738 98.416h7.159V93.39h-7.159v5.026z"/>
      <path d="M116.283 98.416h7.311V93.39h-7.311v5.026z"/>
      <path d="M106.992 93.39H94.044l.152-4.418h18.126l.457-6.702H82.162l1.067 24.675h28.179l.457-4.568H93.892v-4.113h12.948l.152-4.874z"/>
      <path d="M146.291 100.244c-.152 2.438-2.742 2.285-4.57 2.285h-2.131v-4.57h3.502c1.676 0 3.351.305 3.199 2.285zm-2.742-11.729c1.828 0 3.809.762 3.656 2.438 0 2.132-1.828 2.59-3.961 2.59h-3.504v-5.028h3.809zm7.465-6.245H127.86l1.523 24.676h20.107c6.094 0 7.615-2.893 8.072-5.178.457-2.133.609-5.483-3.809-5.941 3.504-.761 5.18-2.894 5.18-6.854.153-2.438-1.218-6.703-7.919-6.703z"/>
    </g>
  </svg>
);

const SPONSOR_LOGOS = [
  { name: 'Dell', Logo: DellLogo },
  { name: 'eBay', Logo: EbayLogo },
  { name: 'NFL', Logo: NFLLogo },
  { name: 'Home Depot', Logo: HomeDepotLogo },
  { name: 'Cisco', Logo: CiscoLogo },
  { name: 'Thrivent', Logo: ThriventLogo },
  { name: 'HEB', Logo: HEBLogo },
];

function BrandsMarqueeSection() {
  return (
    <section
      style={{
        padding: '20px 0',
        background: '#FFFFFF',
        borderTop: '1px solid #F1F5F9',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <Marquee pauseOnHover speed={20} gap={16}>
        {SPONSOR_LOGOS.map((s) => (
          <div
            key={s.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 32px',
              cursor: 'default',
              transition: 'all 0.3s ease',
              opacity: 0.45,
              filter: 'grayscale(100%)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.filter = 'grayscale(0%)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.45';
              e.currentTarget.style.filter = 'grayscale(100%)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <s.Logo />
          </div>
        ))}
      </Marquee>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: PROBLEM
───────────────────────────────────────────── */
function ProblemSection() {
  const [ref, inView] = useInView();

  const problems = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ),
      title: 'Invisible to AI',
      body: 'Your brand simply does not appear when potential customers ask AI assistants for product recommendations in your category.',
      accent: '#7C3AED',
      bg: 'rgba(124,58,237,0.06)',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      title: 'Hallucinated Info',
      body: 'AI invents wrong product specs, outdated pricing, or false claims about your brand — and millions of users trust those answers.',
      accent: '#EC4899',
      bg: 'rgba(236,72,153,0.06)',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      title: 'Competitors Recommended Instead',
      body: 'When a customer asks for the best option in your space, AI recommends your rivals — costing you revenue you never see leaving.',
      accent: '#F59E0B',
      bg: 'rgba(245,158,11,0.06)',
    },
  ];

  return (
    <section
      id="why-t3"
      style={{
        position: 'relative',
        padding: '100px 24px',
        background: '#F5F7FA',
        overflow: 'hidden',
      }}
    >
      <Blob style={{ top: '0', right: '0', width: '400px', height: '400px', background: 'rgba(249,115,22,0.08)' }} />

      <div
        ref={ref}
        className=""
        style={{ maxWidth: '1100px', margin: '0 auto', opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)' }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-block',
              background: GRAD_SOFT,
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: '999px',
              padding: '5px 16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontFamily: FONT_BODY, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span style={{ color: '#7C3AED' }}>Why This </span><span style={{ color: '#F97316' }}>Matters</span>
            </span>
          </div>

          <h2
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 46px)',
              letterSpacing: '-0.03em',
              color: '#0F172A',
              lineHeight: 1.15,
              margin: '0 0 20px',
            }}
          >
            The Problem Hiding{' '}
            <GradientText>in Plain Sight</GradientText>
          </h2>

          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              color: '#475569',
              lineHeight: 1.7,
              maxWidth: '680px',
              margin: '0 auto',
            }}
          >
            When a customer asks AI{' '}
            <em style={{ color: '#334155', fontStyle: 'normal', fontWeight: 600 }}>"What's the best laptop for students?"</em>{' '}
            and it invents specs, omits your brand, or recommends competitors — you lose revenue without ever knowing it happened.
          </p>
        </div>

        {/* Problem cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {problems.map((p) => (
            <Card key={p.title} style={{ padding: '36px 32px' }}>
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '16px',
                  background: p.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '22px',
                  border: `1px solid ${p.accent}22`,
                }}
              >
                {p.icon}
              </div>
              <h3
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 700,
                  fontSize: '20px',
                  color: '#0F172A',
                  margin: '0 0 12px',
                  letterSpacing: '-0.02em',
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '15px',
                  color: '#64748B',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {p.body}
              </p>
              <div
                style={{
                  height: '3px',
                  background: p.accent,
                  borderRadius: '999px',
                  marginTop: '28px',
                  width: '48px',
                }}
              />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: HOW IT WORKS
───────────────────────────────────────────── */
function HowItWorksSection() {
  const [ref, inView] = useInView();

  const steps = [
    {
      number: '01',
      tag: 'TRACK',
      title: 'See How AI Sees You',
      body: 'See exactly how AI platforms describe your brand. Query ChatGPT, Gemini, Perplexity, and Copilot side-by-side with a single click.',
      color: '#7C3AED',
      bg: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.03))',
      mockup: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {['ChatGPT', 'Gemini', 'Perplexity', 'Copilot'].map((name, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ['#10A37F', '#4285F4', '#6366F1', '#0078D4'][i], flexShrink: 0 }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#334155', fontWeight: 500, flex: 1 }}>{name}</span>
              <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', width: `${[72, 55, 88, 63][i]}px` }} />
            </div>
          ))}
        </div>
      ),
    },
    {
      number: '02',
      tag: 'TRUST',
      title: 'Detect Hallucinations',
      body: 'Our engine compares every AI claim against your verified source data to flag incorrect information before it spreads.',
      color: '#EC4899',
      bg: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(236,72,153,0.03))',
      mockup: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { claim: 'Founded in 2019', status: 'verified', statusColor: '#10B981' },
            { claim: 'Headquarters: Austin, TX', status: 'hallucinated', statusColor: '#EF4444' },
            { claim: '4.8 star rating', status: 'unverified', statusColor: '#F59E0B' },
            { claim: 'ISO 27001 certified', status: 'verified', statusColor: '#10B981' },
          ].map((row) => (
            <div key={row.claim} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0' }}>
              <div style={{ flex: 1, fontFamily: FONT_BODY, fontSize: '12px', color: '#334155', fontWeight: 500 }}>{row.claim}</div>
              <span style={{ fontFamily: FONT_BODY, fontSize: '10px', fontWeight: 700, color: row.statusColor, background: row.statusColor + '18', borderRadius: '999px', padding: '2px 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      number: '03',
      tag: 'TRANSFORM',
      title: 'Optimize Your Presence',
      body: 'Generate AI-ready descriptions, schema markup, and press releases to correct your presence and win back lost visibility.',
      color: '#F97316',
      bg: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.03))',
      mockup: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'AI-Optimized Description', icon: '✦', done: true },
            { label: 'Schema.org Markup', icon: '✦', done: true },
            { label: 'Press Release Draft', icon: '✦', done: false },
            { label: 'Correction Submission', icon: '✦', done: false },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: item.done ? '#F97316' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#334155', fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{
        position: 'relative',
        padding: '100px 24px',
        background: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <Blob style={{ bottom: '-80px', left: '-100px', width: '500px', height: '500px', background: 'rgba(249,115,22,0.07)' }} />

      <div
        ref={ref}
        className=""
        style={{ maxWidth: '1100px', margin: '0 auto', opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)' }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(124,58,237,0.06))',
              border: '1px solid rgba(249,115,22,0.20)',
              borderRadius: '999px',
              padding: '5px 16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontFamily: FONT_BODY, fontSize: '12px', fontWeight: 700, color: '#EA580C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              How It Works
            </span>
          </div>
          <h2
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 46px)',
              letterSpacing: '-0.03em',
              color: '#0F172A',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            The{' '}
            <GradientText>Track → Trust → Transform</GradientText>{' '}
            Loop
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {steps.map((step, i) => (
            <div
              key={step.tag}
              style={{
                display: 'grid',
                gridTemplateColumns: i % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
                gap: '48px',
                alignItems: 'center',
                direction: i % 2 === 1 ? 'rtl' : 'ltr',
              }}
            >
              {/* Text side */}
              <div style={{ direction: 'ltr' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <span
                    style={{
                      fontFamily: FONT_HEAD,
                      fontWeight: 800,
                      fontSize: '13px',
                      color: step.color,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      background: step.color + '18',
                      borderRadius: '999px',
                      padding: '4px 14px',
                    }}
                  >
                    {step.tag}
                  </span>
                  <span
                    className="gradient-text"
                    style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: '13px', letterSpacing: '0.06em', opacity: 0.4 }}
                  >
                    Step {step.number}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: FONT_HEAD,
                    fontWeight: 800,
                    fontSize: 'clamp(22px, 3vw, 32px)',
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    margin: '0 0 16px',
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: '16px',
                    color: '#64748B',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {step.body}
                </p>
              </div>

              {/* Visual side */}
              <div style={{ direction: 'ltr' }}>
                <div
                  style={{
                    borderRadius: '20px',
                    padding: '32px',
                    background: step.bg,
                    border: `1px solid ${step.color}22`,
                    boxShadow: `0 4px 24px ${step.color}12`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '20px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#94A3B8', marginLeft: '6px', fontWeight: 500 }}>
                      T3 {step.tag.charAt(0) + step.tag.slice(1).toLowerCase()} Engine
                    </span>
                  </div>
                  {step.mockup}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: GLOBE — Real-Time AI Tracking
───────────────────────────────────────────── */
function GlobeSection() {
  const [ref, inView] = useInView(0.15);

  const liveStat = [
    { value: '4', label: 'AI Platforms' },
    { value: '10+', label: 'Global Regions' },
    { value: '24/7', label: 'Monitoring' },
    { value: '<2s', label: 'Response Time' },
  ];

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        padding: '100px 24px',
        background: '#0B0F1A',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }}
      />

      {/* Purple glow blobs */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-80px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className=""
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
          opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(249,115,22,0.12)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: '999px',
              padding: '6px 18px',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#F97316',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: '12px',
                fontWeight: 600,
                color: '#FB923C',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Real-Time Global Tracking
            </span>
          </div>

          <h2
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 48px)',
              color: '#FFFFFF',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            See How AI Talks About Your Brand{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #F97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Worldwide
            </span>
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: '17px',
              color: 'rgba(255,255,255,0.50)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            T3 monitors AI responses across ChatGPT, Gemini, Perplexity, and Copilot from
            every corner of the globe — in real time.
          </p>
        </div>

        {/* Globe + side info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '64px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '180px' }}>
            {[
              { platform: 'ChatGPT', color: '#10A37F', queries: '2.4k' },
              { platform: 'Gemini', color: '#4285F4', queries: '1.8k' },
              { platform: 'Perplexity', color: '#A78BFA', queries: '960' },
              { platform: 'Copilot', color: '#0078D4', queries: '1.1k' },
            ].map((p, i) => (
              <div
                key={p.platform}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: p.color,
                    boxShadow: `0 0 10px ${p.color}40`,
                  }}
                />
                <div>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#FFFFFF', margin: 0, fontWeight: 600 }}>
                    {p.platform}
                  </p>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '11px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>
                    {p.queries} queries/day
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Globe canvas */}
          <div style={{ position: 'relative' }}>
            <Globe
              size={480}
              dotColor="rgba(139, 92, 246, ALPHA)"
              arcColor="rgba(249, 115, 22, 0.45)"
              markerColor="rgba(251, 146, 60, 1)"
              autoRotateSpeed={0.003}
            />
            {/* "Drag to explore" hint */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: FONT_BODY,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Drag to explore
            </div>
          </div>

          {/* Right — live feed simulation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '200px' }}>
            <p
              style={{
                fontFamily: FONT_HEAD,
                fontSize: '11px',
                fontWeight: 700,
                color: '#FB923C',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                margin: '0 0 4px',
              }}
            >
              Live Query Feed
            </p>
            {[
              { city: 'London', query: '"Best CRM software?"', time: '2s ago' },
              { city: 'Tokyo', query: '"Compare Dell vs HP"', time: '5s ago' },
              { city: 'São Paulo', query: '"Top grocery stores"', time: '8s ago' },
              { city: 'Delhi', query: '"Insurance providers"', time: '12s ago' },
              { city: 'SF', query: '"Network solutions"', time: '15s ago' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#FB923C', fontWeight: 600 }}>
                    {item.city}
                  </span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                    {item.time}
                  </span>
                </div>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: 0, fontStyle: 'italic' }}>
                  {item.query}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            marginTop: '56px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            overflow: 'hidden',
            maxWidth: '640px',
            margin: '56px auto 0',
          }}
        >
          {liveStat.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '20px 16px',
                textAlign: 'center',
                borderRight: i < liveStat.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <p
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 800,
                  fontSize: '24px',
                  background: GRAD,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1,
                  margin: '0 0 6px',
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.40)',
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: FEATURES GRID
───────────────────────────────────────────── */
function FeaturesSection() {
  const [ref, inView] = useInView();

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      title: 'Visibility Scan',
      body: 'Query all 4 AI platforms at once and see your brand mentions, positions, and context side-by-side.',
      color: '#F97316',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'Hallucination Detection',
      body: 'Real-time fact-checking engine that compares every AI claim against your verified source data.',
      color: '#EC4899',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: 'Automated Monitoring',
      body: 'Daily and hourly scans run automatically. No manual work required — just alerts when something changes.',
      color: '#10B981',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      title: 'Content Generator',
      body: 'Generate AI-optimized descriptions and schema.org markup that train AI platforms to represent you accurately.',
      color: '#F97316',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
      ),
      title: 'Competitor Alerts',
      body: 'Get notified the moment a rival appears instead of you in AI responses for your target keywords.',
      color: '#EF4444',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
          <path d="M8 2v16" />
          <path d="M16 6v16" />
        </svg>
      ),
      title: 'Ethics Monitor',
      body: 'Detect bias, unfair portrayals, and fairness issues in how AI describes your brand across all platforms.',
      color: '#8B5CF6',
    },
  ];

  return (
    <section
      id="features"
      style={{
        position: 'relative',
        padding: '100px 24px',
        background: '#F5F7FA',
        overflow: 'hidden',
      }}
    >
      <Blob style={{ top: '10%', right: '-80px', width: '420px', height: '420px', background: 'rgba(139,92,246,0.07)' }} />
      <Blob style={{ bottom: '5%', left: '-60px', width: '360px', height: '360px', background: 'rgba(249,115,22,0.07)' }} />

      <div
        ref={ref}
        className=""
        style={{ maxWidth: '1100px', margin: '0 auto', opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-block',
              background: GRAD_SOFT,
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: '999px',
              padding: '5px 16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontFamily: FONT_BODY, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span style={{ color: '#7C3AED' }}>Platform </span><span style={{ color: '#F97316' }}>Features</span>
            </span>
          </div>
          <h2
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 46px)',
              letterSpacing: '-0.03em',
              color: '#0F172A',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Everything You Need to{' '}
            <GradientText>Own Your AI Presence</GradientText>
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '20px',
          }}
        >
          {features.map((f) => (
            <Card key={f.title} style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: f.color + '14',
                  border: `1px solid ${f.color}28`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: f.color,
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <h3
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 700,
                  fontSize: '18px',
                  color: '#0F172A',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '14px',
                  color: '#64748B',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: SOCIAL PROOF / STATS
───────────────────────────────────────────── */
function StatsSection() {
  const [ref, inView] = useInView();
  const count64 = useCounter(64, 1600, inView);
  const count43 = useCounter(43, 1800, inView);

  const stats = [
    {
      value: `${count64}%`,
      label: 'Encountered AI Misinformation',
      sub: 'of consumers who used AI for product research',
      color: '#7C3AED',
    },
    {
      value: `${count43}%`,
      label: 'Made Purchases Based on It',
      sub: 'acted on incorrect AI-generated product info',
      color: '#F97316',
    },
    {
      value: '$67.4B',
      label: 'Estimated Annual Losses',
      sub: 'in revenue attributed to AI misinformation',
      color: '#EF4444',
    },
  ];

  return (
    <section
      style={{
        position: 'relative',
        padding: '100px 24px',
        overflow: 'hidden',
      }}
    >
      {/* Gradient background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #1E0A3C 0%, #2D0A4E 40%, #1A0530 70%, #0F172A 100%)',
        }}
      />
      {/* Decorative circles */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '-120px', right: '-120px', width: '500px', height: '500px', borderRadius: '50%', border: '1px solid rgba(124,58,237,0.18)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', border: '1px solid rgba(249,115,22,0.15)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '440px', height: '440px', borderRadius: '50%', border: '1px solid rgba(124,58,237,0.12)' }} />

      <div
        ref={ref}
        className=""
        style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2, opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.30)',
              borderRadius: '999px',
              padding: '5px 16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontFamily: FONT_BODY, fontSize: '12px', fontWeight: 700, color: '#FB923C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              By the Numbers
            </span>
          </div>
          <h2
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: 'clamp(24px, 3.5vw, 40px)',
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              lineHeight: 1.2,
              margin: '0 auto',
              maxWidth: '680px',
            }}
          >
            AI-powered shopping is exploding —{' '}
            <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              and so is the misinformation inside it.
            </span>
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '20px',
                padding: '40px 32px',
                textAlign: 'center',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 40px ${s.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 800,
                  fontSize: 'clamp(44px, 7vw, 64px)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  background: GRAD,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '12px',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#FFFFFF',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em',
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.50)',
                  lineHeight: 1.5,
                }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: FINAL CTA
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   SECTION: PRICING
───────────────────────────────────────────── */
const PRICING_TIERS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'Perfect for individuals and small teams getting started.',
    features: [
      '1 Brand',
      '50 AI Scans/month',
      '500 API Calls',
      '20 Content Generations',
      'Email Support',
    ],
    cta: 'Get Started',
    popular: false,
    accentColor: '#7C3AED',
  },
  {
    name: 'Growth',
    price: '$149',
    period: '/mo',
    description: 'For growing brands that need deeper AI visibility.',
    features: [
      '5 Brands',
      '200 AI Scans/month',
      '2,000 API Calls',
      '100 Content Generations',
      'Sentinel API Access',
      'Priority Support',
    ],
    cta: 'Get Started',
    popular: true,
    accentColor: '#F97316',
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/mo',
    description: 'Full-scale protection and integrations for large teams.',
    features: [
      'Unlimited Brands',
      'Unlimited Scans',
      '10,000 API Calls',
      'Unlimited Content',
      'Sentinel API + Webhooks',
      'Dedicated Support',
      'Custom Integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
    accentColor: '#7C3AED',
  },
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: '1px' }}
    >
      <circle cx="8" cy="8" r="8" fill="rgba(124,58,237,0.12)" />
      <path
        d="M4.5 8.5L6.5 10.5L11.5 5.5"
        stroke="#7C3AED"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PricingCard({ tier, onGetStarted }) {
  const [hovered, setHovered] = useState(false);

  const cardStyle = tier.popular
    ? {
        background: 'linear-gradient(160deg, #1E0A3C 0%, #2D0A4E 60%, #1A0530 100%)',
        borderRadius: '24px',
        border: '2px solid rgba(249,115,22,0.50)',
        boxShadow: hovered
          ? '0 24px 60px rgba(124,58,237,0.45), 0 8px 24px rgba(249,115,22,0.25)'
          : '0 16px 48px rgba(124,58,237,0.35), 0 4px 16px rgba(249,115,22,0.18)',
        transform: hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(-4px) scale(1.01)',
        transition: 'all 0.28s ease',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 2,
        flex: '0 0 auto',
        width: '100%',
      }
    : {
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid rgba(124,58,237,0.10)',
        boxShadow: hovered
          ? '0 12px 36px rgba(0,0,0,0.10)'
          : '0 4px 20px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        padding: '36px 32px',
        position: 'relative',
        flex: '0 0 auto',
        width: '100%',
      };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: GRAD,
            borderRadius: '999px',
            padding: '4px 18px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span style={{ fontFamily: FONT_BODY, fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Most Popular
          </span>
        </div>
      )}

      {/* Tier name */}
      <div style={{ marginBottom: '8px' }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: tier.popular ? 'rgba(253,186,116,0.90)' : '#7C3AED',
          }}
        >
          {tier.name}
        </span>
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '12px' }}>
        <span
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: '48px',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: tier.popular ? '#FFFFFF' : '#0F172A',
          }}
        >
          {tier.price}
        </span>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: '16px',
            fontWeight: 500,
            color: tier.popular ? 'rgba(255,255,255,0.55)' : '#94A3B8',
            marginBottom: '6px',
          }}
        >
          {tier.period}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: '14px',
          color: tier.popular ? 'rgba(255,255,255,0.60)' : '#64748B',
          lineHeight: 1.6,
          margin: '0 0 28px',
        }}
      >
        {tier.description}
      </p>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          background: tier.popular ? 'rgba(255,255,255,0.10)' : 'rgba(124,58,237,0.08)',
          marginBottom: '24px',
        }}
      />

      {/* Feature list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tier.features.map((feature) => (
          <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: '2px' }}
            >
              <circle cx="8" cy="8" r="8" fill={tier.popular ? 'rgba(249,115,22,0.22)' : 'rgba(124,58,237,0.10)'} />
              <path
                d="M4.5 8.5L6.5 10.5L11.5 5.5"
                stroke={tier.popular ? '#FB923C' : '#7C3AED'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: '14px',
                fontWeight: 500,
                color: tier.popular ? 'rgba(255,255,255,0.85)' : '#334155',
                lineHeight: 1.5,
              }}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      <button
        onClick={onGetStarted}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: '999px',
          border: tier.popular ? 'none' : '2px solid rgba(124,58,237,0.25)',
          background: tier.popular ? GRAD : 'transparent',
          color: tier.popular ? '#FFFFFF' : '#7C3AED',
          fontFamily: FONT_BODY,
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.01em',
          transition: 'all 0.22s ease',
          boxShadow: tier.popular
            ? '0 6px 24px rgba(249,115,22,0.30), 0 4px 16px rgba(124,58,237,0.22)'
            : 'none',
        }}
        onMouseEnter={(e) => {
          if (tier.popular) {
            e.currentTarget.style.opacity = '0.90';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 10px 32px rgba(249,115,22,0.40), 0 6px 20px rgba(124,58,237,0.28)';
          } else {
            e.currentTarget.style.background = 'rgba(124,58,237,0.07)';
            e.currentTarget.style.borderColor = '#7C3AED';
          }
        }}
        onMouseLeave={(e) => {
          if (tier.popular) {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(249,115,22,0.30), 0 4px 16px rgba(124,58,237,0.22)';
          } else {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)';
          }
        }}
      >
        {tier.cta}
      </button>
    </div>
  );
}

function PricingSection({ onGetStarted }) {
  const [ref, inView] = useInView();

  return (
    <section
      id="pricing"
      style={{
        position: 'relative',
        padding: '100px 24px 120px',
        background: '#F5F7FA',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs */}
      <Blob style={{ top: '-60px', left: '5%', width: '480px', height: '480px', background: 'rgba(124,58,237,0.07)' }} />
      <Blob style={{ bottom: '-80px', right: '5%', width: '420px', height: '420px', background: 'rgba(249,115,22,0.06)' }} />

      <div
        ref={ref}
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
          opacity: inView ? 1 : 0,
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(249,115,22,0.06))',
              border: '1px solid rgba(124,58,237,0.18)',
              borderRadius: '999px',
              padding: '5px 16px',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: '12px',
                fontWeight: 700,
                color: '#7C3AED',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Pricing
            </span>
          </div>

          <h2
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 48px)',
              letterSpacing: '-0.03em',
              color: '#0F172A',
              lineHeight: 1.15,
              margin: '0 auto 16px',
              maxWidth: '640px',
            }}
          >
            Simple,{' '}
            <span
              style={{
                background: GRAD,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Transparent
            </span>{' '}
            Pricing
          </h2>

          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: '17px',
              color: '#64748B',
              lineHeight: 1.65,
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} onGetStarted={onGetStarted} />
          ))}
        </div>

        {/* Footer note */}
        <p
          style={{
            textAlign: 'center',
            fontFamily: FONT_BODY,
            fontSize: '13px',
            color: '#94A3B8',
            marginTop: '40px',
          }}
        >
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

function CTASection({ onGetStarted }) {
  const [ref, inView] = useInView();

  return (
    <section
      style={{
        position: 'relative',
        padding: '100px 24px',
        background: '#F5F7FA',
        overflow: 'hidden',
      }}
    >
      <Blob style={{ top: '-80px', left: '10%', width: '500px', height: '500px', background: 'rgba(124,58,237,0.08)' }} />
      <Blob style={{ bottom: '-80px', right: '10%', width: '420px', height: '420px', background: 'rgba(249,115,22,0.07)' }} />

      <div
        ref={ref}
        className=""
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        {/* Large glow orb behind CTA */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(124,58,237,0.06))',
            border: '1px solid rgba(249,115,22,0.20)',
            borderRadius: '999px',
            padding: '5px 16px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontFamily: FONT_BODY, fontSize: '12px', fontWeight: 700, color: '#EA580C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Get Started Today
          </span>
        </div>

        <h2
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: 'clamp(32px, 5vw, 56px)',
            letterSpacing: '-0.035em',
            color: '#0F172A',
            lineHeight: 1.1,
            margin: '0 0 20px',
          }}
        >
          Start Tracking Your{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #F97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Outfit', sans-serif",
            }}
          >Brand Today</span>
        </h2>

        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#64748B',
            lineHeight: 1.65,
            margin: '0 auto 48px',
            maxWidth: '520px',
          }}
        >
          Register your company in 60 seconds and see exactly how AI represents you across every major platform.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onGetStarted}
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: '18px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              background: GRAD,
              color: '#FFFFFF',
              padding: '18px 56px',
              boxShadow: '0 8px 32px rgba(249, 115, 22, 0.30), 0 4px 16px rgba(124, 58, 237, 0.20)',
              transition: 'all 0.22s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 14px 48px rgba(249, 115, 22, 0.40), 0 8px 24px rgba(124, 58, 237, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(249, 115, 22, 0.30), 0 4px 16px rgba(124, 58, 237, 0.20)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Get Started Free
          </button>

          <p style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#94A3B8', margin: 0 }}>
            No credit card required &middot; Setup in under 60 seconds
          </p>
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginTop: '56px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: '✓', text: 'Free to start' },
            { icon: '✓', text: '4 AI platforms' },
            { icon: '✓', text: 'Real-time alerts' },
            { icon: '✓', text: 'No setup required' },
          ].map((b) => (
            <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: GRAD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {b.icon}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                {b.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION: FOOTER
───────────────────────────────────────────── */
function Footer({ onGetStarted }) {
  return (
    <footer
      style={{
        background: '#0F172A',
        padding: '56px 48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Brand */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: GRAD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src="/logos/t3-logo.png" alt="T3" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              </div>
              <span
                style={{
                  fontFamily: FONT_HEAD,
                  fontWeight: 800,
                  fontSize: '20px',
                  background: GRAD,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.03em',
                }}
              >
                T3
              </span>
            </div>
            <p style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: '16px', color: '#FFFFFF', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Track. Trust. Transform.
            </p>
            <p style={{ fontFamily: FONT_BODY, fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
              AI Brand Visibility and Trust Platform — helping businesses control how AI represents them.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>
              Platform
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Visibility Scan', 'Hallucination Detection', 'Content Generator', 'Ethics Monitor'].map((link) => (
                <span
                  key={link}
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FB923C')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                >
                  {link}
                </span>
              ))}
            </div>
          </div>

          {/* CTA mini */}
          <div>
            <p style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>
              Get Started
            </p>
            <p style={{ fontFamily: FONT_BODY, fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '0 0 16px', maxWidth: '200px' }}>
              Ready to take control of your AI presence?
            </p>
            <button
              onClick={onGetStarted}
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 600,
                fontSize: '13px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                background: GRAD,
                color: '#FFFFFF',
                padding: '10px 22px',
                boxShadow: '0 4px 14px rgba(249,115,22,0.30)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Get Started Free
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: 'rgba(255,255,255,0.30)', margin: 0 }}>
            &copy; 2026 T3 Platform. All rights reserved.
          </p>
          <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: 'rgba(255,255,255,0.30)', margin: 0, textAlign: 'right' }}>
            Built by{' '}
            <span style={{ color: '#FB923C', fontWeight: 600 }}>Lane College</span>
            {' '}for{' '}
            <span style={{ color: '#FB923C', fontWeight: 600 }}>HBCU Battle of the Brains 2026</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   ROOT COMPONENT
───────────────────────────────────────────── */
export default function LandingPage({ onGetStarted }) {
  // Ensure scroll starts at top when landing page mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleGetStarted = () => {
    if (typeof onGetStarted === 'function') {
      onGetStarted();
    }
  };

  return (
    <div style={{ background: '#F5F7FA', overflowX: 'hidden' }}>
      <Navbar onGetStarted={handleGetStarted} />
      <HeroSection onGetStarted={handleGetStarted} />
      <BrandsMarqueeSection />
      <ProblemSection />
      <HowItWorksSection />
      <GlobeSection />
      <FeaturesSection />
      <StatsSection />
      <PricingSection onGetStarted={handleGetStarted} />
      <CTASection onGetStarted={handleGetStarted} />
      <Footer onGetStarted={handleGetStarted} />
    </div>
  );
}
