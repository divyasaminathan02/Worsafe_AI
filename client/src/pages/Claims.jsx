import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText, DollarSign, AlertTriangle, CheckCircle, Clock,
  MapPin, Calendar, ChevronDown, ChevronUp, RefreshCw,
  Plus, X, Shield, Thermometer, Droplets, Wind, Send
} from 'lucide-react';

const statusConfig = {
  paid:          { label: 'Paid',     badge: 'badge-emerald', icon: CheckCircle,   ic: 'text-emerald-600', bg: 'bg-emerald-50' },
  auto_approved: { label: 'Approved', badge: 'badge-teal',    icon: CheckCircle,   ic: 'text-teal-600',    bg: 'bg-teal-50' },
  pending:       { label: 'Pending',  badge: 'badge-amber',   icon: Clock,         ic: 'text-amber-500',   bg: 'bg-amber-50' },
  flagged:       { label: 'Flagged',  badge: 'badge-red',     icon: AlertTriangle, ic: 'text-red-500',     bg: 'bg-red-50' },
  rejected:      { label: 'Rejected', badge: 'badge-slate',   icon: AlertTriangle, ic: 'text-gray-400',    bg: 'bg-gray-50' },
};

const claimTypeIcon = { heavy_rain: '🌧', extreme_heat: '🌡', poor_air_quality: '💨', storm: '⛈', combined: '🌪' };

// Safe & Danger zones across Australia
const ZONES = [
  { name: 'Melbourne CBD',      city: 'Melbourne', status: 'safe',    temp: 22, rain: 1.2,  aqi: 45,  wind: 18, reason: 'Mild conditions, all sensors normal' },
  { name: 'Fitzroy',            city: 'Melbourne', status: 'safe',    temp: 23, rain: 0.8,  aqi: 52,  wind: 14, reason: 'Clear skies, low wind' },
  { name: 'Richmond',           city: 'Melbourne', status: 'warning', temp: 36, rain: 0.2,  aqi: 130, wind: 42, reason: 'Heat building, AQI elevated' },
  { name: 'Dandenong',          city: 'Melbourne', status: 'danger',  temp: 43, rain: 0.0,  aqi: 185, wind: 22, reason: 'Extreme heat + poor air quality' },
  { name: 'Sydney CBD',         city: 'Sydney',    status: 'safe',    temp: 24, rain: 2.1,  aqi: 60,  wind: 20, reason: 'Comfortable conditions' },
  { name: 'Parramatta',         city: 'Sydney',    status: 'warning', temp: 34, rain: 8.5,  aqi: 110, wind: 38, reason: 'Rain approaching threshold' },
  { name: 'Western Sydney',     city: 'Sydney',    status: 'danger',  temp: 41, rain: 28.0, aqi: 155, wind: 65, reason: 'Heavy rain + high wind speed' },
  { name: 'Brisbane CBD',       city: 'Brisbane',  status: 'safe',    temp: 26, rain: 3.0,  aqi: 55,  wind: 22, reason: 'Normal subtropical conditions' },
  { name: 'Ipswich',            city: 'Brisbane',  status: 'danger',  temp: 38, rain: 32.0, aqi: 90,  wind: 72, reason: 'Storm conditions — avoid delivery' },
  { name: 'Perth CBD',          city: 'Perth',     status: 'safe',    temp: 25, rain: 0.5,  aqi: 40,  wind: 16, reason: 'Clear and calm' },
  { name: 'Fremantle',          city: 'Perth',     status: 'warning', temp: 37, rain: 0.0,  aqi: 95,  wind: 55, reason: 'Heat warning, wind picking up' },
  { name: 'Adelaide CBD',       city: 'Adelaide',  status: 'safe',    temp: 21, rain: 1.8,  aqi: 48,  wind: 20, reason: 'Ideal riding conditions' },
  { name: 'Elizabeth',          city: 'Adelaide',  status: 'warning', temp: 35, rain: 0.3,  aqi: 140, wind: 48, reason: 'AQI near threshold, heat rising' },
];

const ZONE_STYLE = {
  safe:    { card: 'zone-safe',    badge: 'badge-safe',    dot: 'bg-green-500',  label: '✅ Safe',    icon: '🟢' },
  warning: { card: 'zone-warning', badge: 'badge-warning', dot: 'bg-orange-500', label: '⚠️ Caution', icon: '🟡' },
  danger:  { card: 'zone-danger',  badge: 'badge-danger',  dot: 'bg-red-500',    label: '🚫 Danger',  icon: '🔴' },
};

const CLAIM_TYPES = [
  { value: 'heavy_rain',       label: '🌧 Heavy Rain',       desc: 'Rainfall ≥ 10mm/hr' },
  { value: 'extreme_heat',     label: '🌡 Extreme Heat',     desc: 'Temperature ≥ 38°C' },
  { value: 'poor_air_quality', label: '💨 Poor Air Quality', desc: 'AQI ≥ 150' },
  { value: 'storm',            label: '⛈ Storm',            desc: 'Wind ≥ 60km/h' },
  { value: 'combined',         label: '🌪 Combined Event',   desc: 'Multiple thresholds' },
];

export default function Claims() {
  const { user } = useAuth();
  const [claims, setClaims]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy]     = useState('date');
  const [showForm, setShowForm] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg]   = useState(null);
  const [form, setForm] = useState({
    claimType: 'heavy_rain',
    description: '',
    temperature: '',
    rainfall: '',
    aqi: '',
    windSpeed: '',
    city: 'Melbourne',
  });

  const load = () => {
    setLoading(true);
    api.get('/claims').then(r => setClaims(r.data))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submitManualClaim = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormMsg(null);
    try {
      await api.post('/claims/manual', {
        claimType: form.claimType,
        description: form.description,
        triggerValues: {
          temperature: +form.temperature || 0,
          rainfall: +form.rainfall || 0,
          aqi: +form.aqi || 0,
          windSpeed: +form.windSpeed || 0,
        },
        location: { city: form.city },
      });
      setFormMsg({ type: 'success', text: '✅ Claim submitted successfully! It is under review.' });
      setForm({ claimType: 'heavy_rain', description: '', temperature: '', rainfall: '', aqi: '', windSpeed: '', city: 'Melbourne' });
      load();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed. Please try again.' });
    } finally { setSubmitting(false); }
  };

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);
  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'amount' ? b.payoutAmount - a.payoutAmount : new Date(b.createdAt) - new Date(a.createdAt)
  );

  const totalPayout = claims.filter(c => c.status === 'paid' || c.status === 'auto_approved')
    .reduce((s, c) => s + c.payoutAmount, 0);
  const approvedCount = claims.filter(c => c.status === 'paid' || c.status === 'auto_approved').length;
  const pendingCount  = claims.filter(c => c.status === 'pending').length;
  const flaggedCount  = claims.filter(c => c.status === 'flagged').length;

  const cities = ['All', ...new Set(ZONES.map(z => z.city))];
  const visibleZones = cityFilter === 'All' ? ZONES : ZONES.filter(z => z.city === cityFilter);
  const safeCount    = ZONES.filter(z => z.status === 'safe').length;
  const warningCount = ZONES.filter(z => z.status === 'warning').length;
  const dangerCount  = ZONES.filter(z => z.status === 'danger').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Claims</h1>
          <p className="text-gray-500 text-sm mt-0.5">{claims.length} claims · ${totalPayout.toFixed(2)} total received</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> File Manual Claim
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims',  value: claims.length,               icon: FileText,    iconBg: 'icon-teal',    iconColor: 'text-teal-600' },
          { label: 'Approved',      value: approvedCount,               icon: CheckCircle, iconBg: 'icon-emerald', iconColor: 'text-emerald-600' },
          { label: 'Total Payout',  value: `$${totalPayout.toFixed(2)}`,icon: DollarSign,  iconBg: 'icon-sky',     iconColor: 'text-sky-600' },
          { label: 'Needs Review',  value: pendingCount + flaggedCount, icon: Clock,       iconBg: 'icon-amber',   iconColor: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="card p-4">
            <div className={`inline-flex ${iconBg} mb-3`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
            <p className="text-xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── SAFE / DANGER ZONES ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-700">Delivery Zone Safety Map</h3>
            <p className="text-xs text-gray-400 mt-0.5">Real-time risk assessment across Australian cities</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" />{safeCount} Safe</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full" />{warningCount} Caution</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full" />{dangerCount} Danger</span>
          </div>
        </div>

        {/* City filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {cities.map(c => (
            <button key={c} onClick={() => setCityFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                cityFilter === c ? 'bg-teal-600 text-white shadow-sm' : 'bg-white/80 border border-emerald-200 text-gray-600 hover:border-teal-300'
              }`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleZones.map(zone => {
            const zs = ZONE_STYLE[zone.status];
            return (
              <div key={zone.name} className={`${zs.card} p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 ${zs.dot} rounded-full pulse-dot`} />
                      <p className="text-sm font-semibold text-gray-800">{zone.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{zone.city}
                    </p>
                  </div>
                  <span className={zs.badge}>{zs.label}</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{zone.reason}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { icon: '🌡', val: `${zone.temp}°C`, over: zone.temp >= 38 },
                    { icon: '🌧', val: `${zone.rain}mm`, over: zone.rain >= 10 },
                    { icon: '💨', val: `${zone.aqi}`, over: zone.aqi >= 150 },
                    { icon: '🌬', val: `${zone.wind}km/h`, over: zone.wind >= 60 },
                  ].map(({ icon, val, over }) => (
                    <div key={icon} className={`text-center p-1.5 rounded-lg ${over ? 'bg-red-100' : 'bg-white/60'}`}>
                      <p className="text-sm">{icon}</p>
                      <p className={`text-[10px] font-semibold ${over ? 'text-red-600' : 'text-gray-600'}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MANUAL CLAIM MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="icon-teal"><Shield className="w-4 h-4 text-teal-600" /></div>
                <div>
                  <h3 className="font-bold text-gray-800">File Manual Claim</h3>
                  <p className="text-xs text-gray-400">Submit a claim for a weather disruption event</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setFormMsg(null); }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={submitManualClaim} className="p-5 space-y-4">
              {formMsg && (
                <div className={`p-3.5 rounded-xl text-sm border ${
                  formMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>{formMsg.text}</div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Claim Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {CLAIM_TYPES.map(ct => (
                    <label key={ct.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        form.claimType === ct.value ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                      }`}>
                      <input type="radio" name="claimType" value={ct.value}
                        checked={form.claimType === ct.value}
                        onChange={e => setForm({ ...form, claimType: e.target.value })}
                        className="accent-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{ct.label}</p>
                        <p className="text-xs text-gray-400">{ct.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">City</label>
                  <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input-field">
                    {['Melbourne','Sydney','Brisbane','Perth','Adelaide'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Temperature (°C)</label>
                  <input type="number" step="0.1" placeholder="e.g. 42.5" value={form.temperature}
                    onChange={e => setForm({ ...form, temperature: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Rainfall (mm/hr)</label>
                  <input type="number" step="0.1" placeholder="e.g. 28.0" value={form.rainfall}
                    onChange={e => setForm({ ...form, rainfall: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">AQI</label>
                  <input type="number" placeholder="e.g. 175" value={form.aqi}
                    onChange={e => setForm({ ...form, aqi: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Wind Speed (km/h)</label>
                  <input type="number" step="0.1" placeholder="e.g. 65" value={form.windSpeed}
                    onChange={e => setForm({ ...form, windSpeed: e.target.value })} className="input-field" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea rows={3} required placeholder="Describe the weather event and how it affected your delivery..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setFormMsg(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                    : <><Send className="w-4 h-4" /> Submit Claim</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['all', 'paid', 'auto_approved', 'pending', 'flagged', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                filter === s ? 'bg-teal-600 text-white shadow-sm' : 'bg-white/80 border border-emerald-200 text-gray-600 hover:border-teal-300 hover:text-teal-700'
              }`}>
              {s.replace('_', ' ')} ({s === 'all' ? claims.length : claims.filter(c => c.status === s).length})
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white/80 focus:outline-none focus:border-teal-400">
          <option value="date">Sort by Date</option>
          <option value="amount">Sort by Amount</option>
        </select>
      </div>

      {/* Claims list */}
      {sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No claims found</p>
          <p className="text-gray-400 text-xs mt-1">File a manual claim or wait for auto-trigger</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(claim => {
            const cfg = statusConfig[claim.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const isOpen = expanded === claim._id;
            return (
              <div key={claim._id} className="card overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 text-left hover:bg-emerald-50/30 transition-all"
                  onClick={() => setExpanded(isOpen ? null : claim._id)}>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{claimTypeIcon[claim.claimType] || '📋'}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-gray-700 capitalize">
                          {claim.claimType?.replace(/_/g, ' ')}
                        </h3>
                        <span className={cfg.badge}>{cfg.label}</span>
                        {claim.isAutoTriggered && <span className="badge-teal">⚡ Auto</span>}
                        {!claim.isAutoTriggered && <span className="badge-blue">✍ Manual</span>}
                        {claim.fraudFlags?.length > 0 && <span className="badge-red">⚠ Flagged</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{claim.location?.city}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                          {new Date(claim.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-800">${claim.payoutAmount}</p>
                      <p className="text-xs text-gray-400">payout</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-emerald-100 pt-3 bg-emerald-50/20">
                    {claim.description && <p className="text-sm text-gray-600 mb-3">{claim.description}</p>}
                    {claim.triggerValues && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                          { label: 'Temperature', value: `${claim.triggerValues.temperature}°C`, color: 'text-orange-600', bg: 'bg-orange-50', over: claim.triggerValues.temperature >= 38 },
                          { label: 'Rainfall',    value: `${claim.triggerValues.rainfall}mm`,    color: 'text-teal-600',   bg: 'bg-teal-50',   over: claim.triggerValues.rainfall >= 10 },
                          { label: 'AQI',         value: claim.triggerValues.aqi,                color: 'text-violet-600', bg: 'bg-violet-50', over: claim.triggerValues.aqi >= 150 },
                          { label: 'Wind',        value: `${claim.triggerValues.windSpeed}km/h`, color: 'text-sky-600',    bg: 'bg-sky-50',    over: claim.triggerValues.windSpeed >= 60 },
                        ].map(({ label, value, color, bg, over }) => (
                          <div key={label} className={`${over ? 'bg-red-50 border border-red-200' : bg} rounded-xl p-3 text-center`}>
                            <p className={`text-sm font-bold ${over ? 'text-red-600' : color}`}>{value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            {over && <p className="text-[10px] text-red-500 font-semibold">⚠ Exceeded</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {claim.fraudFlags?.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-2">
                        <p className="text-xs font-medium text-red-700 mb-1">⚠ Fraud Detection Flags</p>
                        {claim.fraudFlags.map((f, i) => (
                          <p key={i} className="text-xs text-red-600">• {f.description}</p>
                        ))}
                      </div>
                    )}
                    {claim.payoutDate && (
                      <p className="text-xs text-emerald-600 font-medium">
                        ✅ Paid on {new Date(claim.payoutDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
