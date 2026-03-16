import { useState } from 'react';
import { supabase } from '../supabase';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm ' +
  'placeholder:text-slate-400 outline-none transition-all duration-200 ' +
  'focus:border-violet-400 focus:ring-1 focus:ring-violet-400';

export default function AuthPage({ onBack }) {
  const [mode, setMode]       = useState('signin'); // 'signin' | 'register'
  const [name, setName]       = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const switchMode = (next) => {
    setMode(next);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!companyName.trim()) {
          setError('Company / Brand name is required.');
          setLoading(false);
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, company_name: companyName } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: '#F5F7FA' }}
    >
      {/* Decorative blur blobs */}
      <div
        className="absolute top-[-80px] left-[-100px] w-[420px] h-[420px] rounded-full bg-purple-400/30 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-60px] right-[-80px] w-[380px] h-[380px] rounded-full bg-purple-400/30 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-[40%] left-[60%] w-[260px] h-[260px] rounded-full bg-pink-400/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative z-10 w-full flex flex-col animate-fade-in"
        style={{
          maxWidth: '420px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 8px 48px rgba(0, 0, 0, 0.10), 0 2px 12px rgba(124, 58, 237, 0.08)',
          margin: '24px',
          padding: '40px 36px 32px',
        }}
      >
        {/* Back link */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 mb-4 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to home
          </button>
        )}

        {/* Logo row */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            {/* Icon box */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              }}
            >
              <img src="/logos/t3-logo.png" alt="T3" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            </div>

            {/* Word mark */}
            <span
              className="gradient-text"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: '28px',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              T3
            </span>
          </div>

          {/* Tagline */}
          <p
            className="text-slate-400 text-center"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              letterSpacing: '0.04em',
              marginTop: '2px',
            }}
          >
            Track. Trust. Transform.
          </p>
        </div>

        {/* Pill toggle */}
        <div
          className="flex mb-7 p-1 rounded-full"
          style={{ background: '#F1F5F9' }}
          role="tablist"
          aria-label="Authentication mode"
        >
          {[
            { id: 'signin',   label: 'Sign In' },
            { id: 'register', label: 'Register' },
          ].map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              onClick={() => switchMode(id)}
              className="flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-200"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: mode === id
                  ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                  : 'transparent',
                color: mode === id ? '#FFFFFF' : '#64748B',
                boxShadow: mode === id ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-3">
            {isRegister && (
              <>
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-semibold text-slate-500 mb-1.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isRegister}
                    className={INPUT_CLASS}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-company"
                    className="block text-xs font-semibold text-slate-500 mb-1.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Company / Brand Name
                  </label>
                  <input
                    id="auth-company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={isRegister}
                    className={INPUT_CLASS}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-500 mb-1.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={INPUT_CLASS}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-slate-500 mb-1.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'Min. 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={INPUT_CLASS}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p
              className="mt-4 text-sm text-red-500 text-center"
              role="alert"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3 rounded-full text-white text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.35)',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isRegister ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p
          className="text-center text-[11px] text-slate-400 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Register your brand to start tracking AI visibility
        </p>
      </div>
    </div>
  );
}
