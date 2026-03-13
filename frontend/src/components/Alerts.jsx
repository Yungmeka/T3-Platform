import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const severityColors = {
  critical: 'badge-red',
  warning: 'badge-amber',
  info: 'badge-purple',
};

const severityDot = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#7C3AED',
};

const typeBadge = {
  hallucination: 'badge-purple',
  anomaly: 'badge-amber',
  data_validation: 'badge-purple',
  visibility_drop: 'badge-red',
};

const typeLabels = {
  hallucination: 'Hallucination',
  anomaly: 'Anomaly',
  data_validation: 'Data Validation',
  visibility_drop: 'Visibility Drop',
};

const typeIcons = {
  hallucination: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <polygon points="4,1 7,7 1,7" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  anomaly: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  data_validation: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  visibility_drop: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M4 1 L7 4 L4 7 L1 4 Z" fill="currentColor" opacity="0.8" />
    </svg>
  ),
};

const filterLabels = {
  all: 'All Alerts',
  unresolved: 'Unresolved',
  critical: 'Critical Only',
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
    <div className="animate-fade-in">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ backgroundColor: '#10B981', flexShrink: 0 }}
          />
          <h2
            className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: 'Outfit' }}
          >
            Alerts &amp; Anomalies
          </h2>
        </div>
        <p className="text-sm text-slate-600 ml-5">
          Real-time detection for{' '}
          <span className="text-slate-700 font-medium">{brand.name}</span>'s AI presence — review
          and resolve issues as they surface.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        {/* Total */}
        <div
          className="card glow-cyan p-5 text-center animate-fade-in"
          style={{ animationDelay: '0ms' }}
        >
          <p
            className="text-xs text-violet-600 uppercase tracking-widest mb-3"
            style={{ fontFamily: 'Outfit' }}
          >
            Total Alerts
          </p>
          <p
            className="text-4xl font-bold text-violet-600"
            style={{ fontFamily: 'Outfit' }}
          >
            {stats.total}
          </p>
          <p className="text-xs text-slate-500 mt-2">across all severities</p>
        </div>

        {/* Critical */}
        <div
          className="card glow-red p-5 text-center animate-fade-in"
          style={{ animationDelay: '80ms' }}
        >
          <p
            className="text-xs text-red-600 uppercase tracking-widest mb-3"
            style={{ fontFamily: 'Outfit' }}
          >
            Critical
          </p>
          <p
            className="text-4xl font-bold text-red-600"
            style={{ fontFamily: 'Outfit' }}
          >
            {stats.critical}
          </p>
          <p className="text-xs text-slate-500 mt-2">need immediate action</p>
        </div>

        {/* Unresolved */}
        <div
          className="card glow-amber p-5 text-center animate-fade-in"
          style={{ animationDelay: '160ms' }}
        >
          <p
            className="text-xs text-amber-600 uppercase tracking-widest mb-3"
            style={{ fontFamily: 'Outfit' }}
          >
            Unresolved
          </p>
          <p
            className="text-4xl font-bold text-amber-600"
            style={{ fontFamily: 'Outfit' }}
          >
            {stats.unresolved}
          </p>
          <p className="text-xs text-slate-500 mt-2">awaiting resolution</p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex gap-2 mb-6">
        {['all', 'unresolved', 'critical'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 ${
              filter === f
                ? 'bg-violet-50 text-violet-600 border border-violet-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
            style={{ fontFamily: 'Outfit' }}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* ── Alert List ── */}
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div
            key={alert.id}
            className={`card animate-fade-in ${alert.resolved ? 'opacity-40' : ''}`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">

                {/* Left: content */}
                <div className="flex-1 min-w-0">

                  {/* Badge row */}
                  <div className="flex items-center flex-wrap gap-2 mb-3">

                    {/* Severity badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${severityColors[alert.severity]}`}
                      style={{ fontFamily: 'Outfit' }}
                    >
                      <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
                        <circle cx="3" cy="3" r="3" fill={severityDot[alert.severity]} />
                      </svg>
                      {alert.severity}
                    </span>

                    {/* Type badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeBadge[alert.alert_type]}`}
                      style={{ fontFamily: 'Outfit' }}
                    >
                      {typeIcons[alert.alert_type]}
                      {typeLabels[alert.alert_type]}
                    </span>

                    {/* Resolved badge */}
                    {alert.resolved && (
                      <span
                        className="badge-green inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ fontFamily: 'Outfit' }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                          <path
                            d="M1.5 4.5 L3 6 L6.5 2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Resolved
                      </span>
                    )}
                  </div>

                  {/* Alert body inside inner-card */}
                  <div className="inner-card p-3 mb-3">
                    <h4
                      className="text-slate-800 font-semibold text-sm mb-1 leading-snug"
                      style={{ fontFamily: 'Outfit' }}
                    >
                      {alert.title}
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{alert.description}</p>
                  </div>

                  {/* Timestamp */}
                  <p className="text-slate-500 text-xs pl-1">
                    {new Date(alert.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                {/* Right: resolve button */}
                {!alert.resolved && (
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 transition-all duration-200 shadow-sm whitespace-nowrap"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* ── Empty State ── */}
        {alerts.length === 0 && (
          <div className="card animate-fade-in">
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl inner-card flex items-center justify-center mb-5">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(148,163,184,0.5)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <p
                className="text-slate-400 font-semibold text-sm mb-1"
                style={{ fontFamily: 'Outfit' }}
              >
                No alerts found
              </p>
              <p className="text-slate-400 text-xs max-w-xs">
                {filter === 'all'
                  ? 'No alerts have been recorded for this brand yet.'
                  : `No ${filterLabels[filter].toLowerCase()} alerts match the current filter.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
