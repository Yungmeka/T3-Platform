import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Alerts from './components/Alerts';
import Claims from './components/Claims';
import Sources from './components/Sources';
import ContentGenerator from './components/ContentGenerator';
import Audience from './components/Audience';
import Ethics from './components/Ethics';
import FactChecker from './components/FactChecker';
import LiveQuery from './components/LiveQuery';
import VisibilityScan from './components/VisibilityScan';
import HDE from './components/HDE';
import Monitoring from './components/Monitoring';
import Integrations from './components/Integrations';
import ApiKeys from './components/ApiKeys';
import Webhooks from './components/Webhooks';
import FullPipeline from './components/FullPipeline';
import Billing from './components/Billing';
import Onboarding from './components/Onboarding';

const pageLabels = {
  visibility: 'Visibility Scan',
  dashboard: 'Dashboard',
  pipeline: 'Full AI Pipeline',
  alerts: 'Alerts',
  claims: 'Claims',
  sources: 'Sources',
  content: 'Content Generator',
  audience: 'Audience',
  ethics: 'Ethics',
  factcheck: 'Fact-Checker',
  query: 'Live Query',
  hde: 'T3 Sentinel',
  monitoring: 'Auto Monitor',
  integrations: 'Integrations',
  apikeys: 'API Keys',
  webhooks: 'Webhooks',
  billing: 'Billing',
};

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAuth, setShowAuth] = useState(false);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setSelectedBrand(null);
    setBrands([]);
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
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
        onComplete={() => {
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

  // Session + brand selected → Dashboard layout
  const pages = {
    visibility: VisibilityScan,
    dashboard: Dashboard,
    pipeline: FullPipeline,
    alerts: Alerts,
    claims: Claims,
    sources: Sources,
    content: ContentGenerator,
    audience: Audience,
    ethics: Ethics,
    factcheck: FactChecker,
    query: LiveQuery,
    hde: HDE,
    monitoring: Monitoring,
    integrations: Integrations,
    apikeys: ApiKeys,
    webhooks: Webhooks,
    billing: Billing,
  };

  const ActivePage = pages[activeTab] || Dashboard;
  const currentLabel = pageLabels[activeTab] || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar
        brands={brands}
        selectedBrand={selectedBrand}
        onSelectBrand={setSelectedBrand}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onBackToBrands={() => setSelectedBrand(null)}
        onSignOut={handleSignOut}
        session={session}
      />

      <div className="flex flex-col min-h-screen md:ml-[260px]">
        {/* Breadcrumb bar */}
        <div className="sticky top-0 z-30 flex-shrink-0 flex items-center px-4 md:px-8 py-3 gap-2 bg-white/80 backdrop-blur-sm pl-14 md:pl-8" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
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

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 md:py-6">
            {selectedBrand && <ActivePage brand={selectedBrand} onNavigate={setActiveTab} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
