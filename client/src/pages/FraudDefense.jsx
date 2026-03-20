import { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Shield, AlertTriangle, CheckCircle, RefreshCw,
  MapPin, Clock, Activity, Cpu, Wifi, TrendingUp
} from 'lucide-react';

const VERDICT_CONFIG = {
  genuine_worker: {
    label: 'Genuine Worker',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'badge-emerald',
    bar: 'bg-emerald-500',
  },
  suspicious: {
    label: 'Suspicious Activity',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'badge-amber',
    bar: 'bg-amber-500',
  },
  fraud_risk: {
    label: 'Fraud Risk',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'badge-red',
    bar: 'bg-red-500',
  },
};

const SIGNAL_META = {
  gpsConsistency:    { label: 'GPS Consistency',    icon: MapPin,        desc: 'Location jump & city match checks' },
  claimFrequency:    { label: 'Claim Frequency',    icon: TrendingUp,    desc: 'Duplicate & burst claim detection' },
  activityRatio:     { label: 'Activity Ratio',     icon: Activity,      desc: 'Claims vs delivery work balance' },
  devicePattern:     { label: 'Device Pattern',     icon: Cpu,           desc: 'Session burst & automation detection' },
  timestampValidity: { label: 'Timestamp Validity', icon: Clock,         desc: 'Off-hours & impossible time gaps' },
  ipLocationMatch:   { label: 'IP Location Match',  icon: Wifi,          desc: 'GPS city vs network location' },
};

const SEVERITY_STYLE = {
  low:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high:   'bg-red-50 text-red-700 border-red-200',
};

function ScoreBar({ score, color }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${score}%` }} />
    </div>
  );
}

export default function FraudDefense() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async (fresh = false) => {
    if (fresh) setRefreshing(true);
    try {
      // Use cached first, then allow manual refresh for fresh analysis
      const endpoint = fresh ? '/fraud/my-report' : '/fraud/my-report/cached';
      const { data } = await api.get(endpoint);
      setReport(data);
    } catch {
      // If no cached report, run fresh
      try {
        const { data } = await api.get('/fraud/my-report');
        setReport(data);
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReport(false); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!report) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <Shield className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <p className="text-gray-500 font-medium">No fraud analysis yet.</p>
      <button onClick={() => fetchReport(true)}
        className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 transition-all">
        Run Analysis
      </button>
    </div>
  );

  const vc      = VERDICT_CONFIG[report.verdict] || VERDICT_CONFIG.genuine_worker;
  const VIcon   = vc.icon;
  const signals = report.signals || {};
  const snap    = report.analysisSnapshot || {};

  const scoreColor = report.fraudScore >= 60 ? 'bg-red-500'
    : report.fraudScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-5 max-w-4xl mx-auto fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Adversarial Defense</h1>
          <p className="text-gray-500 text-sm mt-0.5">Anti-spoofing & fraud analysis for your account</p>
        </div>
        <button onClick={() => fetchReport(true)} disabled={refreshing}
          className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>

      {/* Verdict card */}
      <div className={`card p-6 border-2 ${vc.border} ${vc.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-white/70 border ${vc.border}`}>
              <VIcon className={`w-7 h-7 ${vc.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Verdict</p>
              <p className={`text-2xl font-bold ${vc.color}`}>{vc.label}</p>
              <p className="text-xs text-gray-500 mt-1">
                Last analyzed: {new Date(report.lastAnalyzedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Fraud score gauge */}
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={report.fraudScore >= 60 ? '#ef4444' : report.fraudScore >= 30 ? '#f59e0b' : '#10b981'}
                  strokeWidth="10"
                  strokeDasharray={`${(report.fraudScore / 100) * 251.2} 251.2`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${vc.color}`}>{report.fraudScore}</span>
                <span className="text-[10px] text-gray-400">/ 100</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Fraud Score</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>0 — Safe</span><span>30 — Suspicious</span><span>60 — Risk</span><span>100</span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-[30%] bg-emerald-200 rounded-l-full" />
            <div className="absolute inset-y-0 left-[30%] w-[30%] bg-amber-200" />
            <div className="absolute inset-y-0 left-[60%] right-0 bg-red-200 rounded-r-full" />
            <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${scoreColor} opacity-80`}
              style={{ width: `${report.fraudScore}%` }} />
          </div>
        </div>
      </div>

      {/* Snapshot stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Claims',      value: snap.totalClaims     ?? 0 },
          { label: 'Claims (7 days)',   value: snap.claimsLast7Days ?? 0 },
          { label: 'Total Deliveries',  value: snap.totalDeliveries ?? 0 },
          { label: 'Registered City',   value: snap.registeredCity  ?? '—' },
          { label: 'Last Claim City',   value: snap.lastClaimCity   ?? '—' },
          { label: 'Active Flags',      value: report.flags?.length ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-lg font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Signal breakdown */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">Signal Breakdown</h3>
        <div className="space-y-4">
          {Object.entries(SIGNAL_META).map(([key, meta]) => {
            const sig   = signals[key] || { score: 0, detail: 'Not analyzed' };
            const Icon  = meta.icon;
            const color = sig.score >= 60 ? 'bg-red-500' : sig.score >= 30 ? 'bg-amber-500' : 'bg-emerald-500';
            const tc    = sig.score >= 60 ? 'text-red-600' : sig.score >= 30 ? 'text-amber-600' : 'text-emerald-600';
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{meta.label}</p>
                      <p className="text-xs text-gray-400">{sig.detail}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tc}`}>{sig.score}/100</span>
                </div>
                <ScoreBar score={sig.score} color={color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Active flags */}
      {report.flags?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Active Flags ({report.flags.length})
          </h3>
          <div className="space-y-2">
            {report.flags.map((flag, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${SEVERITY_STYLE[flag.severity] || SEVERITY_STYLE.medium}`}>
                <span className="font-bold uppercase text-[10px] tracking-wider mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded bg-white/60">
                  {flag.severity}
                </span>
                <div className="flex-1">
                  <p className="font-medium capitalize">{flag.type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs opacity-80 mt-0.5">{flag.description}</p>
                </div>
                <span className="text-[10px] opacity-60 flex-shrink-0">
                  {new Date(flag.detectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All clear */}
      {report.flags?.length === 0 && (
        <div className="card p-6 text-center border-emerald-200 bg-emerald-50/50">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-semibold text-emerald-700">No flags detected</p>
          <p className="text-xs text-emerald-600 mt-1">Your account passes all anti-spoofing checks</p>
        </div>
      )}

      {/* Info note */}
      <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-700 flex items-start gap-2">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>This analysis runs automatically on every claim submission. A fraud score below 30 means claims are auto-approved. Scores 30–59 go under review. Scores 60+ are blocked pending admin investigation.</p>
      </div>
    </div>
  );
}
