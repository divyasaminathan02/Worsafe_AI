import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Shield, Check, Zap, Star, CreditCard, Calendar, TrendingUp, AlertCircle, Info } from 'lucide-react';

const PLANS = {
  basic: {
    icon: Shield, color: 'teal',
    price: 5, maxPayout: 100,
    coverageTypes: ['heavy_rain'],
    features: [
      { text: 'Heavy Rain Coverage', included: true },
      { text: 'Extreme Heat Coverage', included: false },
      { text: 'Air Quality Coverage', included: false },
      { text: 'Storm Coverage', included: false },
      { text: 'Auto-claim filing', included: true },
      { text: 'Instant payout', included: true },
      { text: 'Priority support', included: false },
    ],
    description: 'Essential cover for rain disruptions',
    badge: null,
  },
  standard: {
    icon: Zap, color: 'emerald',
    price: 12, maxPayout: 250,
    coverageTypes: ['heavy_rain', 'extreme_heat', 'poor_air_quality'],
    features: [
      { text: 'Heavy Rain Coverage', included: true },
      { text: 'Extreme Heat Coverage', included: true },
      { text: 'Air Quality Coverage', included: true },
      { text: 'Storm Coverage', included: false },
      { text: 'Auto-claim filing', included: true },
      { text: 'Instant payout', included: true },
      { text: 'Priority support', included: true },
    ],
    description: 'Best value for most gig workers',
    badge: 'Most Popular',
  },
  premium: {
    icon: Star, color: 'amber',
    price: 20, maxPayout: 500,
    coverageTypes: ['heavy_rain', 'extreme_heat', 'poor_air_quality', 'storm', 'combined'],
    features: [
      { text: 'Heavy Rain Coverage', included: true },
      { text: 'Extreme Heat Coverage', included: true },
      { text: 'Air Quality Coverage', included: true },
      { text: 'Storm Coverage', included: true },
      { text: 'Auto-claim filing', included: true },
      { text: 'Instant payout', included: true },
      { text: 'Priority support', included: true },
    ],
    description: 'Full protection for all conditions',
    badge: 'Best Cover',
  },
};

const colorMap = {
  teal:   { ring: 'ring-teal-400',    btn: 'bg-teal-600 hover:bg-teal-700',     badge: 'bg-teal-100 text-teal-700 border border-teal-200',     icon: 'bg-teal-50 text-teal-600' },
  emerald:{ ring: 'ring-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: 'bg-emerald-50 text-emerald-600' },
  amber:  { ring: 'ring-amber-400',   btn: 'bg-amber-500 hover:bg-amber-600',   badge: 'bg-amber-100 text-amber-700 border border-amber-200',   icon: 'bg-amber-50 text-amber-600' },
};

const HOW_IT_WORKS = [
  { step: '01', icon: CreditCard, title: 'Choose a Plan', desc: 'Pick weekly coverage that fits your work style and risk exposure.' },
  { step: '02', icon: Shield,     title: 'IoT Monitors',  desc: 'Our sensor network tracks temperature, rain, AQI, and wind 24/7.' },
  { step: '03', icon: AlertCircle,title: 'AI Detects',    desc: 'Risk engine flags disruptions the moment thresholds are crossed.' },
  { step: '04', icon: TrendingUp, title: 'Instant Payout',desc: 'Claim auto-filed and payout deposited — no forms, no waiting.' },
];

const FAQS = [
  { q: 'How quickly are claims paid?', a: 'Payouts are processed instantly — typically within seconds of a threshold being crossed.' },
  { q: 'Can I change my plan mid-week?', a: 'Yes. Upgrading takes effect immediately. Downgrading applies from the next billing cycle.' },
  { q: 'What counts as "heavy rain"?', a: 'Rainfall ≥ 10mm/hr triggers a claim. Critical events (≥ 25mm/hr) may qualify for higher payouts.' },
  { q: 'Is there a claim limit per week?', a: 'Standard and Premium plans allow up to 3 claims per week. Basic allows 1.' },
];

export default function Subscription() {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState('');
  const [message, setMessage] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    api.get('/subscriptions/my').then(r => setCurrent(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const subscribe = async (plan) => {
    setSubscribing(plan); setMessage(null);
    try {
      const { data } = await api.post('/subscriptions/subscribe', { plan });
      setCurrent(data);
      setMessage({ type: 'success', text: `✅ Subscribed to ${plan.charAt(0).toUpperCase()+plan.slice(1)} plan! You're now covered.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Subscription failed. Please try again.' });
    } finally { setSubscribing(''); }
  };

  const cancel = async () => {
    if (!confirm('Cancel your current subscription?')) return;
    await api.delete('/subscriptions/cancel').catch(() => {});
    setCurrent(null);
    setMessage({ type: 'info', text: 'Subscription cancelled. You can re-subscribe anytime.' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto fade-in">

      <div>
        <h1 className="text-xl font-bold text-gray-800">Insurance Plans</h1>
        <p className="text-gray-500 text-sm mt-0.5">Weekly parametric coverage — pay as you work, protected as you go</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
          message.type === 'error'   ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {message.text}
        </div>
      )}

      {/* Current plan banner */}
      {current && (
        <div className="card p-5 border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-teal-50 rounded-xl">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Active Plan</p>
                <h3 className="text-lg font-bold text-slate-800 capitalize mt-0.5">{current.plan} Plan</h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Expires {new Date(current.endDate).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' })}</span>
                  <span>Premium paid: ${current.totalPremiumPaid}</span>
                  <span>Claims paid: ${current.totalClaimsPaid}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge-teal">Active</span>
              <button onClick={cancel} className="text-xs text-red-500 hover:text-red-700 hover:underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Object.entries(PLANS).map(([planKey, plan]) => {
          const Icon = plan.icon;
          const c = colorMap[plan.color];
          const isActive = current?.plan === planKey;
          return (
            <div key={planKey}
              className={`card p-6 relative flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 ${isActive ? `ring-2 ${c.ring} ring-offset-2` : ''}`}>
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold ${c.badge}`}>
                  {plan.badge}
                </div>
              )}

              <div className={`inline-flex p-2.5 ${c.icon.split(' ')[0]} rounded-xl mb-4 w-fit`}>
                <Icon className={`w-5 h-5 ${c.icon.split(' ')[1]}`} />
              </div>

              <h3 className="text-lg font-bold text-slate-800 capitalize">{planKey}</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">{plan.description}</p>

              <div className="mb-5">
                <span className="text-3xl font-bold text-slate-800">${plan.price}</span>
                <span className="text-slate-400 text-sm">/week</span>
                <p className="text-xs text-slate-500 mt-1">Up to <span className="font-semibold text-slate-700">${plan.maxPayout}</span> per claim</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f.text} className={`flex items-center gap-2 text-xs ${f.included ? 'text-slate-700' : 'text-slate-300'}`}>
                    <Check className={`w-3.5 h-3.5 flex-shrink-0 ${f.included ? 'text-emerald-500' : 'text-slate-200'}`} />
                    {f.text}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe(planKey)}
                disabled={!!subscribing || isActive}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : `${c.btn} text-white disabled:opacity-50`
                }`}>
                {subscribing === planKey ? 'Processing...' : isActive ? '✓ Current Plan' : `Get ${planKey.charAt(0).toUpperCase()+planKey.slice(1)}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-700 mb-5">How Parametric Insurance Works</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="relative inline-flex mb-3">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{step.slice(1)}</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">{title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk thresholds */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Claim Trigger Thresholds</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Temperature', high: '≥ 38°C', critical: '≥ 42°C', color: 'orange', icon: '🌡' },
            { label: 'Rainfall',    high: '≥ 10mm/hr', critical: '≥ 25mm/hr', color: 'blue', icon: '🌧' },
            { label: 'Air Quality', high: '≥ 150 AQI', critical: '≥ 200 AQI', color: 'purple', icon: '💨' },
            { label: 'Wind Speed',  high: '≥ 60km/h', critical: '≥ 90km/h', color: 'cyan', icon: '🌪' },
          ].map(({ label, high, critical, icon }) => (
            <div key={label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-lg mb-2">{icon}</p>
              <p className="text-xs font-semibold text-slate-700 mb-2">{label}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">High</span>
                  <span className="badge-amber">{high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Critical</span>
                  <span className="badge-red">{critical}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-all">
                <span className="text-sm font-medium text-slate-700">{faq.q}</span>
                <span className="text-slate-400 text-lg">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
