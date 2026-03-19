import { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  Users, FileText, Activity, CreditCard, CheckCircle,
  AlertTriangle, DollarSign, MapPin, RefreshCw, XCircle,
  TrendingUp, Phone, Mail, Calendar
} from 'lucide-react';

const STATUS = {
  paid:          { badge: 'badge-emerald', label: 'Paid',     dot: 'bg-emerald-500' },
  auto_approved: { badge: 'badge-teal',    label: 'Approved', dot: 'bg-teal-500' },
  pending:       { badge: 'badge-amber',   label: 'Pending',  dot: 'bg-amber-500' },
  flagged:       { badge: 'badge-red',     label: 'Flagged',  dot: 'bg-red-500' },
  rejected:      { badge: 'badge-slate',   label: 'Rejected', dot: 'bg-gray-400' },
};

const CLAIM_ICON = {
  heavy_rain: '🌧', extreme_heat: '🌡',
  poor_air_quality: '💨', storm: '⛈', combined: '🌪',
};

export default function AdminDashboard() {
  const [dashData, setDashData]         = useState(null);
  const [claims, setClaims]             = useState([]);
  const [users, setUsers]               = useState([]);
  const [tab, setTab]                   = useState('overview');
  const [loading, setLoading]           = useState(true);
  const [claimFilter, setClaimFilter]   = useState('all');
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(new Date());

  const load = () => {
    setLastRefresh(new Date());
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/claims?limit=100'),
      api.get('/admin/users'),
    ]).then(([d, c, u]) => {
      setDashData(d.data);
      if (c.data.claims?.length) setClaims(c.data.claims);
      if (u.data?.length) setUsers(u.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateClaim = async (id, status) => {
    await api.put(`/admin/claims/${id}`, { status }).catch(() => {});
    setClaims(prev => prev.map(c => c._id === id ? { ...c, status } : c));
  };

  const totalPayout = claims
    .filter(c => c.status === 'paid' || c.status === 'auto_approved')
    .reduce((s, c) => s + c.payoutAmount, 0);

  const filteredClaims = claimFilter === 'all'
    ? claims
    : claims.filter(c => c.status === claimFilter);

  const byCity = users.reduce((acc, u) => {
    const city = u.location?.city || 'Unknown';
    if (!acc[city]) acc[city] = [];
    acc[city].push(u);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Derived values for overview stats (extracted to avoid ternary-in-object)
  const approvedCount  = claims.filter(c => c.status === 'paid' || c.status === 'auto_approved').length;
  const approvalRate   = claims.length ? `${Math.round((approvedCount / claims.length) * 100)}%` : '0%';
  const paidClaimsLen  = claims.filter(c => c.payoutAmount > 0).length;
  const avgPayout      = paidClaimsLen ? `$${Math.round(totalPayout / paidClaimsLen)}` : '$0';
  const highRiskCount  = users.filter(u => u.riskScore >= 60).length;

  const STATS = [
    { label: 'Total Workers',   value: dashData?.totalUsers  ?? users.length,               icon: Users,         bg: 'icon-teal',    color: 'text-teal-600',    sub: `${users.filter(u => u.isActive).length} active` },
    { label: 'Total Claims',    value: dashData?.totalClaims ?? claims.length,               icon: FileText,      bg: 'icon-emerald', color: 'text-emerald-600', sub: `${claims.filter(c => c.status === 'pending').length} pending` },
    { label: 'Total Payouts',   value: `$${totalPayout.toLocaleString()}`,                   icon: DollarSign,    bg: 'icon-sky',     color: 'text-sky-600',     sub: 'All approved' },
    { label: 'Active Plans',    value: dashData?.activeSubs  ?? users.length,                icon: CreditCard,    bg: 'icon-amber',   color: 'text-amber-600',   sub: 'Subscriptions' },
    { label: 'Sensor Readings', value: (dashData?.totalSensors ?? 0).toLocaleString(),       icon: Activity,      bg: 'icon-violet',  color: 'text-violet-600',  sub: 'All time' },
    { label: 'Fraud Flags',     value: claims.filter(c => c.fraudFlags?.length > 0).length, icon: AlertTriangle, bg: 'icon-red',     color: 'text-red-600',     sub: 'Needs review' },
  ];

  const QUICK = [
    { label: 'Approval Rate',     value: approvalRate,   icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Payout',        value: avgPayout,      icon: DollarSign,  color: 'text-teal-600',    bg: 'bg-teal-50' },
    { label: 'High Risk Workers', value: highRiskCount,  icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50' },
  ];

  const claimStatusCounts = claims.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 max-w-7xl mx-auto fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Refreshed {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS.map(({ label, value, icon: Icon, bg, color, sub }) => (
          <div key={label} className="stat-card">
            <div className={`inline-flex ${bg} mb-3`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <p className="text-lg font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'workers',  label: `Workers (${users.length})` },
          { key: 'claims',   label: `Claims (${claims.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`tab-btn ${tab === key ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-5">

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-5 flex items-center gap-4">
                <div className={`p-3 ${bg} rounded-2xl flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent claims + city breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            <div className="card p-5 lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">Recent Claims</h3>
                <button onClick={() => setTab('claims')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {(dashData?.recentClaims?.length ? dashData.recentClaims : claims).slice(0, 8).map(claim => {
                  const s = STATUS[claim.status] || STATUS.pending;
                  return (
                    <div key={claim._id} className="row-item flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{CLAIM_ICON[claim.claimType] || '📋'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-700">{claim.worker?.name || 'Unknown'}</p>
                            <span className={s.badge}>{s.label}</span>
                          </div>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {claim.worker?.location?.city} · <span className="capitalize">{claim.claimType?.replace(/_/g, ' ')}</span> ·{' '}
                            {new Date(claim.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-800">${claim.payoutAmount}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5 lg:col-span-2 space-y-5">
              <div>
                <h3 className="section-title mb-3">Workers by City</h3>
                <div className="space-y-3">
                  {Object.entries(byCity).map(([city, workers]) => {
                    const active = workers.filter(w => w.isActive).length;
                    const pct = Math.round((active / workers.length) * 100);
                    return (
                      <div key={city}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-sm font-medium text-gray-700">{city}</span>
                          </div>
                          <span className="text-xs text-gray-400">{active}/{workers.length} · <span className="font-semibold text-teal-600">{pct}%</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="section-title mb-3">Claim Status Breakdown</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(claimStatusCounts).map(([status, count]) => {
                    const s = STATUS[status] || STATUS.pending;
                    return (
                      <div key={status} className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-xl">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                        <span className="text-xs text-gray-600 capitalize flex-1">{status.replace('_', ' ')}</span>
                        <span className="text-xs font-bold text-gray-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKERS TRACKER ── */}
      {tab === 'workers' && (
        <div className="space-y-5">

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Workers', value: users.length,                              color: 'text-teal-600',    bg: 'bg-teal-50/80' },
              { label: 'Active Now',    value: users.filter(u => u.isActive).length,      color: 'text-emerald-600', bg: 'bg-emerald-50/80' },
              { label: 'High Risk',     value: highRiskCount,                             color: 'text-red-600',     bg: 'bg-red-50/80' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`card p-4 text-center ${bg}`}>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search worker by name or city…"
            value={workerSearch}
            onChange={e => setWorkerSearch(e.target.value)}
            className="input-field max-w-sm"
          />

          <div className="space-y-4">
            {Object.entries(byCity)
              .filter(([city]) =>
                !workerSearch ||
                city.toLowerCase().includes(workerSearch.toLowerCase()) ||
                byCity[city].some(w => w.name.toLowerCase().includes(workerSearch.toLowerCase()))
              )
              .map(([city, cityWorkers]) => (
                <div key={city} className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{city}</h3>
                        <p className="text-xs text-gray-400">
                          {cityWorkers.filter(w => w.isActive).length} of {cityWorkers.length} active
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="badge-emerald">{cityWorkers.filter(w => w.isActive).length} Online</span>
                      {cityWorkers.filter(w => !w.isActive).length > 0 && (
                        <span className="badge-slate">{cityWorkers.filter(w => !w.isActive).length} Offline</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {cityWorkers
                      .filter(w => !workerSearch || w.name.toLowerCase().includes(workerSearch.toLowerCase()))
                      .map(worker => {
                        const isSelected = selectedWorker?._id === worker._id;
                        const riskCls = worker.riskScore >= 60
                          ? 'bg-red-100 text-red-700'
                          : worker.riskScore >= 30
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700';
                        return (
                          <div key={worker._id}
                            onClick={() => setSelectedWorker(isSelected ? null : worker)}
                            className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 ${
                              isSelected
                                ? 'border-teal-400 bg-teal-50/80 shadow-md'
                                : 'border-white/60 bg-white/50 hover:bg-white/80 hover:border-teal-200'
                            }`}>
                            <div className="flex items-start gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                                  {worker.name?.[0]?.toUpperCase()}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${worker.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{worker.name}</p>
                                <p className="text-xs text-gray-400 truncate">{worker.email}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${riskCls}`}>
                                    Risk {worker.riskScore}/100
                                  </span>
                                  <span className={worker.isActive ? 'badge-emerald' : 'badge-slate'}>
                                    {worker.isActive ? '● Active' : '○ Offline'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-teal-200/60 space-y-2 fade-in">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {[
                                    { label: 'Earnings',   value: `$${(worker.earnings || 0).toFixed(2)}`,  color: 'text-emerald-600' },
                                    { label: 'Deliveries', value: worker.totalDeliveries || 0,              color: 'text-teal-600' },
                                    { label: 'Plan',       value: worker.subscription?.plan || 'None',      color: 'text-gray-700' },
                                    { label: 'Claims',     value: worker.claimCount || 0,                   color: 'text-gray-700' },
                                  ].map(({ label, value, color }) => (
                                    <div key={label} className="bg-white/70 rounded-lg p-2">
                                      <p className="text-gray-400">{label}</p>
                                      <p className={`font-bold capitalize ${color}`}>{value}</p>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3" />{worker.email}
                                </p>
                                {worker.phone && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                    <Phone className="w-3 h-3" />{worker.phone}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  Joined {new Date(worker.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── CLAIMS MANAGEMENT ── */}
      {tab === 'claims' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'paid', 'auto_approved', 'pending', 'flagged', 'rejected'].map(s => (
              <button key={s} onClick={() => setClaimFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  claimFilter === s
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white/80 border border-emerald-200 text-gray-600 hover:border-teal-300 hover:text-teal-700'
                }`}>
                {s.replace('_', ' ')} ({s === 'all' ? claims.length : claims.filter(c => c.status === s).length})
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{filteredClaims.length} results</span>
          </div>

          <div className="space-y-2">
            {filteredClaims.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No claims found</p>
              </div>
            ) : filteredClaims.map(claim => {
              const s = STATUS[claim.status] || STATUS.pending;
              return (
                <div key={claim._id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl mt-0.5">{CLAIM_ICON[claim.claimType] || '📋'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {claim.claimType?.replace(/_/g, ' ')}
                          </p>
                          <span className={s.badge}>{s.label}</span>
                          {claim.isAutoTriggered === false && <span className="badge-blue">✍ Manual</span>}
                          {claim.fraudFlags?.length > 0 && <span className="badge-red">⚠ {claim.fraudFlags.length} flag</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                              {claim.worker?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            {claim.worker?.name || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{claim.worker?.location?.city}
                          </span>
                          <span>{new Date(claim.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {claim.sensorData && (
                          <div className="flex gap-2 mt-2 flex-wrap text-xs">
                            <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">🌡 {claim.sensorData.temperature}°C</span>
                            <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">🌧 {claim.sensorData.rainfall}mm</span>
                            <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">💨 AQI {claim.sensorData.aqi}</span>
                          </div>
                        )}
                        {claim.fraudFlags?.map((f, i) => (
                          <p key={i} className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{f.description}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-base font-bold text-gray-800">${claim.payoutAmount}</p>
                      {(claim.status === 'flagged' || claim.status === 'pending') && (
                        <div className="flex gap-2">
                          <button onClick={() => updateClaim(claim._id, 'paid')} className="btn-approve">
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => updateClaim(claim._id, 'rejected')} className="btn-danger">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
