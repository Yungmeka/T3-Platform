import { useState } from 'react';

const sections = [
  {
    label: 'MONITOR',
    items: [
      { id: 'visibility', label: 'Visibility Scan', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z|M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { id: 'dashboard', label: 'Dashboard', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
      { id: 'alerts', label: 'Alerts', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    ],
  },
  {
    label: 'ANALYZE',
    items: [
      { id: 'claims', label: 'Claims', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75' },
      { id: 'sources', label: 'Sources', icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.97-1.085a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07' },
      { id: 'audience', label: 'Audience', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    ],
  },
  {
    label: 'ACT',
    items: [
      { id: 'content', label: 'Content Hub', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z' },
      { id: 'ethics', label: 'Ethics', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
      { id: 'factcheck', label: 'Fact-Checker', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { id: 'query', label: 'Live Query', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
      { id: 'hde', label: 'T3 Sentinel', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5' },
      { id: 'monitoring', label: 'Auto Monitor', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
];

function getBrandColor(brandName) {
  if (!brandName) return '#7C3AED';
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

function NavIcon({ paths }) {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.5}>
      {paths.split('|').map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

export default function Sidebar({ brands, selectedBrand, onSelectBrand, activeTab, onSelectTab, onBackToBrands, onSignOut, session }) {
  const [open, setOpen] = useState(false);

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || 'User';
  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="w-[260px] min-h-screen flex flex-col bg-white flex-shrink-0" style={{ boxShadow: '4px 0 20px rgba(0,0,0,0.03)' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontFamily: 'Outfit' }}>
          T3
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none gradient-text" style={{ fontFamily: 'Outfit' }}>T3</h1>
          <p className="text-[11px] text-slate-400 mt-0.5" style={{ fontFamily: 'DM Sans', letterSpacing: '0.03em' }}>
            Track. Trust. Transform.
          </p>
        </div>
      </div>

      {/* Brand Selector */}
      <div className="px-4 mb-4">
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-white transition-all"
            style={{ fontFamily: 'DM Sans' }}>
            {selectedBrand && (
              <>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: getBrandColor(selectedBrand.name) }}>
                  {selectedBrand.name[0]}
                </span>
                <span className="flex-1 text-left truncate font-medium text-slate-700">{selectedBrand.name}</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </>
            )}
          </button>
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 bg-white border border-slate-200 shadow-lg">
              {brands.map((brand) => (
                <button key={brand.id} onClick={() => { onSelectBrand(brand); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all hover:bg-slate-50 ${
                    selectedBrand?.id === brand.id ? 'bg-violet-50 text-violet-600' : 'text-slate-600'
                  }`}>
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: getBrandColor(brand.name) }}>{brand.name[0]}</span>
                  <span style={{ fontFamily: 'DM Sans' }}>{brand.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Back to Brands */}
      {onBackToBrands && (
        <div className="px-4 mb-3">
          <button
            onClick={onBackToBrands}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-all"
            style={{ fontFamily: 'DM Sans' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Brands
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <div className="sidebar-divider" />}
            <p className="nav-section-label">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isActive ? 'nav-active' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                    style={{ fontFamily: 'DM Sans', fontWeight: isActive ? 600 : 400 }}>
                    <NavIcon paths={item.icon} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
            <span className="text-[10px] font-bold" style={{ fontFamily: 'Outfit' }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate" style={{ fontFamily: 'DM Sans' }}>{userName}</p>
            <p className="text-[10px] text-slate-400">HBCU BOTB 2026</p>
          </div>
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all"
            style={{ fontFamily: 'DM Sans' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
