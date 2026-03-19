import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { Activity, Thermometer, Droplets, Wind, AlertTriangle, Cpu, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend
} from 'recharts';

// Rich mock sensor history
const genMockHistory = () => Array.from({ length: 30 }, (_, i) => ({
  time: `${String(6 + Math.floor(i * 0.6)).padStart(2,'0')}:${String((i * 18) % 60).padStart(2,'0')}`,
  temp: +(20 + Math.sin(i * 0.35) * 10 + Math.random() * 4).toFixed(1),
  rain: +(Math.max(0, Math.sin(i * 0.5 - 1) * 15 + Math.random() * 5)).toFixed(1),
  aqi:  +(55 + Math.cos(i * 0.28) * 35 + Math.random() * 12).toFixed(0),
  wind: +(20 + Math.sin(i * 0.45) * 18 + Math.random() * 6).toFixed(1),
}));

const DEVICES = [
  { id: 'DEV-CHN-001', city: 'Chennai CBD',       lat: 13.0827, lng: 80.2707, status: 'online' },
  { id: 'DEV-CHN-002', city: 'Tambaram',           lat: 12.9249, lng: 80.1000, status: 'online' },
  { id: 'DEV-CBE-001', city: 'Coimbatore',         lat: 11.0168, lng: 76.9558, status: 'online' },
  { id: 'DEV-MDU-001', city: 'Madurai',            lat: 9.9252,  lng: 78.1198, status: 'online' },
  { id: 'DEV-TRY-001', city: 'Tiruchirappalli',    lat: 10.7905, lng: 78.7047, status: 'offline' },
];

const THRESHOLDS = { temp: 38, rain: 10, aqi: 150, wind: 60 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function Sensors() {
  const { latestSensor } = useSocket();
  const [history, setHistory] = useState(genMockHistory());
  const [stats, setStats] = useState(null);
  const [activeMetric, setActiveMetric] = useState('temp');
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0].id);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    api.get('/sensors/history?hours=12').then(r => {
      if (r.data.length > 5) {
        setHistory(r.data.slice(-30).map(d => ({
          time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: d.temperature, rain: d.rainfall, aqi: d.aqi, wind: d.windSpeed,
        })));
      }
    }).catch(() => {});
    api.get('/sensors/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!latestSensor) return;
    setLastUpdated(new Date());
    setHistory(prev => [...prev.slice(-29), {
      time: new Date(latestSensor.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: latestSensor.temperature, rain: latestSensor.rainfall,
      aqi: latestSensor.aqi, wind: latestSensor.windSpeed,
    }]);
  }, [latestSensor]);

  const current = {
    temp: latestSensor?.temperature ?? history[history.length - 1]?.temp ?? 24.5,
    rain: latestSensor?.rainfall    ?? history[history.length - 1]?.rain ?? 2.1,
    aqi:  latestSensor?.aqi         ?? history[history.length - 1]?.aqi  ?? 72,
    wind: latestSensor?.windSpeed   ?? history[history.length - 1]?.wind ?? 18,
  };

  const metrics = [
    { key: 'temp', label: 'Temperature', unit: '°C',    color: '#0d9488', icon: Thermometer, threshold: THRESHOLDS.temp, max: 50,  safe: 'Below 38°C',   danger: 'Heat stress risk' },
    { key: 'rain', label: 'Rainfall',    unit: 'mm/hr', color: '#0284c7', icon: Droplets,    threshold: THRESHOLDS.rain, max: 50,  safe: 'Below 10mm',   danger: 'Flooding risk' },
    { key: 'aqi',  label: 'Air Quality', unit: 'AQI',   color: '#7c3aed', icon: Activity,    threshold: THRESHOLDS.aqi,  max: 300, safe: 'Below 150 AQI',danger: 'Respiratory risk' },
    { key: 'wind', label: 'Wind Speed',  unit: 'km/h',  color: '#0891b2', icon: Wind,        threshold: THRESHOLDS.wind, max: 120, safe: 'Below 60km/h', danger: 'Storm risk' },
  ];

  const activeM = metrics.find(m => m.key === activeMetric);
  const currentVal = current[activeMetric];
  const exceeded = currentVal >= (activeM?.threshold || 999);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Live IoT Sensors</h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time environmental monitoring across {DEVICES.filter(d=>d.status==='online').length} active devices</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="flex items-center gap-1.5 badge-emerald">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full pulse-dot" />Live
          </span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ key, label, unit, color, icon: Icon, threshold, max }) => {
          const val = current[key];
          const pct = Math.min((val / max) * 100, 100);
          const over = val >= threshold;
          return (
            <button key={key} onClick={() => setActiveMetric(key)}
              className={`card-hover p-5 text-left transition-all ${activeMetric === key ? 'ring-2 ring-teal-400 ring-offset-1' : ''} ${over ? 'border-red-200' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                {over && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
              </div>
              <p className="text-2xl font-bold text-gray-800">{val}<span className="text-sm text-gray-400 ml-1">{unit}</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: over ? '#ef4444' : color }} />
              </div>
              <p className={`text-xs mt-1.5 ${over ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {over ? '⚠ Threshold exceeded' : `Threshold: ${threshold}${unit}`}
              </p>
            </button>
          );
        })}
      </div>

      {/* Chart + Device list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-700 text-sm">{activeM?.label} History</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {exceeded ? `⚠ Currently above safe threshold (${activeM?.threshold}${activeM?.unit})` : `✓ ${activeM?.safe}`}
              </p>
            </div>
            <div className="flex gap-1">
              {metrics.map(m => (
                <button key={m.key} onClick={() => setActiveMetric(m.key)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${activeMetric === m.key ? 'font-medium text-white' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}
                  style={activeMetric === m.key ? { background: m.color } : {}}>
                  {m.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeM?.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={activeM?.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey={activeMetric} stroke={activeM?.color} fill="url(#metricGrad)"
                strokeWidth={2} dot={false} activeDot={{ r: 4, fill: activeM?.color }} name={activeM?.label} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device list */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-teal"><Cpu className="w-4 h-4 text-teal-600" /></div>
            <h3 className="font-semibold text-gray-700 text-sm">IoT Devices</h3>
          </div>
          <div className="space-y-2">
            {DEVICES.map(d => (
              <button key={d.id} onClick={() => setSelectedDevice(d.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${selectedDevice === d.id ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 hover:bg-teal-50/50'}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{d.city}</p>
                    <p className="text-xs text-gray-400">{d.id}</p>
                  </div>
                </div>
                <span className={d.status === 'online' ? 'badge-emerald' : 'badge-slate'}>{d.status}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-xs font-semibold text-teal-700 mb-2">Network Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-white rounded-lg border border-teal-100">
                <p className="font-bold text-teal-600">{DEVICES.filter(d=>d.status==='online').length}</p>
                <p className="text-gray-400">Online</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                <p className="font-bold text-gray-400">{DEVICES.filter(d=>d.status==='offline').length}</p>
                <p className="text-gray-400">Offline</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-metric comparison */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 text-sm">All Metrics — 12hr Comparison</h3>
          <span className="text-xs text-gray-400">{history.length} data points</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
            {metrics.map(m => (
              <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color}
                strokeWidth={1.5} dot={false} name={m.label} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Readings', value: stats?.total ?? '1,284', color: 'text-teal-600' },
          { label: 'Anomalies (24h)', value: stats?.anomalies ?? 7, color: 'text-red-600' },
          { label: 'Active Devices', value: DEVICES.filter(d=>d.status==='online').length, color: 'text-emerald-600' },
          { label: 'Current Risk', value: (latestSensor?.riskLevel || 'Low').charAt(0).toUpperCase() + (latestSensor?.riskLevel || 'low').slice(1), color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${color} capitalize`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
