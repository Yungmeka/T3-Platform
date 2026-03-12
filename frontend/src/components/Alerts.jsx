import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const severityColors = {
  critical: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

const severityBadge = {
  critical: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
  info: 'bg-blue-500/20 text-blue-400',
};

const typeBadge = {
  hallucination: 'bg-purple-500/20 text-purple-400',
  anomaly: 'bg-orange-500/20 text-orange-400',
  data_validation: 'bg-cyan-500/20 text-cyan-400',
  visibility_drop: 'bg-pink-500/20 text-pink-400',
};

const typeLabels = {
  hallucination: 'Hallucination',
  anomaly: 'Anomaly',
  data_validation: 'Data Validation',
  visibility_drop: 'Visibility Drop',
};

export default function Alerts({ brand }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchAlerts() {
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (filter === 'unresolved') query = query.eq('resolved', false);
      if (filter === 'critical') query = query.eq('severity', 'critical');

      const { data } = await query;
      setAlerts(data || []);
    }
    fetchAlerts();
  }, [brand.id, filter]);

  async function resolveAlert(id) {
    await supabase.from('alerts').update({ resolved: true }).eq('id', id);
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  }

  const stats = {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical' && !a.resolved).length,
    unresolved: alerts.filter((a) => !a.resolved).length,
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Alerts & Anomalies</h2>
        <p className="text-sm text-slate-500">Real-time alerts for {brand.name}'s AI presence</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Alerts</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-red-500/30 p-5 text-center glow-red">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Critical</p>
          <p className="text-3xl font-bold text-red-400">{stats.critical}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-amber-500/30 p-5 text-center glow-amber">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Unresolved</p>
          <p className="text-3xl font-bold text-amber-400">{stats.unresolved}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'unresolved', 'critical'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm capitalize transition-colors ${
              filter === f ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[#111827] text-slate-400 border border-[#1E293B] hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-2xl border p-5 ${alert.resolved ? 'opacity-50 border-[#1E293B] bg-[#111827]/50' : severityColors[alert.severity]}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${severityBadge[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeBadge[alert.alert_type]}`}>
                    {typeLabels[alert.alert_type]}
                  </span>
                  {alert.resolved && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-500/20 text-green-400">
                      Resolved
                    </span>
                  )}
                </div>
                <h4 className="text-white font-medium text-sm mb-1">{alert.title}</h4>
                <p className="text-slate-400 text-sm">{alert.description}</p>
                <p className="text-slate-600 text-xs mt-2">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              {!alert.resolved && (
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-xs font-medium hover:bg-green-500/30 transition-colors whitespace-nowrap"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-slate-500 text-center py-8">No alerts found.</p>
        )}
      </div>
    </div>
  );
}
