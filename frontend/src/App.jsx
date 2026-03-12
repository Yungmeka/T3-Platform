import { useState, useEffect } from 'react';
import { supabase } from './supabase';
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

function App() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    async function fetchBrands() {
      const { data } = await supabase.from('brands').select('*');
      if (data) {
        setBrands(data);
        setSelectedBrand(data[0]);
      }
    }
    fetchBrands();
  }, []);

  const pages = {
    visibility: VisibilityScan,
    dashboard: Dashboard,
    alerts: Alerts,
    claims: Claims,
    sources: Sources,
    content: ContentGenerator,
    audience: Audience,
    ethics: Ethics,
    factcheck: FactChecker,
    query: LiveQuery,
  };

  const ActivePage = pages[activeTab] || Dashboard;

  return (
    <div className="flex min-h-screen bg-[#0B1120]">
      <Sidebar
        brands={brands}
        selectedBrand={selectedBrand}
        onSelectBrand={setSelectedBrand}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {selectedBrand && <ActivePage brand={selectedBrand} />}
        </div>
      </main>
    </div>
  );
}

export default App;
