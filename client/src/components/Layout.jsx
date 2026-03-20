import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Shield, LayoutDashboard, TrendingUp, Activity,
  CreditCard, Settings, LogOut, Bell, X, Wifi, ShieldAlert, FileText
} from 'lucide-react';
import { useState } from 'react';

const workerNav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sensors',      icon: Activity,        label: 'Live Sensors' },
  { to: '/claims',       icon: FileText,        label: 'My Claims' },
  { to: '/earnings',     icon: TrendingUp,      label: 'Earnings' },
  { to: '/subscription', icon: CreditCard,      label: 'Insurance' },
  { to: '/fraud-defense',icon: ShieldAlert,     label: 'Defense Shield' },
];
const adminNav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sensors',      icon: Activity,        label: 'Live Sensors' },
  { to: '/earnings',     icon: TrendingUp,      label: 'Earnings' },
  { to: '/subscription', icon: CreditCard,      label: 'Insurance' },
  { to: '/fraud-defense',icon: ShieldAlert,     label: 'Defense Shield' },
  { to: '/admin',        icon: Settings,        label: 'Admin Panel' },
];

export default function Layout() {
  const { user, logout }  = useAuth();
  const { notifications, clearNotification, latestSensor } = useSocket();
  const navigate          = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = notifications.length;
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNav : workerNav;

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfdf5 30%,#f0fdfa 60%,#e8faf5 100%)' }}>

      {/* ── Sidebar ── */}
      <aside className="w-60 sidebar-bg flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center ring-1 ring-white/25 flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">WorkSafe AI</p>
              <p className="text-teal-300 text-[10px] font-medium tracking-widest uppercase">Parametric Insurance</p>
            </div>
          </div>
        </div>

        {/* IoT live pill */}
        <div className="mx-4 mt-4 mb-3 px-3 py-2 bg-white/10 rounded-xl flex items-center gap-2 border border-white/10">
          <span className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot flex-shrink-0" />
          <span className="text-teal-100 text-xs font-medium flex-1">IoT Network Live</span>
          <Wifi className="w-3.5 h-3.5 text-teal-300/70" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/18 text-white font-semibold shadow-sm'
                    : 'text-teal-100/65 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-300' : 'text-teal-300/50 group-hover:text-teal-200'}`} />
                  <span className="text-sm flex-1">{label}</span>
                  {isActive && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ring-2 ring-white/20">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
                <p className="text-teal-300 text-[10px] capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="topbar-bg px-6 py-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot" />
            <span className="text-xs text-gray-500 font-medium">
              {latestSensor
                ? `Live · ${new Date(latestSensor.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Awaiting sensor data'}
            </span>
            {latestSensor?.anomalyDetected && (
              <span className="badge-red animate-pulse text-xs">🚨 Disruption Active</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-xl hover:bg-emerald-50 transition-all">
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-emerald-100 shadow-2xl z-50 overflow-hidden fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-gray-700 text-sm">Alerts {unread > 0 && <span className="ml-1 text-xs text-red-500">({unread})</span>}</span>
                    <button onClick={() => setShowNotifs(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-all">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Shield className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">All clear!</p>
                        <p className="text-gray-400 text-xs mt-0.5">No active alerts</p>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${
                        n.type === 'critical' ? 'bg-red-50' : n.type === 'high' ? 'bg-amber-50' : 'bg-teal-50/50'
                      }`}>
                        <span className="text-base mt-0.5 flex-shrink-0">
                          {n.type === 'critical' ? '🚨' : n.type === 'high' ? '⚠️' : '📡'}
                        </span>
                        <p className="text-xs text-gray-600 flex-1 leading-relaxed">{n.message}</p>
                        <button onClick={() => clearNotification(n.id)} className="text-gray-300 hover:text-gray-500 mt-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-teal-100">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
