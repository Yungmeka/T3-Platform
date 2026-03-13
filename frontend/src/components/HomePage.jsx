import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { enrichBrandFromWebsite } from '../services/sentinel';

// Generate a consistent color from a brand name
function getBrandColor(brandName) {
  if (!brandName) return '#7C3AED';
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

function getBrandInitial(brandName) {
  return brandName ? brandName.charAt(0).toUpperCase() : '?';
}

function MiniProgressBar({ value = 0 }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="progress-bar h-1.5 w-full mt-1">
      <div
        className="progress-fill h-1.5"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function BrandCard({ brand, metrics, onClick }) {
  const [hovered, setHovered] = useState(false);
  const color = getBrandColor(brand.name);
  const initial = getBrandInitial(brand.name);

  const trustScore = metrics?.trust_score ?? brand.trust_score ?? null;
  const inclusionRate = metrics?.inclusion_rate ?? brand.inclusion_rate ?? null;

  return (
    <button
      className="card text-left w-full p-5 flex flex-col gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      style={{
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(brand)}
      aria-label={`Select ${brand.name}`}
    >
      {/* Brand identity row */}
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold text-lg"
          style={{
            width: 48,
            height: 48,
            backgroundColor: color,
            fontFamily: 'Outfit, sans-serif',
          }}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p
            className="font-bold text-slate-900 truncate text-base leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {brand.name}
          </p>
          {brand.industry && (
            <p
              className="text-xs text-slate-400 truncate mt-0.5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {brand.industry}
            </p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-3">
        {/* Trust Score */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span
              className="text-xs font-medium text-slate-500"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Trust Score
            </span>
            <span
              className="text-xs font-semibold text-slate-700"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {trustScore !== null ? `${Number(trustScore).toFixed(1)}%` : '—'}
            </span>
          </div>
          <MiniProgressBar value={trustScore} />
        </div>

        {/* Inclusion Rate */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span
              className="text-xs font-medium text-slate-500"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Inclusion Rate
            </span>
            <span
              className="text-xs font-semibold text-slate-700"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {inclusionRate !== null ? `${Number(inclusionRate).toFixed(1)}%` : '—'}
            </span>
          </div>
          <MiniProgressBar value={inclusionRate} />
        </div>
      </div>
    </button>
  );
}

export default function HomePage({ brands, onSelectBrand, session, onSignOut, onBrandAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [brandMetrics, setBrandMetrics] = useState({});
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [addingBrand, setAddingBrand] = useState(false);
  const [addError, setAddError] = useState('');
  const [brandForm, setBrandForm] = useState({
    name: '',
    industry: '',
    website: '',
    headquarters: '',
    description: '',
    products_services: '',
    competitors: '',
    target_audience: '',
    key_claims: '',
  });

  function updateForm(field, value) {
    setBrandForm(prev => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setBrandForm({ name: '', industry: '', website: '', headquarters: '', description: '', products_services: '', competitors: '', target_audience: '', key_claims: '' });
    setFormStep(1);
    setAddError('');
  }

  function closeModal() {
    setShowAddBrand(false);
    resetForm();
  }

  function nextStep(e) {
    e.preventDefault();
    setAddError('');
    if (formStep === 1 && !brandForm.name.trim()) {
      setAddError('Brand name is required.');
      return;
    }
    setFormStep(prev => prev + 1);
  }

  async function handleAddBrand(e) {
    e.preventDefault();
    setAddingBrand(true);
    setAddError('');
    try {
      const insert = {};
      for (const [key, val] of Object.entries(brandForm)) {
        insert[key] = val.trim() || null;
      }
      insert.user_id = session.user.id;
      const { data: newBrand, error } = await supabase.from('brands').insert(insert).select().single();
      if (error) throw error;

      // Auto-discover products from website in background
      if (newBrand && newBrand.website) {
        enrichBrandFromWebsite(newBrand).catch(err =>
          console.log('Auto-product discovery:', err.message)
        );
      }

      closeModal();
      if (onBrandAdded) onBrandAdded();
    } catch (err) {
      setAddError(err.message || 'Failed to add brand');
    } finally {
      setAddingBrand(false);
    }
  }

  // Fetch latest analytics snapshot per brand
  useEffect(() => {
    async function fetchMetrics() {
      if (!brands || brands.length === 0) return;
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .in('brand_id', brands.map(b => b.id))
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to fetch analytics snapshots:', error);
        return;
      }

      if (!data) return;

      // Group by brand_id, keeping only the latest snapshot per brand
      const latestByBrand = {};
      for (const snapshot of data) {
        const key = snapshot.brand_id;
        if (key && !latestByBrand[key]) {
          latestByBrand[key] = snapshot;
        }
      }

      setBrandMetrics(latestByBrand);
    }

    fetchMetrics();
  }, [brands]);

  const displayName =
    session?.user?.user_metadata?.full_name || session?.user?.email || 'User';

  const filteredBrands = (brands || []).filter((brand) =>
    brand.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="min-h-screen bg-[#F5F7FA] flex flex-col"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* ── Top header bar ── */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4">
        {/* Greeting */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-xl font-bold text-slate-900 truncate"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Welcome back,{' '}
            <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Select a brand to explore your dashboard
          </p>
        </div>

        {/* Search bar */}
        <div className="relative flex-shrink-0 w-64">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
            aria-label="Search brands"
          />
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="btn-secondary flex-shrink-0 flex items-center gap-1.5 text-sm"
          aria-label="Sign out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
            />
          </svg>
          Sign Out
        </button>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 px-8 py-8 max-w-[1400px] mx-auto w-full">
        {/* Section heading */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-bold text-slate-800"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Your Brands
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button
            onClick={() => setShowAddBrand(true)}
            className="px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
            }}
          >
            + Add Brand
          </button>
        </div>

        {/* Brand cards grid */}
        {filteredBrands.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBrands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                metrics={brandMetrics[brand.id] || null}
                onClick={onSelectBrand}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p
              className="text-lg font-bold text-slate-800 mb-1"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Register your first brand
            </p>
            <p className="text-sm text-slate-400 mb-6 max-w-sm">
              Add your company to start tracking how AI platforms like ChatGPT, Gemini, and Perplexity represent your brand.
            </p>
            <button
              onClick={() => setShowAddBrand(true)}
              className="px-8 py-3 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.35)',
              }}
            >
              + Add Your Brand
            </button>
          </div>
        )}
      </main>

      {/* Add Brand Modal — Multi-Step */}
      {showAddBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="w-full max-w-lg mx-4 bg-white animate-fade-in overflow-hidden"
            style={{ borderRadius: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.12)' }}
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100">
              <div
                className="h-1 transition-all duration-300"
                style={{
                  width: `${(formStep / 3) * 100}%`,
                  background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                }}
              />
            </div>

            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h3
                  className="text-lg font-bold text-slate-800"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {formStep === 1 && 'Company Details'}
                  {formStep === 2 && 'Products & Market'}
                  {formStep === 3 && 'Review & Submit'}
                </h3>
                <span className="text-xs text-slate-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Step {formStep} of 3
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {formStep === 1 && 'Tell us about your company so T3 can accurately track your AI presence'}
                {formStep === 2 && 'Help us understand what to look for across AI platforms'}
                {formStep === 3 && 'Confirm your details before we start tracking'}
              </p>

              {/* Step 1: Company Details */}
              {formStep === 1 && (
                <form onSubmit={nextStep}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Brand / Company Name *
                      </label>
                      <input
                        type="text"
                        value={brandForm.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                        placeholder="e.g. Acme Inc."
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          Industry *
                        </label>
                        <input
                          type="text"
                          value={brandForm.industry}
                          onChange={(e) => updateForm('industry', e.target.value)}
                          placeholder="e.g. Technology"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          Headquarters
                        </label>
                        <input
                          type="text"
                          value={brandForm.headquarters}
                          onChange={(e) => updateForm('headquarters', e.target.value)}
                          placeholder="e.g. Austin, TX"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Website
                      </label>
                      <input
                        type="text"
                        value={brandForm.website}
                        onChange={(e) => updateForm('website', e.target.value)}
                        placeholder="e.g. https://acme.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Company Description *
                      </label>
                      <textarea
                        value={brandForm.description}
                        onChange={(e) => updateForm('description', e.target.value)}
                        placeholder="What does your company do? This helps T3 verify if AI platforms describe you correctly."
                        rows={3}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all resize-none"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                    </div>
                  </div>
                  {addError && <p className="mt-3 text-sm text-red-500">{addError}</p>}
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-3 rounded-full text-white text-sm font-semibold transition-all" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)' }}>
                      Next
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Products & Market */}
              {formStep === 2 && (
                <form onSubmit={nextStep}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Key Products / Services *
                      </label>
                      <textarea
                        value={brandForm.products_services}
                        onChange={(e) => updateForm('products_services', e.target.value)}
                        placeholder="List your main products or services. e.g. XPS 15 Laptop, Inspiron Desktop, Dell Monitor S2722QC"
                        rows={3}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all resize-none"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">T3 will track how AI describes these specific products</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Main Competitors
                      </label>
                      <textarea
                        value={brandForm.competitors}
                        onChange={(e) => updateForm('competitors', e.target.value)}
                        placeholder="Who are your competitors? e.g. HP, Lenovo, Apple"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all resize-none"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">We'll alert you when competitors appear instead of your brand</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={brandForm.target_audience}
                        onChange={(e) => updateForm('target_audience', e.target.value)}
                        placeholder="e.g. Small business owners, students, gamers"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Key Claims to Verify
                      </label>
                      <textarea
                        value={brandForm.key_claims}
                        onChange={(e) => updateForm('key_claims', e.target.value)}
                        placeholder="What facts should AI get right about you? e.g. Founded in 1984, HQ in Round Rock TX, #1 PC vendor worldwide"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all resize-none"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">T3 uses these as ground truth to detect hallucinations</p>
                    </div>
                  </div>
                  {addError && <p className="mt-3 text-sm text-red-500">{addError}</p>}
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setFormStep(1)} className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Back
                    </button>
                    <button type="submit" className="flex-1 py-3 rounded-full text-white text-sm font-semibold transition-all" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)' }}>
                      Next
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Review */}
              {formStep === 3 && (
                <form onSubmit={handleAddBrand}>
                  <div className="space-y-3 mb-6">
                    {[
                      { label: 'Company', value: brandForm.name },
                      { label: 'Industry', value: brandForm.industry },
                      { label: 'Website', value: brandForm.website },
                      { label: 'Headquarters', value: brandForm.headquarters },
                      { label: 'Description', value: brandForm.description },
                      { label: 'Products / Services', value: brandForm.products_services },
                      { label: 'Competitors', value: brandForm.competitors },
                      { label: 'Target Audience', value: brandForm.target_audience },
                      { label: 'Key Claims', value: brandForm.key_claims },
                    ].filter(item => item.value?.trim()).map((item, i) => (
                      <div key={i} className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
                        <span className="text-xs font-semibold text-slate-400 w-28 flex-shrink-0 pt-0.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          {item.label}
                        </span>
                        <span className="text-sm text-slate-700 flex-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-xl p-4 mb-6"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))' }}
                  >
                    <p className="text-xs text-slate-600" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Once submitted, T3 will begin tracking how AI platforms describe <strong>{brandForm.name}</strong>, detect hallucinations using your key claims, and alert you when competitors appear instead of your brand.
                    </p>
                  </div>
                  {addError && <p className="mb-3 text-sm text-red-500">{addError}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setFormStep(2)} className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={addingBrand}
                      className="flex-1 py-3 rounded-full text-white text-sm font-semibold disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)' }}
                    >
                      {addingBrand ? 'Registering...' : 'Start Tracking'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 px-8 py-4">
        <p
          className="text-center text-xs text-slate-400"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          T3 — Track. Trust. Transform.
        </p>
      </footer>
    </div>
  );
}
