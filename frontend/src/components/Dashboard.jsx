import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function StatCard({ label, value, suffix = '%', trend, color, icon }) {
  const colorMap = {
    purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', glow: 'glow-purple' },
    cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', glow: 'glow-cyan' },
    green: { border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400', glow: 'glow-green' },
    red: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', glow: 'glow-red' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', glow: 'glow-amber' },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} ${c.glow} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
        {icon}
      </div>
      <p className={`text-3xl font-bold ${c.text} tracking-tight`}>
        {value !== null && value !== undefined ? `${Number(value).toFixed(1)}${suffix}` : '—'}
      </p>
      {trend !== null && trend !== undefined && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${trend > 0 ? (color === 'red' ? 'text-red-400' : 'text-green-400') : (color === 'red' ? 'text-green-400' : 'text-red-400')}`}>
          <span>{(color === 'red' ? trend < 0 : trend > 0) ? '↑' : '↓'}</span>
          {Math.abs(trend).toFixed(1)}% vs first week
        </p>
      )}
    </div>
  );
}

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1A2332] border border-[#253347] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{Number(p.value).toFixed(1)}%</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard({ brand }) {
  const [snapshots, setSnapshots] = useState([]);
  const [latest, setLatest] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const { data: snaps } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('brand_id', brand.id)
        .order('date', { ascending: true });

      if (snaps && snaps.length > 0) {
        setSnapshots(snaps);
        setLatest(snaps[snaps.length - 1]);
      }

      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brand.id)
        .eq('resolved', false);

      setAlertCount(count || 0);
    }
    fetchData();
  }, [brand.id]);

  const trend = (field) => {
    if (snapshots.length < 8) return null;
    const lastWeekAvg = snapshots.slice(-7).reduce((s, r) => s + (r[field] || 0), 0) / 7;
    const firstWeekAvg = snapshots.slice(0, 7).reduce((s, r) => s + (r[field] || 0), 0) / 7;
    return lastWeekAvg - firstWeekAvg;
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Dashboard</h2>
        <p className="text-sm text-slate-500">Quick overview of {brand.name}'s AI visibility and trust metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Trust Score" value={latest?.brand_trust_score} color="purple" trend={trend('brand_trust_score')} />
        <StatCard label="Inclusion Rate" value={latest?.inclusion_rate} color="cyan" trend={trend('inclusion_rate')} />
        <StatCard label="Accuracy" value={latest?.accuracy_score} color="green" trend={trend('accuracy_score')} />
        <StatCard label="Hallucination" value={latest?.hallucination_rate} color="red" trend={trend('hallucination_rate')} />
        <StatCard label="Active Alerts" value={alertCount} suffix="" color="amber" trend={null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-6">Visibility & Trust Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} axisLine={{ stroke: '#1E293B' }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} domain={[0, 100]} axisLine={{ stroke: '#1E293B' }} />
              <Tooltip content={customTooltip} />
              <Line type="monotone" dataKey="brand_trust_score" stroke="#A78BFA" strokeWidth={2} dot={false} name="Trust Score" />
              <Line type="monotone" dataKey="inclusion_rate" stroke="#22D3EE" strokeWidth={2} dot={false} name="Inclusion Rate" />
              <Line type="monotone" dataKey="accuracy_score" stroke="#4ADE80" strokeWidth={2} dot={false} name="Accuracy" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-6">Hallucination Rate Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} axisLine={{ stroke: '#1E293B' }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} domain={[0, 40]} axisLine={{ stroke: '#1E293B' }} />
              <Tooltip content={customTooltip} />
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F87171" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="hallucination_rate" stroke="#F87171" fill="url(#redGrad)" strokeWidth={2} name="Hallucination %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-6">Daily Query Volume</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} axisLine={{ stroke: '#1E293B' }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={{ stroke: '#1E293B' }} />
            <Tooltip content={customTooltip} />
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="total_queries" stroke="#22D3EE" fill="url(#cyanGrad)" strokeWidth={2} name="Queries" />
            <Area type="monotone" dataKey="total_mentions" stroke="#A78BFA" fill="url(#purpleGrad)" strokeWidth={2} name="Mentions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
