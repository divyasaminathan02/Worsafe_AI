import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign, TrendingUp, CheckCircle, Clock, AlertTriangle,
  Package, Calendar, ArrowUpRight, Bike, FileText, Shield
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

const STATUS_STYLE = {
  paid:          { badge: 'badge-emerald', label: 'Paid',         ic: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  auto_approved: { badge: 'badge-teal',    label: 'Auto Approved',ic: 'text-teal-600',    bg: 'bg-teal-50',    icon: CheckCircle },
  pending:       { badge: 'badge-amber',   label: 'Pending',      ic: 'text-amber-500',   bg: 'bg-amber-50',   icon: Clock },
  flagged:       { badge: 'badge-red',     label: 'Flagged',      ic: 'text-red-500',     bg: 'bg-red-50',     icon: AlertTriangle },
  rejected:      { badge: 'badge-slate',   label: 'Rejected',     ic: 'text-gray-400',    bg: 'bg-gray-50',    icon: AlertTriangle },
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === 'Earnings' ? `₹${p.value}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Earnings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    Promise.all([api.get('/workers/profile'), api.get('/workers/stats')])
      .then(([p, s]) => { setProfile(p.data); setStats(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const claims  = profile?.claims || [];
  const weekly  = stats?.weeklyData || [];
  const totalEarnings = profile?.user?.earnings || 0;
  const totalPayout   = claims.filter(c => ['paid','auto_approved'].includes(c.status)).reduce((s,c) => s + c.payoutAmount, 0);
  const deliveries    = profile?.user?.totalDeliveries || 0;

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  const KPI = [
    { label: 'Total Earnings',   value: `₹${totalEarnings.toLocaleString('en-IN')}`, icon: DollarSign,  ic: 'text-emerald-600', bg: 'icon-emerald', sub: 'All time' },
    { label: 'Insurance Payouts',value: `₹${totalPayout.toLocaleString('en-IN')}`,   icon: TrendingUp,  ic: 'text-teal-600',    bg: 'icon-teal',    sub: `${claims.filter(c=>['paid','auto_approved'].includes(c.status)).length} claims paid` },
    { label: 'Total Deliveries', value: deliveries,                                   icon: Bike,        ic: 'text-violet-600',  bg: 'icon-violet',  sub: 'Completed' },
    { label: 'Active Plan',      value: (profile?.subscription?.plan || 'None').charAt(0).toUpperCase() + (profile?.subscription?.plan || 'none').slice(1), icon: Shield, ic: 'text-sky-600', bg: 'icon-sky', sub: profile?.subscription ? `₹${profile.subscription.weeklyPremium}/week` : 'No plan' },
  ];

  const FILTERS = [
    { key: 'all',          label: 'All Claims' },
    { key: 'paid',         label: 'Paid' },
    { key: 'auto_approved',label: 'Auto Approved' },
    { key: 'pending',      label: 'Pending' },
    { key: 'flagged',      label: 'Flagged' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto fade-in">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Earnings & Payouts</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your delivery income and insurance claim history</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI.map(({ label, value, icon: Icon, ic, bg, sub }) => (
          <div key={label} className="card p-4 hover:shadow-md hover:border-teal-100 transition-all">
            <div className={`inline-flex ${bg} mb-3`}><Icon className={`w-4 h-4 ${ic}`} /></div>
            <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly earnings bar */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-1">Weekly Earnings (₹)</h3>
          <p className="text-xs text-gray-400 mb-4">Last 7 days delivery + payout income</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="earnings" name="Earnings" fill="#0d9488" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly deliveries area */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-1">Weekly Deliveries</h3>
          <p className="text-xs text-gray-400 mb-4">Completed deliveries per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="deliveries" name="Deliveries" stroke="#059669" fill="url(#gD)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Claims history */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-700 text-sm">Insurance Claim History</h3>
            <p className="text-xs text-gray-400 mt-0.5">{claims.length} total claims filed</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                  filter === f.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-teal-50 hover:text-teal-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No claims found</p>
            <p className="text-xs text-gray-300 mt-1">Claims are auto-filed when IoT thresholds are crossed</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(claim => {
              const s = STATUS_STYLE[claim.status] || STATUS_STYLE.pending;
              const SIcon = s.icon;
              return (
                <div key={claim._id}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-teal-50/40 rounded-xl transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${s.bg} rounded-xl flex-shrink-0`}>
                      <SIcon className={`w-4 h-4 ${s.ic}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 capitalize group-hover:text-teal-700 transition-colors">
                        {claim.claimType?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {claim.location?.city} · {new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {claim.description && (
                        <p className="text-xs text-gray-400 mt-0.5 max-w-sm truncate">{claim.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-base font-bold text-gray-800">
                      {claim.payoutAmount > 0 ? `₹${claim.payoutAmount.toLocaleString('en-IN')}` : '—'}
                    </p>
                    <span className={`${s.badge} mt-1`}>{s.label}</span>
                    {claim.payoutDate && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Paid {new Date(claim.payoutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription summary */}
      {profile?.subscription && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-teal"><Shield className="w-4 h-4 text-teal-600" /></div>
            <h3 className="font-semibold text-gray-700 text-sm">Current Coverage</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Plan',          value: profile.subscription.plan.charAt(0).toUpperCase() + profile.subscription.plan.slice(1) },
              { label: 'Weekly Premium',value: `₹${profile.subscription.weeklyPremium}` },
              { label: 'Max Payout',    value: `₹${profile.subscription.maxPayout.toLocaleString('en-IN')}` },
              { label: 'Total Paid In', value: `₹${profile.subscription.totalPremiumPaid.toLocaleString('en-IN')}` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                <p className="text-xs text-teal-600 font-medium">{label}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5 capitalize">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Coverage types</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.subscription.coverageTypes.map(t => (
                <span key={t} className="badge-teal capitalize">{t.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
