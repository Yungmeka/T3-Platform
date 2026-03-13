import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const statusColors = {
  accurate: 'badge-green',
  hallucinated: 'badge-red',
  outdated: 'badge-amber',
  missing: 'badge-purple',
};

const statCards = [
  { label: 'Total Claims',  key: 'total',       glow: 'glow-purple',  textColor: 'text-violet-600',     delay: '0ms'   },
  { label: 'Accurate',      key: 'accurate',     glow: 'glow-green', textColor: 'text-emerald-600', delay: '80ms'  },
  { label: 'Hallucinated',  key: 'hallucinated', glow: 'glow-red',   textColor: 'text-red-600',     delay: '160ms' },
  { label: 'Outdated',      key: 'outdated',     glow: 'glow-amber', textColor: 'text-amber-600',   delay: '240ms' },
];

export default function Claims({ brand }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, accurate: 0, hallucinated: 0, outdated: 0 });

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase
        .from('claims')
        .select('status')
        .eq('brand_id', brand.id);
      if (data) {
        setStats({
          total: data.length,
          accurate: data.filter((c) => c.status === 'accurate').length,
          hallucinated: data.filter((c) => c.status === 'hallucinated').length,
          outdated: data.filter((c) => c.status === 'outdated').length,
        });
      }
    }
    fetchStats();
  }, [brand.id]);

  useEffect(() => {
    async function fetchClaims() {
      let query = supabase
        .from('claims')
        .select('*, ai_responses(platform, queried_at, queries(query_text))')
        .eq('brand_id', brand.id)
        .order('detected_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setClaims(data || []);
    }
    fetchClaims();
  }, [brand.id, filter]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h2
          className="text-2xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: 'Outfit' }}
        >
          Claims Analysis
        </h2>
        <p className="text-sm text-slate-600">
          AI claims extracted for{' '}
          <span className="text-slate-700 font-medium">{brand.name}</span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {statCards.map(({ label, key, glow, textColor, delay }) => (
          <div
            key={label}
            className={`card ${glow} animate-fade-in p-6 text-center rounded-2xl`}
            style={{ animationDelay: delay }}
          >
            <p
              className="text-xs text-slate-500 uppercase tracking-widest mb-3"
              style={{ fontFamily: 'Outfit' }}
            >
              {label}
            </p>
            <p
              className={`text-4xl font-bold ${textColor}`}
              style={{ fontFamily: 'Outfit', lineHeight: 1 }}
            >
              {stats[key]}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'accurate', 'hallucinated', 'outdated', 'missing'].map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-sm capitalize transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-violet-50 text-violet-600 border border-violet-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
              style={{ fontFamily: 'Outfit' }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Claim List */}
      <div className="space-y-3">
        {claims.map((claim, idx) => (
          <div
            key={claim.id}
            className="card animate-fade-in p-5"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {/* Badge Row */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {/* Status badge */}
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${statusColors[claim.status]}`}
                style={{ fontFamily: 'Outfit' }}
              >
                {claim.status}
              </span>

              {/* Claim type badge */}
              <span
                className="inner-card px-2.5 py-0.5 rounded-lg text-xs text-slate-500"
                style={{ fontFamily: 'Outfit' }}
              >
                {claim.claim_type}
              </span>

              {/* Platform badge */}
              {claim.ai_responses?.platform && (
                <span
                  className="badge-purple px-2.5 py-0.5 rounded-lg text-xs font-medium"
                  style={{ fontFamily: 'Outfit' }}
                >
                  {claim.ai_responses.platform}
                </span>
              )}

              {/* Confidence */}
              {claim.confidence && (
                <span className="text-xs text-slate-500 ml-auto">
                  {(claim.confidence * 100).toFixed(0)}% confidence
                </span>
              )}
            </div>

            {/* AI Claimed block */}
            <div
              className="inner-card px-4 py-3 mb-2 rounded-xl"
              style={{ borderLeft: '2px solid rgba(124,58,237,0.5)' }}
            >
              <p
                className="text-xs uppercase tracking-widest mb-1 text-violet-600"
                style={{ fontFamily: 'Outfit', opacity: 0.9 }}
              >
                AI claimed
              </p>
              <p className="text-sm text-slate-800 leading-relaxed">{claim.claim_text}</p>
            </div>

            {/* Ground Truth block */}
            {claim.ground_truth_value && claim.status !== 'accurate' && (
              <div
                className="inner-card px-4 py-3 mb-2 rounded-xl"
                style={{
                  borderLeft: '2px solid rgba(16,185,129,0.5)',
                  background: 'rgba(16,185,129,0.04)',
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest mb-1 text-emerald-600"
                  style={{ fontFamily: 'Outfit', opacity: 0.9 }}
                >
                  Ground truth
                </p>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  {claim.ground_truth_value}
                </p>
              </div>
            )}

            {/* Query context */}
            {claim.ai_responses?.queries?.query_text && (
              <p className="text-xs mt-2 pl-1 truncate text-slate-400">
                Query: &ldquo;{claim.ai_responses.queries.query_text}&rdquo;
              </p>
            )}
          </div>
        ))}

        {/* Empty State */}
        {claims.length === 0 && (
          <div className="card animate-fade-in flex flex-col items-center justify-center py-16 rounded-2xl">
            <div
              className="text-5xl mb-4"
              style={{ filter: 'grayscale(0.3) opacity(0.5)' }}
            >
              🔍
            </div>
            <p
              className="text-base font-semibold text-slate-400 mb-1"
              style={{ fontFamily: 'Outfit' }}
            >
              No claims found
            </p>
            <p className="text-sm text-slate-400">
              {filter === 'all'
                ? 'No claims have been detected for this brand yet.'
                : `No ${filter} claims match the current filter.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
