import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Lock, Phone, MapPin } from 'lucide-react';

const CITIES = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi', 'Thanjavur'];

export default function Register() {
  const [form, setForm]   = useState({ name: '', email: '', password: '', phone: '', city: 'Chennai' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true); setError('');
    try {
      await register({ ...form, location: { city: form.city } });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const fields = [
    { key: 'name',     label: 'Full Name',  type: 'text',     icon: User,   placeholder: 'Arjun Murugan',      span: 2 },
    { key: 'email',    label: 'Email',      type: 'email',    icon: Mail,   placeholder: 'arjun@example.com',  span: 2 },
    { key: 'phone',    label: 'Phone',      type: 'tel',      icon: Phone,  placeholder: '+91 90000 00000',    span: 1 },
    { key: 'password', label: 'Password',   type: 'password', icon: Lock,   placeholder: 'Min. 6 characters',  span: 1 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 50%, #f0fdf4 100%)' }}>

      <div className="w-full max-w-md slide-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 leading-tight">WorkSafe AI</p>
            <p className="text-teal-600 text-xs">Parametric Insurance — Tamil Nadu</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm mb-7">Get covered in under 2 minutes — no paperwork</p>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ key, label, type, icon: Icon, placeholder, span }) => (
                <div key={key} className={span === 2 ? 'col-span-2' : 'col-span-1'}>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={type} required={key !== 'phone'} value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="input-field pl-10" placeholder={placeholder} />
                  </div>
                </div>
              ))}

              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">City (Tamil Nadu)</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    className="input-field pl-10 appearance-none">
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</span>
                : "Create Account — It's Free"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
