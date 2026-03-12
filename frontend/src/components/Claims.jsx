import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const statusColors = {
  accurate: 'bg-green-500/20 text-green-400',
  hallucinated: 'bg-red-500/20 text-red-400',
  outdated: 'bg-amber-500/20 text-amber-400',
  missing: 'bg-slate-500/20 text-slate-400',
};

export default function Claims({ brand }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('all');

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

  const stats = {
    total: claims.length,
    accurate: claims.filter((c) => c.status === 'accurate').length,
    hallucinated: claims.filter((c) => c.status === 'hallucinated').length,
    outdated: claims.filter((c) => c.status === 'outdated').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Claims Analysis</h2>
        <p className="text-sm text-slate-500">AI claims extracted for {brand.name}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Claims</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-green-500/30 p-5 text-center glow-green">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Accurate</p>
          <p className="text-3xl font-bold text-green-400">{stats.accurate}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-red-500/30 p-5 text-center glow-red">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Hallucinated</p>
          <p className="text-3xl font-bold text-red-400">{stats.hallucinated}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl border border-amber-500/30 p-5 text-center glow-amber">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Outdated</p>
          <p className="text-3xl font-bold text-amber-400">{stats.outdated}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'accurate', 'hallucinated', 'outdated', 'missing'].map((f) => (
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
        {claims.map((claim) => (
          <div key={claim.id} className="bg-[#111827] rounded-2xl border border-[#1E293B] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[claim.status]}`}>
                    {claim.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#1A2332] text-slate-300">
                    {claim.claim_type}
                  </span>
                  {claim.ai_responses?.platform && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/20 text-indigo-400">
                      {claim.ai_responses.platform}
                    </span>
                  )}
                  {claim.confidence && (
                    <span className="text-xs text-slate-500">
                      {(claim.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
                <p className="text-white text-sm mb-1">
                  <span className="text-slate-400">AI claimed: </span>
                  {claim.claim_text}
                </p>
                {claim.ground_truth_value && claim.status !== 'accurate' && (
                  <p className="text-sm">
                    <span className="text-slate-400">Ground truth: </span>
                    <span className="text-green-400">{claim.ground_truth_value}</span>
                  </p>
                )}
                {claim.ai_responses?.queries?.query_text && (
                  <p className="text-xs text-slate-600 mt-2">
                    Query: "{claim.ai_responses.queries.query_text}"
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {claims.length === 0 && (
          <p className="text-slate-500 text-center py-8">No claims found.</p>
        )}
      </div>
    </div>
  );
}
