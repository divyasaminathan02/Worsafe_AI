import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import {
  TrendingUp, Shield, AlertTriangle, DollarSign, Activity,
  FileText, MapPin, Clock, CheckCircle, ArrowUpRight, Bike, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts';

const RISK_STYLE = {
  low:      { badge: 'badge-emerald', dot: 'bg-emerald-500', label: 'Low Risk' },
  medium:   { badge: 'badge-amber',   dot: 'bg-amber-500',   label: 'Medium Risk' },
  high:     { badge: 'badge-red',     dot: 'bg-red-500',     label: 'High Risk' },
  critical: { badge: 'badge-red',     dot: 'bg-red-600',     label: 'Critical Risk' },
};

const STATUS_STYLE = {
  paid:          { badge: 'badge-emerald', icon: CheckCircle,   ic: 'text-emerald-600', bg: 'bg-emerald-50' },
  auto_approved: { badge: 'badge-teal',    icon: CheckCircle,   ic: 'text-teal-600',    bg: 'bg-teal-50' },
  pending:       { badge: 'badge-amber',   icon: Clock,         ic: 'text-amber-500',   bg: 'bg-amber-50' },
  flagged:       { badge: 'badge-red',     icon: AlertTriangle, ic: 'text-red-500',     bg: 'bg-red-50' },
  rejected:      { badge: 'badge-slate',   icon: AlertTriangle, ic: 'text-gray-400',    bg: 'bg-gray-50' },
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === 'earnings' ? `₹${p.value}` : p.value}
        </p>
      ))}
    </div>
  );
};

function SensorGauge({ value, max, color, label, unit, threshold }) {
  const pct    = Math.min(value / max, 1);
  const r      = 28, circ = 2 * Math.PI * r, dash = circ * 0.75;
  const offset = dash - pct * dash;
  const over   = value >= threshold;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-[135deg]">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={over ? '#ef4444' : color}
            strokeWidth="6" strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset} strokeLinecap="round" className="gauge-ring" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${over ? 'text-red-600' : 'text-gray-700'}`}>{value}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-1 text-center leading-tight">{label}<br /><span className="text-gray-400">{unit}</span></p>
      {over && <span className="text-[9px] text-red-500 font-semibold mt-0.5">⚠ HIGH</span>}
    </div>
  );
}

export default function Dashboard() {
  const { user }         = useAuth();
  const { latestSensor } = useSocket();
  const [profile, setProfile]       = useState(null);
  const [stats, setStats]           = useState(null);
  const [sensorHist, setSensorHist] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [chartKey, setChartKey]     = useState('earnings');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = () => {
    setLastRefresh(new Date());
    Promise.all([
      api.get('/workers/profile'),
      api.get('/workers/stats'),
      api.get('/sensors/history?hours=6'),
    ]).then(([p, s, h]) => {
      setProfile(p.data);
      setStats(s.data);
      if (h.data.length > 3) {
        setSensorHist(h.data.slice(-24).map(d => ({
          time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: d.temperature, rain: d.rainfall, aqi: d.aqi,
        })));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const riskLevel  = latestSensor?.riskLevel || 'low';
  const riskStyle  = RISK_STYLE[riskLevel] || RISK_STYLE.low;
  const claims     = profile?.claims || [];
  const totalPayout = claims.filter(c => c.status === 'paid' || c.status === 'auto_approved')
    .reduce((s, c) => s + c.payoutAmount, 0);
  const earnings   = profile?.user?.earnings || 0;
  const riskScore  = profile?.user?.riskScore || 0;
  const weeklyData = stats?.weeklyData || Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
    earnings: 0, deliveries: 0, claims: 0,
  }));

  const KPI = [
    { label: 'Total Earnings',  value: `₹${earnings.toLocaleString('en-IN')}`,                              sub: 'All time',          up: true, icon: DollarSign,    iconCls: 'icon-emerald', ic: 'text-emerald-600' },
    { label: 'Claims Filed',    value: stats?.totalClaims ?? claims.length,                                  sub: `${stats?.approvedClaims ?? 0} approved`,         icon: FileText,      iconCls: 'icon-teal',    ic: 'text-teal-600' },
    { label: 'Total Payout',    value: `₹${(stats?.totalPayout ?? totalPayout).toLocaleString('en-IN')}`,   sub: 'Instant payouts',   up: true, icon: TrendingUp,    iconCls: 'icon-sky',     ic: 'text-sky-600' },
    { label: 'Risk Score',      value: `${riskScore}/100`,                                                   sub: riskScore < 40 ? 'Low risk zone' : 'Moderate risk', icon: AlertTriangle, iconCls: 'icon-amber',   ic: 'text-amber-600' },
    { label: 'Deliveries',      value: profile?.user?.totalDeliveries || 0,                                  sub: 'Total completed',   icon: Bike,          iconCls: 'icon-violet',  ic: 'text-violet-600' },
    { label: 'Insurance Plan',  value: (profile?.subscription?.plan || 'None').charAt(0).toUpperCase() + (profile?.subscription?.plan || 'none').slice(1), sub: profile?.subscription ? 'Active' : 'No plan', icon: Shield, iconCls: 'icon-teal', ic: 'text-teal-600' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5 max-w-7xl mx-auto fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-500" />
            {profile?.user?.location?.city || 'Chennai'} ·{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
          <span className={riskStyle.badge}>
            <span className={`w-1.5 h-1.5 ${riskStyle.dot} rounded-full mr-1.5 pulse-dot`} />
            {riskStyle.label}
          </span>
          {latestSensor?.anomalyDetected && (
            <span className="badge-red animate-pulse">🚨 Anomaly Active</span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPI.map(({ label, value, sub, up, icon: Icon, iconCls, ic }) => (
          <div key={label} className="card p-4 hover:shadow-md hover:border-teal-100 transition-all duration-200">
            <div className={`inline-flex ${iconCls} mb-3`}>
              <Icon className={`w-4 h-4 ${ic}`} />
            </div>
            <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            {sub && (
              <p className={`text-xs mt-1 flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-gray-400'}`}>
                {up && <ArrowUpRight className="w-3 h-3" />}{sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-700 text-sm">Weekly Performance</h3>
              <p className="text-xs text-gray-400 mt-0.5">Live data from your account</p>
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[{ k: 'earnings', label: 'Earnings' }, { k: 'deliveries', label: 'Deliveries' }, { k: 'claims', label: 'Claims' }].map(({ k, label }) => (
                <button key={k} onClick={() => setChartKey(k)}
                  className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-all ${chartKey === k ? 'bg-white text-teal-700 font-semibold shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey={chartKey}
                fill={chartKey === 'earnings' ? '#0d9488' : chartKey === 'deliveries' ? '#059669' : '#f59e0b'}
                radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live sensor gauges */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Live Conditions</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full pulse-dot" />Live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <SensorGauge value={+(latestSensor?.temperature ?? 32.5).toFixed(1)} max={50}  color="#0d9488" label="Temperature" unit="°C"    threshold={38} />
            <SensorGauge value={+(latestSensor?.rainfall    ?? 2.1).toFixed(1)}  max={50}  color="#0284c7" label="Rainfall"    unit="mm/hr" threshold={10} />
            <SensorGauge value={+(latestSensor?.aqi         ?? 85).toFixed(0)}   max={300} color="#7c3aed" label="Air Quality" unit="AQI"   threshold={150} />
            <SensorGauge value={+(latestSensor?.windSpeed   ?? 14).toFixed(1)}   max={120} color="#0891b2" label="Wind Speed"  unit="km/h"  threshold={60} />
          </div>
          <div className={`p-3 rounded-xl text-center text-xs font-semibold border ${
            latestSensor?.anomalyDetected
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {latestSensor?.anomalyDetected ? '🚨 Disruption Detected — Claim Filed' : '✅ All Conditions Normal'}
          </div>
        </div>
      </div>

      {/* Sensor trend + Insurance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Sensor Trends (6h)</h3>
            <span className="text-xs text-gray-400">{sensorHist.length} readings from DB</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={sensorHist}>
              <defs>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              <Area type="monotone" dataKey="temp" stroke="#0d9488" fill="url(#gT)" strokeWidth={2} dot={false} name="Temp °C" />
              <Area type="monotone" dataKey="rain" stroke="#0284c7" fill="url(#gR)" strokeWidth={2} dot={false} name="Rain mm" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Insurance card */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-teal"><Shield className="w-4 h-4 text-teal-600" /></div>
            <h3 className="font-semibold text-gray-700 text-sm">Insurance Status</h3>
          </div>
          {profile?.subscription ? (
            <>
              <div className="p-4 rounded-xl mb-4"
                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #065f46 100%)' }}>
                <p className="text-teal-200 text-[10px] font-semibold uppercase tracking-widest mb-1">Active Plan</p>
                <p className="text-white text-xl font-bold capitalize">{profile.subscription.plan}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-teal-200 text-xs">Max payout</span>
                  <span className="text-white font-bold text-sm">₹{profile.subscription.maxPayout.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 h-1.5 bg-white/20 rounded-full">
                  <div className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min((profile.subscription.totalClaimsPaid / profile.subscription.maxPayout) * 100, 100)}%` }} />
                </div>
                <p className="text-teal-300 text-[10px] mt-1">
                  ₹{profile.subscription.totalClaimsPaid.toLocaleString('en-IN')} of ₹{profile.subscription.maxPayout.toLocaleString('en-IN')} used
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Weekly Premium', value: `₹${profile.subscription.weeklyPremium}` },
                  { label: 'Expires', value: new Date(profile.subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                  { label: 'Total Paid In', value: `₹${profile.subscription.totalPremiumPaid.toLocaleString('en-IN')}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Coverage</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.subscription.coverageTypes.map(t => (
                      <span key={t} className="badge-teal capitalize">{t.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No active plan</p>
              <a href="/subscription" className="btn-primary mt-3 text-xs">Get Covered</a>
            </div>
          )}
        </div>
      </div>

      {/* Recent claims */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 text-sm">Recent Claims</h3>
          <a href="/earnings" className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        {claims.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No claims yet — you're all clear!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {claims.slice(0, 6).map(claim => {
              const s = STATUS_STYLE[claim.status] || STATUS_STYLE.pending;
              const SIcon = s.icon;
              return (
                <div key={claim._id}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-teal-50/50 rounded-xl transition-all duration-150 group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${s.bg} rounded-xl`}>
                      <SIcon className={`w-4 h-4 ${s.ic}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 capitalize group-hover:text-teal-700 transition-colors">
                        {claim.claimType?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">₹{claim.payoutAmount.toLocaleString('en-IN')}</p>
                    <span className={s.badge}>{claim.status?.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
