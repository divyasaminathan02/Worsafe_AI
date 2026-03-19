require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Subscription = require('./models/Subscription');
const SensorData = require('./models/SensorData');
const Claim = require('./models/Claim');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Subscription.deleteMany({}),
    SensorData.deleteMany({}),
    Claim.deleteMany({}),
  ]);
  console.log('🗑  Cleared existing data');

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'Admin User', email: 'admin@demo.com', password: 'admin123',
    role: 'admin', phone: '+919000000001',
  });

  const workersData = [
    { name: 'Arjun Murugan',    email: 'worker@demo.com',  password: 'demo123', phone: '+919000000002', city: 'Chennai',     lat: 13.0827, lng: 80.2707, earnings: 18420, deliveries: 134, risk: 22 },
    { name: 'Priya Lakshmi',    email: 'priya@demo.com',   password: 'demo123', phone: '+919000000003', city: 'Coimbatore',  lat: 11.0168, lng: 76.9558, earnings: 23100, deliveries: 178, risk: 35 },
    { name: 'Karthik Selvam',   email: 'karthik@demo.com', password: 'demo123', phone: '+919000000004', city: 'Madurai',     lat: 9.9252,  lng: 78.1198, earnings: 16507, deliveries: 121, risk: 18 },
    { name: 'Deepa Rajan',      email: 'deepa@demo.com',   password: 'demo123', phone: '+919000000005', city: 'Chennai',     lat: 13.0600, lng: 80.2500, earnings: 9802,  deliveries: 72,  risk: 58 },
    { name: 'Suresh Pandian',   email: 'suresh@demo.com',  password: 'demo123', phone: '+919000000006', city: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047, earnings: 31000, deliveries: 241, risk: 14 },
    { name: 'Kavitha Nair',     email: 'kavitha@demo.com', password: 'demo123', phone: '+919000000007', city: 'Salem',       lat: 11.6643, lng: 78.1460, earnings: 7205,  deliveries: 55,  risk: 71 },
    { name: 'Rajesh Kumar',     email: 'rajesh@demo.com',  password: 'demo123', phone: '+919000000008', city: 'Tirunelveli', lat: 8.7139,  lng: 77.7567, earnings: 14200, deliveries: 108, risk: 29 },
    { name: 'Anitha Devi',      email: 'anitha@demo.com',  password: 'demo123', phone: '+919000000009', city: 'Vellore',     lat: 12.9165, lng: 79.1325, earnings: 20500, deliveries: 159, risk: 41 },
  ];

  const workers = await Promise.all(workersData.map(w =>
    User.create({
      name: w.name, email: w.email, password: w.password,
      role: 'worker', phone: w.phone,
      location: { city: w.city, lat: w.lat, lng: w.lng },
      earnings: w.earnings, totalDeliveries: w.deliveries, riskScore: w.risk,
    })
  ));
  console.log(`👷 Created ${workers.length} workers`);

  // ── Subscriptions ──────────────────────────────────────────────────────────
  const planMap = {
    basic:    { weeklyPremium: 50,  maxPayout: 1000, coverageTypes: ['heavy_rain'] },
    standard: { weeklyPremium: 120, maxPayout: 2500, coverageTypes: ['heavy_rain', 'extreme_heat', 'poor_air_quality'] },
    premium:  { weeklyPremium: 200, maxPayout: 5000, coverageTypes: ['heavy_rain', 'extreme_heat', 'poor_air_quality', 'storm', 'combined'] },
  };
  const planKeys = ['standard', 'premium', 'standard', 'basic', 'premium', 'basic', 'standard', 'premium'];

  const subs = await Promise.all(workers.map((w, i) => {
    const plan = planKeys[i];
    const p = planMap[plan];
    const end = new Date(); end.setDate(end.getDate() + 7);
    return Subscription.create({
      worker: w._id, plan, ...p, status: 'active',
      endDate: end, totalPremiumPaid: p.weeklyPremium * (2 + i),
      totalClaimsPaid: [1000, 3300, 800, 0, 7000, 0, 1200, 2500][i],
    });
  }));
  console.log(`📋 Created ${subs.length} subscriptions`);

  // ── Sensor Data ────────────────────────────────────────────────────────────
  const devices = [
    { id: 'DEV-CHN-001', city: 'Chennai',        lat: 13.0827, lng: 80.2707 },
    { id: 'DEV-CHN-002', city: 'Chennai',        lat: 13.0600, lng: 80.2500 },
    { id: 'DEV-CBE-001', city: 'Coimbatore',     lat: 11.0168, lng: 76.9558 },
    { id: 'DEV-MDU-001', city: 'Madurai',        lat: 9.9252,  lng: 78.1198 },
    { id: 'DEV-TRY-001', city: 'Tiruchirappalli',lat: 10.7905, lng: 78.7047 },
  ];

  const sensorDocs = [];
  const now = Date.now();
  for (let h = 47; h >= 0; h--) {
    for (const dev of devices) {
      const t = new Date(now - h * 3600000);
      // Tamil Nadu realistic temps: 28–42°C range
      const temp = +(28 + Math.sin(h * 0.3) * 8 + Math.random() * 5).toFixed(1);
      const rain = +(Math.max(0, Math.sin(h * 0.5) * 20 + Math.random() * 6)).toFixed(1);
      const aqi  = +(80 + Math.cos(h * 0.25) * 50 + Math.random() * 20).toFixed(0);
      const wind = +(12 + Math.sin(h * 0.4) * 18 + Math.random() * 8).toFixed(1);
      const riskScore = (temp >= 42 ? 40 : temp >= 38 ? 20 : 0) +
                        (rain >= 25 ? 40 : rain >= 10 ? 20 : 0) +
                        (aqi  >= 200 ? 30 : aqi >= 150 ? 15 : 0) +
                        (wind >= 90 ? 30 : wind >= 60 ? 15 : 0);
      const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
      sensorDocs.push({
        deviceId: dev.id, location: { city: dev.city, lat: dev.lat, lng: dev.lng },
        temperature: temp, rainfall: rain, aqi, windSpeed: wind,
        humidity: +(55 + Math.random() * 35).toFixed(0),
        riskLevel, anomalyDetected: riskScore >= 40, timestamp: t,
      });
    }
  }

  // Critical events — Tamil Nadu weather scenarios
  const criticalEvents = [
    { deviceId: 'DEV-CHN-001', location: { city: 'Chennai',        lat: 13.0827, lng: 80.2707 }, temperature: 43.5, rainfall: 0.2,  aqi: 98,  windSpeed: 20, humidity: 28, riskLevel: 'critical', anomalyDetected: true, timestamp: new Date(now - 86400000 * 2) },
    { deviceId: 'DEV-CHN-002', location: { city: 'Chennai',        lat: 13.0600, lng: 80.2500 }, temperature: 17.0, rainfall: 35.5, aqi: 60,  windSpeed: 52, humidity: 90, riskLevel: 'critical', anomalyDetected: true, timestamp: new Date(now - 86400000 * 5) },
    { deviceId: 'DEV-CBE-001', location: { city: 'Coimbatore',     lat: 11.0168, lng: 76.9558 }, temperature: 15.0, rainfall: 42.0, aqi: 75,  windSpeed: 95, humidity: 94, riskLevel: 'critical', anomalyDetected: true, timestamp: new Date(now - 86400000 * 8) },
    { deviceId: 'DEV-CHN-001', location: { city: 'Chennai',        lat: 13.0827, lng: 80.2707 }, temperature: 30.0, rainfall: 0.1,  aqi: 198, windSpeed: 14, humidity: 38, riskLevel: 'critical', anomalyDetected: true, timestamp: new Date(now - 86400000 * 12) },
    { deviceId: 'DEV-MDU-001', location: { city: 'Madurai',        lat: 9.9252,  lng: 78.1198 }, temperature: 44.0, rainfall: 24.0, aqi: 168, windSpeed: 74, humidity: 48, riskLevel: 'critical', anomalyDetected: true, timestamp: new Date(now - 86400000 * 15) },
  ];
  sensorDocs.push(...criticalEvents);
  const sensors = await SensorData.insertMany(sensorDocs);
  console.log(`📡 Created ${sensors.length} sensor readings`);

  // ── Claims ─────────────────────────────────────────────────────────────────
  const claimsData = [
    { workerIdx: 0, subIdx: 0, type: 'extreme_heat',     status: 'paid',          payout: 800,  daysAgo: 2,  city: 'Chennai',        temp: 43.5, rain: 0.2,  aqi: 98,  wind: 20, desc: 'Temperature 43.5°C exceeded critical threshold of 42°C' },
    { workerIdx: 0, subIdx: 0, type: 'heavy_rain',       status: 'paid',          payout: 1000, daysAgo: 5,  city: 'Chennai',        temp: 17.0, rain: 35.5, aqi: 60,  wind: 52, desc: 'Rainfall 35.5mm/hr exceeded critical threshold of 25mm/hr' },
    { workerIdx: 1, subIdx: 1, type: 'storm',            status: 'paid',          payout: 2000, daysAgo: 8,  city: 'Coimbatore',     temp: 15.0, rain: 42.0, aqi: 75,  wind: 95, desc: 'Storm conditions — wind 95km/h + heavy rain 42mm/hr' },
    { workerIdx: 1, subIdx: 1, type: 'poor_air_quality', status: 'paid',          payout: 1200, daysAgo: 3,  city: 'Coimbatore',     temp: 30.0, rain: 0.1,  aqi: 198, wind: 14, desc: 'AQI 198 — hazardous air quality near industrial zone' },
    { workerIdx: 2, subIdx: 2, type: 'extreme_heat',     status: 'paid',          payout: 800,  daysAgo: 15, city: 'Madurai',        temp: 44.0, rain: 24.0, aqi: 168, wind: 74, desc: 'Extreme heat + poor air quality combined event' },
    { workerIdx: 3, subIdx: 3, type: 'heavy_rain',       status: 'pending',       payout: 500,  daysAgo: 1,  city: 'Chennai',        temp: 18.0, rain: 14.5, aqi: 52,  wind: 38, desc: 'Heavy rain 14.5mm/hr — under review' },
    { workerIdx: 4, subIdx: 4, type: 'combined',         status: 'paid',          payout: 2500, daysAgo: 10, city: 'Tiruchirappalli',temp: 41.0, rain: 28.0, aqi: 172, wind: 82, desc: 'Multiple thresholds exceeded simultaneously' },
    { workerIdx: 5, subIdx: 5, type: 'heavy_rain',       status: 'flagged',       payout: 0,    daysAgo: 2,  city: 'Salem',          temp: 20.0, rain: 11.0, aqi: 62,  wind: 24, desc: 'Flagged: duplicate claim within 24 hours', fraud: [{ type: 'duplicate', description: 'Similar claim filed within 24 hours' }] },
    { workerIdx: 6, subIdx: 6, type: 'poor_air_quality', status: 'paid',          payout: 700,  daysAgo: 6,  city: 'Tirunelveli',    temp: 27.0, rain: 0.0,  aqi: 190, wind: 11, desc: 'AQI 190 — hazardous air quality event' },
    { workerIdx: 7, subIdx: 7, type: 'storm',            status: 'paid',          payout: 2000, daysAgo: 12, city: 'Vellore',        temp: 13.0, rain: 44.0, aqi: 68,  wind: 104, desc: 'Severe cyclone — wind 104km/h, rainfall 44mm/hr' },
    { workerIdx: 0, subIdx: 0, type: 'poor_air_quality', status: 'paid',          payout: 700,  daysAgo: 18, city: 'Chennai',        temp: 31.0, rain: 0.0,  aqi: 180, wind: 9,  desc: 'AQI 180 — smog event near Ennore port' },
    { workerIdx: 1, subIdx: 1, type: 'combined',         status: 'paid',          payout: 2500, daysAgo: 20, city: 'Coimbatore',     temp: 42.0, rain: 27.0, aqi: 158, wind: 78, desc: 'Combined extreme heat + storm event' },
    { workerIdx: 2, subIdx: 2, type: 'heavy_rain',       status: 'rejected',      payout: 0,    daysAgo: 22, city: 'Madurai',        temp: 23.0, rain: 12.0, aqi: 52,  wind: 30, desc: 'Rejected: plan coverage did not include this event type' },
    { workerIdx: 4, subIdx: 4, type: 'extreme_heat',     status: 'auto_approved', payout: 1300, daysAgo: 0,  city: 'Tiruchirappalli',temp: 43.0, rain: 0.0,  aqi: 90,  wind: 24, desc: 'Temperature 43°C — auto-approved, payout processing' },
  ];

  const claimDocs = claimsData.map(c => ({
    worker: workers[c.workerIdx]._id,
    subscription: subs[c.subIdx]._id,
    claimType: c.type,
    triggerValues: { temperature: c.temp, rainfall: c.rain, aqi: c.aqi, windSpeed: c.wind },
    status: c.status,
    payoutAmount: c.payout,
    payoutDate: ['paid', 'auto_approved'].includes(c.status) ? new Date(now - c.daysAgo * 86400000 + 3600000) : null,
    location: { city: c.city },
    fraudFlags: c.fraud || [],
    isAutoTriggered: true,
    description: c.desc,
    createdAt: new Date(now - c.daysAgo * 86400000),
  }));

  await Claim.insertMany(claimDocs);
  console.log(`📄 Created ${claimDocs.length} claims`);

  console.log('\n✅ Seed complete! — Tamil Nadu data');
  console.log('   Worker  → worker@demo.com / demo123');
  console.log('   Admin   → admin@demo.com  / admin123');
  console.log('   + 7 more workers (priya, karthik, deepa, suresh, kavitha, rajesh, anitha) / demo123');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
