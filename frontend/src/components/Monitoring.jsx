import { useState, useEffect, useRef } from 'react';

const BACKEND = 'http://localhost:8000';

const statusColors = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  running: 'bg-violet-50 text-violet-700 border-violet-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function Monitoring({ brand }) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  async function fetchStatus() {
    try {
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        fetch(`${BACKEND}/api/monitoring/status`),
        fetch(`${BACKEND}/api/monitoring/history?limit=10`),
      ]);
      setStatus(await statusRes.json());
      setHistory(await historyRes.json());
    } catch {
      setStatus(null);
      setError('Could not connect to backend. Make sure the server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds to show live monitoring updates
    intervalRef.current = setInterval(fetchStatus, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function toggleMonitoring() {
    const endpoint = status?.running ? 'stop' : 'start';
    await fetch(`${BACKEND}/api/monitoring/${endpoint}`, { method: 'POST' });
    fetchStatus();
  }

  async function triggerScan() {
    setTriggering(true);
    try {
      await fetch(`${BACKEND}/api/monitoring/trigger?scan_type=manual`, { method: 'POST' });
      await fetchStatus();
    } finally {
      setTriggering(false);
    }
  }

  async function updateConfig(key, value) {
    await fetch(`${BACKEND}/api/monitoring/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    fetchStatus();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-sm">{error}</div>
  );

  return (
    <div>
      <div className="mb-8">
        <h2
          className="text-xl font-bold text-slate-800 mb-1"
          style={{ fontFamily: 'Outfit' }}
        >
          Automated Monitoring
        </h2>
        <p className="text-sm text-slate-500">
          T3 continuously scans AI platforms for {brand.name} — no manual intervention needed
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-2xl border p-5 mb-6 ${
        status?.running
          ? 'border-green-200 bg-green-50'
          : 'border-amber-200 bg-amber-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${
              status?.running ? 'bg-green-500 animate-pulse' : 'bg-amber-400'
            }`} />
            <div>
              <h3
                className="text-sm font-semibold text-slate-800"
                style={{ fontFamily: 'Outfit' }}
              >
                {status?.running ? 'Automated Monitoring ACTIVE' : 'Monitoring PAUSED'}
              </h3>
              <p className={`text-xs ${status?.running ? 'text-green-600' : 'text-amber-600'}`}>
                {status?.running
                  ? `${status.scheduled_jobs?.length || 0} scheduled jobs running`
                  : 'Start monitoring to enable automated scans'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={triggerScan}
              disabled={triggering}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {triggering ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Scanning...
                </span>
              ) : 'Run Scan Now'}
            </button>
            <button
              onClick={toggleMonitoring}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                status?.running
                  ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                  : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'
              }`}
            >
              {status?.running ? 'Pause' : 'Start'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scans Completed</p>
          <p
            className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: 'Outfit' }}
          >
            {status?.total_scans_completed || 0}
          </p>
        </div>
        <div className="card rounded-2xl border-red-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scans Failed</p>
          <p
            className="text-2xl font-bold text-red-500"
            style={{ fontFamily: 'Outfit' }}
          >
            {status?.total_scans_failed || 0}
          </p>
        </div>
        <div className="card rounded-2xl border-violet-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scheduled Jobs</p>
          <p
            className="text-2xl font-bold text-violet-600"
            style={{ fontFamily: 'Outfit' }}
          >
            {status?.scheduled_jobs?.length || 0}
          </p>
        </div>
        <div className="card rounded-2xl border-green-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Auto-Refresh</p>
          <p
            className="text-2xl font-bold text-green-600"
            style={{ fontFamily: 'Outfit' }}
          >
            30s
          </p>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="card rounded-2xl p-5 mb-6">
        <h3
          className="text-sm font-semibold text-slate-800 mb-4"
          style={{ fontFamily: 'Outfit' }}
        >
          Schedule Configuration
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Daily Scan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-800 font-medium">Daily Full Scan</p>
                <p className="text-[11px] text-slate-500">Runs all queries across all 4 AI platforms</p>
              </div>
              <button
                onClick={() => updateConfig('daily_scan_enabled', !status?.config?.daily_scan_enabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  status?.config?.daily_scan_enabled ? 'bg-violet-500' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                  status?.config?.daily_scan_enabled ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Time:</span>
              <select
                value={status?.config?.daily_scan_hour || 6}
                onChange={(e) => updateConfig('daily_scan_hour', parseInt(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-violet-400"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hourly Check */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-800 font-medium">Interval Monitoring</p>
                <p className="text-[11px] text-slate-500">Quick brand inclusion checks at regular intervals</p>
              </div>
              <button
                onClick={() => updateConfig('hourly_check_enabled', !status?.config?.hourly_check_enabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  status?.config?.hourly_check_enabled ? 'bg-violet-500' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                  status?.config?.hourly_check_enabled ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Every:</span>
              <select
                value={status?.config?.interval_minutes || 60}
                onChange={(e) => updateConfig('interval_minutes', parseInt(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-violet-400"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={360}>6 hours</option>
                <option value={720}>12 hours</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Jobs */}
      {status?.scheduled_jobs?.length > 0 && (
        <div className="card rounded-2xl p-5 mb-6">
          <h3
            className="text-sm font-semibold text-slate-800 mb-3"
            style={{ fontFamily: 'Outfit' }}
          >
            Next Scheduled Scans
          </h3>
          <div className="space-y-2">
            {status.scheduled_jobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between inner-card rounded-lg p-3">
                <div>
                  <p className="text-xs text-slate-800 font-medium">{job.name}</p>
                  <p className="text-[11px] text-slate-500">{job.trigger}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-violet-600 font-medium">
                    {job.next_run ? new Date(job.next_run).toLocaleString() : 'Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan History */}
      <div className="card rounded-2xl p-5">
        <h3
          className="text-sm font-semibold text-slate-800 mb-3"
          style={{ fontFamily: 'Outfit' }}
        >
          Scan History
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No scans yet — click "Run Scan Now" or wait for the next scheduled scan
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((scan, i) => (
              <div key={i} className="inner-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusColors[scan.status] || 'border-slate-200 text-slate-500 bg-white'}`}>
                      {scan.status?.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{scan.type} scan</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {scan.started_at ? new Date(scan.started_at).toLocaleString() : ''}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Brands</p>
                    <p className="text-sm font-semibold text-slate-800">{scan.brands_scanned || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Claims</p>
                    <p className="text-sm font-semibold text-slate-800">{scan.total_claims || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Hallucinations</p>
                    <p className="text-sm font-semibold text-red-500">{scan.hallucinations_found || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Duration</p>
                    <p className="text-sm font-semibold text-slate-600">
                      {scan.duration_seconds ? `${scan.duration_seconds}s` : '—'}
                    </p>
                  </div>
                </div>
                {scan.errors?.length > 0 && (
                  <div className="mt-2 text-[11px] text-red-500">
                    {scan.errors.length} error(s): {scan.errors.map(e => e.brand).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
