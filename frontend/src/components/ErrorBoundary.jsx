import { Component } from 'react';

/* ─── Icons ─────────────────────────────────────────────────────── */
const IconAlertTriangle = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const IconRefresh = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const IconHome = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

/* ─── ErrorBoundary ─────────────────────────────────────────────── */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught a rendering error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.state.error?.message
        ? this.state.error.message.slice(0, 120)
        : 'An unexpected error occurred.';

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#F5F7FA' }}
        role="alert"
        aria-live="assertive"
      >
        {/* Decorative blur blobs — same as AuthPage */}
        <div
          className="fixed top-[-80px] left-[-100px] w-[420px] h-[420px] rounded-full bg-purple-400/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="fixed bottom-[-60px] right-[-80px] w-[380px] h-[380px] rounded-full bg-purple-400/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Card */}
        <div
          className="relative z-10 w-full max-w-md bg-white rounded-2xl p-8 flex flex-col items-center text-center gap-5"
          style={{ boxShadow: '0 4px 24px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {/* Logo area */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            <img
              src="/logos/t3-logo.png"
              alt="T3 Sentinel"
              className="w-9 h-9 object-contain"
              onError={(e) => {
                // If the logo image fails to load, fall back to the warning icon
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'block';
              }}
            />
            {/* Fallback icon — hidden by default, shown if logo fails */}
            <span style={{ display: 'none' }}>
              <IconAlertTriangle />
            </span>
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-xl font-semibold text-slate-800"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Something went wrong
            </h1>
            <p
              className="text-sm text-slate-500 leading-relaxed max-w-xs"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {message}
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-slate-100" aria-hidden="true" />

          {/* Helper text */}
          <p
            className="text-xs text-slate-400"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            You can try recovering below, or reload the page to start fresh.
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full">
            {/* Try Again — gradient primary */}
            <button
              onClick={this.handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 active:opacity-80"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <IconRefresh />
              Try Again
            </button>

            {/* Reload Page — outlined secondary */}
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-violet-600 border border-violet-200 bg-white transition-colors duration-150 hover:bg-violet-50 active:bg-violet-100"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              <IconHome />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
