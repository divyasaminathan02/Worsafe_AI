import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, Zap, TrendingUp, Users, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon: Zap,        text: 'Instant auto-payouts when thresholds are crossed' },
  { icon: Shield,     text: 'AI-powered fraud detection & risk scoring' },
  { icon: TrendingUp, text: 'Real-time IoT sensor monitoring across your city' },
  { icon: Users,      text: '2,400+ gig workers protected Australia-wide' },
];

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      return setError('Email and password are required');
    }
    setLoading(true); setError('');
    try {
      const u = await login(form.email.trim(), form.password);
      navigate(u.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      // Show the actual server message — api.js enriches network errors
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left hero panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f766e 0%, #065f46 60%, #064e3b 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 bg-emerald-400/10 rounded-full" />
        <div className="absolute top-1/2 right-8 w-40 h-40 bg-teal-300/10 rounded-full" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center ring-1 ring-white/25">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">WorkSafe AI</span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-400/20 border border-emerald-400/30 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" />
            <span className="text-emerald-200 text-xs font-medium">IoT Network Active — 5 Devices Online</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Parametric Insurance<br />
            <span className="text-emerald-300">for the Gig Economy</span>
          </h1>
          <p className="text-teal-100 text-base leading-relaxed mb-10 max-w-sm">
            IoT sensors detect disruptions in real time. When thresholds are crossed, claims are filed and payouts sent — automatically.
          </p>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span className="text-teal-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-teal-300/60 text-xs">© 2024 WorkSafe AI · Powered by IoT + AI</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-[400px] slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800">WorkSafe AI</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your insurance dashboard</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <span className="text-base flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-10" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-10 pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-xl transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 text-sm mt-1">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span>
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 font-semibold">Create one free</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Demo Access</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '👷 Worker', email: 'worker@demo.com', pass: 'demo123', color: 'hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700' },
                { label: '🛡 Admin',  email: 'admin@demo.com',  pass: 'admin123', color: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700' },
              ].map(({ label, email, pass, color }) => (
                <button key={label}
                  onClick={() => setForm({ email, password: pass })}
                  className={`py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-medium transition-all ${color}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2.5 text-center">Click a role to fill credentials, then Sign In</p>
          </div>
        </div>
      </div>
    </div>
  );
}
