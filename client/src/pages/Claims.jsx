import { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  FileText, AlertTriangle, CheckCircle, Clock, DollarSign,
  MapPin, Calendar, ChevronDown, ChevronUp, RefreshCw,
  Plus, X, Shield, Send
} from 'lucide-react';

const STATUS_CFG = {
  paid:          { label: 'Approved & Paid', badge: 'badge-emerald', icon: CheckCircle,   ic: 'text-emerald-600', dot: 'bg-emerald-500' },
  auto_approved: { label: 'Auto Approved',   badge: 'badge-teal',    icon: CheckCircle,   ic: 'text-teal-600',    dot: 'bg-teal-500' },
  pending:       { label: 'Pending',         badge: 'badge-amber',   icon: Clock,         ic: 'text-amber-500',   dot: 'bg-amber-400' },
  flagged:       { label: 'Under Review',    badge: 'badge-red',     icon: AlertTriangle, ic: 'text-red-500',     dot: 'bg-red-500' },
  rejected:      { label: 'Rejected',        badge: 'badge-slate',   icon: AlertTriangle, ic: 'text-gray-400',    dot: 'bg-gray-400' },
};

const CLAIM_TYPES = [
  { value: 'heavy_rain',       label: '🌧 Heavy Rain',        desc: 'Rainfall ≥ 10mm/hr' },
  { value: 'flood',            label: '🌊 Flood',             desc: 'Flooded roads / area' },
  { value: 'extreme_heat',     label: '🌡 Extreme Heat',      desc: 'Temperature ≥ 38°C' },
  { value: 'poor_air_quality', label: '💨 Poor Air Quality',  desc: 'AQI ≥ 150' },
  { value: 'storm',            label: '⛈ Storm',             desc: 'Wind ≥ 60km/h' },
  { value: 'combined',         label: '🌪 Combined Event',    desc: 'Multiple thresholds' },
  { value: 'curfew',           label: '🚫 Curfew / Lockdown', desc: 'Government restriction' },
  { value: 'other',            label: '📋 Other',             desc: 'Other disruption reason' },
];

const TYPE_ICON = {
  heavy_rain: '🌧', flood: '🌊', extreme_heat: '🌡',
  poor_air_quality: '💨', storm: '⛈', combined: '🌪',
  curfew: '🚫', other: '📋',
};

const CITIES = ['Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Chennai', 'Coimbatore', 'Madurai'];

const isApproved = c => c.status === 'paid' || c.status === 'auto_approved';

export default function Claims() {
  const [claims, setClaims]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [expanded, setExpanded]     = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg]       = useState(null);
  const [form, setForm] = useState({ claimType: 'heavy_rain', description: '', city: 'Melbourne' });

  const load = () => {
    setLoading(true);
    api.get('/claims/user')
      .then(r => setClaims(Array.isArray(r.data) ? r.data : []))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submitClaim = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return setFormMsg({ type: 'error', text: 'Please describe the disruption.' });
    setSubmitting(true); setFormMsg(null);
    try {
      await api.post('/claims', {
        claimType: form.claimType,
        description: form.description.trim(),
        location: { city: form.city },
      });
      setFormMsg({ type: 'success', text: '✅ Claim submitted! It is now pending admin review.' });
      setForm({ claimType: 'heavy_rain', description: '', city: 'Melbourne' });
      load();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed. Please try again.' });
    } finally { setSubmitting(false); }
  };

  const totalPayout = claims.filter(isApproved).reduce((s, c) => s + (c.payoutAmount || 0), 0);

  // Filter logic — 'approved' tab shows both paid + auto_approved
  const filtered = (() => {
    if (filter === 'all')      return claims;
    if (filter === 'approved') return claims.filter(isApproved);
    return claims.filter(c => c.status === filter);
  })();

  const counts = {
    all:      claims.length,
    pending:  claims.filter(c => c.status === 'pending').length,
    flagged:  claims.filter(c => c.status === 'flagged').length,
    approved: claims.filter(isApproved).length,
    rejected: claims.filter(c => c.status === 'rejected').length,
  };

  const FILTERS = [
    { key: 'all',      label: 'All',          count: counts.all },
    { key: 'pending',  label: '🟡 Pending',   count: counts.pending },
    { key: 'flagged',  label: '🔴 Under Review', count: counts.flagged },
    { key: 'approved', label: '🟢 Approved',  count: counts.approved },
    { key: 'rejected', label: '⚫ Rejected',  count: counts.rejected },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Claims</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {claims.length} total · ₹{totalPayout.toLocaleString('en-IN')} received
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => { setShowForm(true); setFormMsg(null); }} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Raise Claim
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Claims',   value: counts.all,      icon: FileText,    iconBg: 'icon-teal',    ic: 'text-teal-600' },
          { label: 'Approved',       value: counts.approved, icon: CheckCircle, iconBg: 'icon-emerald', ic: 'text-emerald-600' },
          { label: 'Total Payout',   value: `₹${totalPayout.toLocaleString('en-IN')}`, icon: DollarSign, iconBg: 'icon-sky', ic: 'text-sky-600' },
          { label: 'Pending Review', value: counts.pending + counts.flagged, icon: Clock, iconBg: 'icon-amber', ic: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, iconBg, ic }) => (
          <div key={label} className="card p-4">
            <div className={`inline-flex ${iconBg} mb-3`}><Icon className={`w-4 h-4 ${ic}`} /></div>
            <p className="text-xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Raise Claim Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="icon-teal"><Shield className="w-4 h-4 text-teal-600" /></div>
                <div>
                  <h3 className="font-bold text-gray-800">Raise a Claim</h3>
                  <p className="text-xs text-gray-400">Select the disruption reason and describe the event</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={submitClaim} className="p-5 space-y-4">
              {formMsg && (
                <div className={`p-3.5 rounded-xl text-sm border ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>{formMsg.text}</div>
              )}

              {/* Reason */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Disruption Reason
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CLAIM_TYPES.map(ct => (
                    <label key={ct.value}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        form.claimType === ct.value
                          ? 'border-teal-400 bg-teal-50 shadow-sm'
                          : 'border-gray-200 hover:border-teal-200 hover:bg-gray-50'
                      }`}>
                      <input type="radio" name="claimType" value={ct.value}
                        checked={form.claimType === ct.value}
                        onChange={e => setForm({ ...form, claimType: e.target.value })}
                        className="accent-teal-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">{ct.label}</p>
                        <p className="text-[10px] text-gray-400">{ct.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Location (City)
                </label>
                <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  className="input-field">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea rows={3} required
                  placeholder="Describe what happened and how it affected your work..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
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

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === key
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white/80 border border-emerald-200 text-gray-600 hover:border-teal-300 hover:text-teal-700'
            }`}>
            {label} <span className={`ml-1 font-bold ${filter === key ? 'text-white/80' : 'text-gray-400'}`}>({count})</span>
          </button>
        ))}
      </div>

      {/* ── Claims list ── */}
      {filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">
            {claims.length === 0 ? 'No claims yet' : 'No claims match this filter'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {claims.length === 0 ? 'Use "Raise Claim" to submit your first claim' : 'Try a different filter above'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(claim => {
            const cfg = STATUS_CFG[claim.status] || STATUS_CFG.pending;
            const StatusIcon = cfg.icon;
            const isOpen = expanded === claim._id;
            return (
              <div key={claim._id} className="card overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Row */}
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-emerald-50/30 transition-all"
                  onClick={() => setExpanded(isOpen ? null : claim._id)}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Status dot + icon */}
                    <div className="relative flex-shrink-0">
                      <span className="text-2xl">{TYPE_ICON[claim.claimType] || '📋'}</span>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800 capitalize">
                          {claim.claimType?.replace(/_/g, ' ')}
                        </h3>
                        <span className={cfg.badge}>{cfg.label}</span>
                        {claim.isAutoTriggered === false && <span className="badge-blue">✍ Manual</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{claim.location?.city || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">₹{(claim.payoutAmount || 0).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-gray-400">payout</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-emerald-100 bg-emerald-50/20 space-y-3 fade-in">
                    {/* Status banner */}
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                      isApproved(claim) ? 'bg-emerald-50 border-emerald-200' :
                      claim.status === 'rejected' ? 'bg-gray-50 border-gray-200' :
                      claim.status === 'flagged' ? 'bg-red-50 border-red-200' :
                      'bg-amber-50 border-amber-200'
                    }`}>
                      <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.ic}`} />
                      <div>
                        <p className={`text-xs font-semibold ${cfg.ic}`}>{cfg.label}</p>
                        <p className="text-[10px] text-gray-500">
                          {isApproved(claim) ? 'Your claim has been approved' :
                           claim.status === 'rejected' ? 'Your claim was not approved' :
                           claim.status === 'flagged' ? 'Under admin review — may take 24–48 hrs' :
                           'Awaiting admin review'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {claim.description && (
                      <div className="p-3 bg-white/70 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Your Description</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{claim.description}</p>
                      </div>
                    )}

                    {/* Fraud score */}
                    {claim.fraudScore > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 flex-shrink-0">Risk Score</span>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            claim.fraudScore >= 60 ? 'bg-red-500' : claim.fraudScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} style={{ width: `${claim.fraudScore}%` }} />
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${
                          claim.fraudScore >= 60 ? 'text-red-600' : claim.fraudScore >= 30 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>{claim.fraudScore}/100</span>
                      </div>
                    )}

                    {/* Admin note */}
                    {claim.adminNote && (
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1">Admin Note</p>
                        <p className="text-xs text-teal-700">{claim.adminNote}</p>
                      </div>
                    )}

                    {/* Payout date */}
                    {isApproved(claim) && claim.payoutDate && (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Paid on {new Date(claim.payoutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
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
