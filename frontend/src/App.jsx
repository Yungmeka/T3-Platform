import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import { getSubscription } from './services/billing';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import Sidebar from './components/Sidebar';
import Onboarding from './components/Onboarding';

// Lazy-loaded page components — each becomes a separate bundle chunk
const Dashboard        = lazy(() => import('./components/Dashboard'));
const VisibilityScan   = lazy(() => import('./components/VisibilityScan'));
const FullPipeline     = lazy(() => import('./components/FullPipeline'));
const Alerts           = lazy(() => import('./components/Alerts'));
const Claims           = lazy(() => import('./components/Claims'));
const Sources          = lazy(() => import('./components/Sources'));
const ContentGenerator = lazy(() => import('./components/ContentGenerator'));
const Audience         = lazy(() => import('./components/Audience'));
const Ethics           = lazy(() => import('./components/Ethics'));
const FactChecker      = lazy(() => import('./components/FactChecker'));
const LiveQuery        = lazy(() => import('./components/LiveQuery'));
const HDE              = lazy(() => import('./components/HDE'));
const Monitoring       = lazy(() => import('./components/Monitoring'));
const Integrations     = lazy(() => import('./components/Integrations'));
const ApiKeys          = lazy(() => import('./components/ApiKeys'));
const Webhooks         = lazy(() => import('./components/Webhooks'));
const Billing          = lazy(() => import('./components/Billing'));
const Settings         = lazy(() => import('./components/Settings'));

const pageLabels = {
  visibility:   'Visibility Scan',
  dashboard:    'Dashboard',
  pipeline:     'Full AI Pipeline',
  alerts:       'Alerts',
  claims:       'Claims',
  sources:      'Sources',
  content:      'Content Generator',
  audience:     'Audience',
  ethics:       'Ethics',
  factcheck:    'Fact-Checker',
  query:        'Live Query',
  hde:          'T3 Sentinel',
  monitoring:   'Auto Monitor',
  integrations: 'Integrations',
  apikeys:      'API Keys',
  webhooks:     'Webhooks',
  billing:      'Billing',
  settings:     'Settings',
};

// Routes that remain accessible even when subscription has lapsed
const UNRESTRICTED_PATHS = ['/billing', '/settings'];

// ─── PageLoader ───────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
        >
          <img src="/logos/t3-logo.png" alt="T3" className="w-7 h-7 object-contain" />
        </div>
        <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}

// ─── Dashboard layout (session + brand required) ──────────────────────────────

function DashboardLayout({ brands, selectedBrand, onSelectBrand, onBackToBrands, onSignOut, session, subscription }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive the current page label from the URL pathname
  const pathSegment = location.pathname.replace('/', '') || 'dashboard';
  const currentLabel = pageLabels[pathSegment] || 'Dashboard';

  // Subscription gate — only block once we have a result (non-null)
  const isRestricted = (() => {
    if (subscription === null) return false; // still loading, don't block
    if (UNRESTRICTED_PATHS.includes(location.pathname)) return false;

    const sub = subscription?.subscription ?? {};
    if (sub.status === 'canceled' || sub.status === 'past_due') return true;
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return true;
    return false;
  })();

  const brandProp = { brand: selectedBrand };
  const onNav = (tab) => navigate(`/${tab}`);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F5F7FA]">
        <Sidebar
          brands={brands}
          selectedBrand={selectedBrand}
          onSelectBrand={onSelectBrand}
          onBackToBrands={onBackToBrands}
          onSignOut={onSignOut}
          session={session}
        />

        <div className="flex flex-col min-h-screen md:ml-[260px]">
          {/* Breadcrumb bar */}
          <div
            className="sticky top-0 z-30 flex-shrink-0 flex items-center px-4 md:px-8 py-3 gap-2 bg-white/80 backdrop-blur-sm pl-14 md:pl-8"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <span className="text-[11px] font-medium text-slate-400" style={{ fontFamily: 'DM Sans' }}>
              T3 Platform
            </span>
            <span className="text-slate-300 text-[10px]">/</span>
            <span className="text-[11px] font-semibold text-slate-600" style={{ fontFamily: 'DM Sans' }}>
              {currentLabel}
            </span>
            <div className="flex-1" />
            <span className="text-[10px] text-slate-400" style={{ fontFamily: 'DM Sans' }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Subscription-expired banner */}
          {isRestricted && (
            <div className="mx-4 md:mx-8 mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700 font-medium flex-1" style={{ fontFamily: 'DM Sans' }}>
                Your subscription has expired. Please update your plan to continue.
              </p>
              <button
                onClick={() => navigate('/billing')}
                className="text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2 flex-shrink-0"
                style={{ fontFamily: 'DM Sans' }}
              >
                Go to Billing
              </button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 md:py-6">
              {selectedBrand && (
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />

                      {/* Unrestricted — always accessible */}
                      <Route path="/billing"  element={<Billing  {...brandProp} onNavigate={onNav} />} />
                      <Route path="/settings" element={<Settings {...brandProp} onNavigate={onNav} />} />

                      {/* Gated pages — redirect to /billing when subscription lapsed */}
                      <Route path="/dashboard"    element={isRestricted ? <Navigate to="/billing" replace /> : <Dashboard       {...brandProp} onNavigate={onNav} />} />
                      <Route path="/visibility"   element={isRestricted ? <Navigate to="/billing" replace /> : <VisibilityScan  {...brandProp} onNavigate={onNav} />} />
                      <Route path="/pipeline"     element={isRestricted ? <Navigate to="/billing" replace /> : <FullPipeline    {...brandProp} onNavigate={onNav} />} />
                      <Route path="/alerts"       element={isRestricted ? <Navigate to="/billing" replace /> : <Alerts          {...brandProp} onNavigate={onNav} />} />
                      <Route path="/claims"       element={isRestricted ? <Navigate to="/billing" replace /> : <Claims          {...brandProp} onNavigate={onNav} />} />
                      <Route path="/sources"      element={isRestricted ? <Navigate to="/billing" replace /> : <Sources         {...brandProp} onNavigate={onNav} />} />
                      <Route path="/content"      element={isRestricted ? <Navigate to="/billing" replace /> : <ContentGenerator {...brandProp} onNavigate={onNav} />} />
                      <Route path="/audience"     element={isRestricted ? <Navigate to="/billing" replace /> : <Audience        {...brandProp} onNavigate={onNav} />} />
                      <Route path="/ethics"       element={isRestricted ? <Navigate to="/billing" replace /> : <Ethics          {...brandProp} onNavigate={onNav} />} />
                      <Route path="/factcheck"    element={isRestricted ? <Navigate to="/billing" replace /> : <FactChecker     {...brandProp} onNavigate={onNav} />} />
                      <Route path="/query"        element={isRestricted ? <Navigate to="/billing" replace /> : <LiveQuery       {...brandProp} onNavigate={onNav} />} />
                      <Route path="/hde"          element={isRestricted ? <Navigate to="/billing" replace /> : <HDE             {...brandProp} onNavigate={onNav} />} />
                      <Route path="/monitoring"   element={isRestricted ? <Navigate to="/billing" replace /> : <Monitoring      {...brandProp} onNavigate={onNav} />} />
                      <Route path="/integrations" element={isRestricted ? <Navigate to="/billing" replace /> : <Integrations    {...brandProp} onNavigate={onNav} />} />
                      <Route path="/apikeys"      element={isRestricted ? <Navigate to="/billing" replace /> : <ApiKeys         {...brandProp} onNavigate={onNav} />} />
                      <Route path="/webhooks"     element={isRestricted ? <Navigate to="/billing" replace /> : <Webhooks        {...brandProp} onNavigate={onNav} />} />

                      {/* Catch-all */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              )}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

function AppInner() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Fetch brands belonging to this user
  const fetchBrands = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', session.user.id);
    if (data) {
      setBrands(data);
    }
  }, [session]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Fetch subscription non-blocking — state stays null until resolved
  useEffect(() => {
    if (!session?.user?.id) return;
    getSubscription(session.user.id).then((result) => {
      // Treat a null result (no subscription row) as effectively unrestricted;
      // use a sentinel object so the gate knows the fetch completed.
      setSubscription(result ?? { subscription: {}, plan: null, usage: null });
    });
  }, [session?.user?.id]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setSelectedBrand(null);
    setBrands([]);
    setSubscription(null);
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            <img src="/logos/t3-logo.png" alt="T3" className="w-8 h-8 object-contain" />
          </div>
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // No session → Landing page or Auth page
  if (!session) {
    if (showAuth) {
      return <AuthPage onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // New user with no brands → Onboarding
  if (brands.length === 0 && !session.user.user_metadata?.onboarding_complete) {
    return (
      <Onboarding
        session={session}
        onComplete={async () => {
          await supabase.auth.updateUser({ data: { onboarding_complete: true } });
          fetchBrands();
        }}
      />
    );
  }

  // Session but no brand selected → Home page
  if (!selectedBrand) {
    return (
      <HomePage
        brands={brands}
        onSelectBrand={setSelectedBrand}
        session={session}
        onSignOut={handleSignOut}
        onBrandAdded={fetchBrands}
      />
    );
  }

  // Session + brand selected → routed dashboard
  return (
    <DashboardLayout
      brands={brands}
      selectedBrand={selectedBrand}
      onSelectBrand={setSelectedBrand}
      onBackToBrands={() => setSelectedBrand(null)}
      onSignOut={handleSignOut}
      session={session}
      subscription={subscription}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

export default App;
