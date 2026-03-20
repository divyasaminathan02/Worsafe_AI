/**
 * fraudAnalyzer.js — Adversarial Defense & Anti-Spoofing Service
 * Signals: GPS consistency, claim frequency, activity ratio,
 *          device/session pattern, timestamp validity, IP-location match
 */

const Claim       = require('../models/Claim');
const User        = require('../models/User');
const FraudReport = require('../models/FraudReport');

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mock IP-to-city (replace with real GeoIP in production)
const IP_PREFIXES = {
  Chennai:         ['103.21.', '49.204.', '122.166.'],
  Coimbatore:      ['103.55.', '117.196.'],
  Madurai:         ['103.57.', '117.197.'],
  Tiruchirappalli: ['103.59.', '117.198.'],
  Salem:           ['103.61.', '117.199.'],
  Tirunelveli:     ['103.63.', '117.200.'],
  Vellore:         ['103.65.', '117.201.'],
};

function mockIpToCity(ip) {
  if (!ip) return null;
  for (const [city, prefixes] of Object.entries(IP_PREFIXES)) {
    if (prefixes.some(p => ip.startsWith(p))) return city;
  }
  return null;
}

// Signal 1: GPS consistency
function analyzeGps(user, claims) {
  const flags = [];
  let score = 0;
  const regCity = user.location?.city;

  const foreign = claims.filter(c => c.location?.city && c.location.city !== regCity);
  if (foreign.length > 0) {
    score += 25;
    flags.push({ type: 'gps_city_mismatch', severity: 'medium',
      description: `${foreign.length} claim(s) from city other than registered city (${regCity})` });
  }

  const sorted = [...claims]
    .filter(c => c.location?.lat && c.location?.lng)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (let i = 1; i < sorted.length; i++) {
    const dist = haversineKm(
      sorted[i-1].location.lat, sorted[i-1].location.lng,
      sorted[i].location.lat,   sorted[i].location.lng
    );
    const hrs = (new Date(sorted[i].createdAt) - new Date(sorted[i-1].createdAt)) / 3600000;
    if (dist > 200 && hrs < 1) {
      score += 40;
      flags.push({ type: 'gps_jump', severity: 'high',
        description: `Impossible GPS jump: ${Math.round(dist)}km in ${(hrs * 60).toFixed(0)} min` });
    }
  }

  return { score: Math.min(score, 100), detail: score === 0 ? 'Location consistent' : `${flags.length} location anomaly detected`, flags };
}

// Signal 2: Claim frequency
function analyzeFrequency(claims) {
  const flags = [];
  let score = 0;
  const now = Date.now();
  const h24 = claims.filter(c => now - new Date(c.createdAt) < 86400000).length;
  const d7  = claims.filter(c => now - new Date(c.createdAt) < 7 * 86400000).length;

  if (h24 >= 3)  { score += 35; flags.push({ type: 'burst_claims',      severity: 'high',   description: `${h24} claims in 24h` }); }
  else if (h24 >= 2) { score += 15; flags.push({ type: 'duplicate',     severity: 'medium', description: `${h24} claims in 24h` }); }
  if (d7 >= 7)   { score += 30; flags.push({ type: 'excessive_weekly',  severity: 'high',   description: `${d7} claims in 7 days` }); }
  else if (d7 >= 5) { score += 15; flags.push({ type: 'high_weekly',    severity: 'medium', description: `${d7} claims in 7 days` }); }

  // Same type twice in 24h
  const typeMap = {};
  claims.filter(c => now - new Date(c.createdAt) < 86400000)
    .forEach(c => { typeMap[c.claimType] = (typeMap[c.claimType] || 0) + 1; });
  Object.entries(typeMap).forEach(([t, n]) => {
    if (n >= 2) { score += 20; flags.push({ type: 'duplicate_type', severity: 'medium', description: `"${t.replace(/_/g,' ')}" filed ${n}x in 24h` }); }
  });

  return { score: Math.min(score, 100), detail: score === 0 ? 'Normal claim frequency' : 'Elevated claim frequency', flags };
}

// Signal 3: Activity ratio
function analyzeActivity(user, totalClaims) {
  const flags = [];
  let score = 0;
  const del = user.totalDeliveries || 0;
  const ratio = del === 0 ? totalClaims : totalClaims / del;

  if (del < 10 && totalClaims >= 3) {
    score += 30;
    flags.push({ type: 'low_activity', severity: 'medium', description: `Only ${del} deliveries but ${totalClaims} claims` });
  } else if (ratio > 0.5) {
    score += 20;
    flags.push({ type: 'high_claim_ratio', severity: 'medium', description: `Claim/delivery ratio ${ratio.toFixed(2)} (threshold 0.5)` });
  }

  return { score: Math.min(score, 100), detail: score === 0 ? `Healthy ratio (${totalClaims}/${del})` : 'Suspicious activity ratio', flags };
}

// Signal 4: Device/session burst
function analyzeDevice(claims) {
  const flags = [];
  let score = 0;
  const sorted = [...claims].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (let i = 2; i < sorted.length; i++) {
    const win = (new Date(sorted[i].createdAt) - new Date(sorted[i-2].createdAt)) / 60000;
    if (win < 10) {
      score += 35;
      flags.push({ type: 'session_burst', severity: 'high', description: `3 claims in ${win.toFixed(1)} min — possible bot` });
      break;
    }
  }

  return { score: Math.min(score, 100), detail: score === 0 ? 'Normal session pattern' : 'Session burst detected', flags };
}

// Signal 5: Timestamp validity
function analyzeTimestamps(claims) {
  const flags = [];
  let score = 0;
  const offHours = claims.filter(c => { const h = new Date(c.createdAt).getHours(); return h >= 0 && h < 4; });
  if (offHours.length >= 2) {
    score += 20;
    flags.push({ type: 'off_hours', severity: 'low', description: `${offHours.length} claims filed midnight–4am` });
  }
  return { score: Math.min(score, 100), detail: score === 0 ? 'Timestamps within working hours' : 'Off-hours activity', flags };
}

// Signal 6: IP-location match
function analyzeIp(user, ip) {
  const flags = [];
  let score = 0;
  const ipCity = mockIpToCity(ip);
  const regCity = user.location?.city;

  if (ipCity && ipCity !== regCity) {
    score += 25;
    flags.push({ type: 'ip_mismatch', severity: 'medium', description: `IP resolves to ${ipCity}, registered city is ${regCity}` });
  }

  return { score: Math.min(score, 100), detail: score === 0 ? `IP matches registered city` : `IP city mismatch`, flags };
}

// Master analyzer — runs all signals, upserts FraudReport
async function analyzeWorker(workerId, ip = null) {
  const user = await User.findById(workerId);
  if (!user) throw new Error('Worker not found');

  const allClaims    = await Claim.find({ worker: workerId }).sort({ createdAt: -1 });
  const recent       = allClaims.slice(0, 20);

  const gps   = analyzeGps(user, recent);
  const freq  = analyzeFrequency(recent);
  const act   = analyzeActivity(user, allClaims.length);
  const dev   = analyzeDevice(recent);
  const ts    = analyzeTimestamps(recent);
  const ipSig = analyzeIp(user, ip);

  const fraudScore = Math.min(Math.round(
    gps.score * 0.25 + freq.score * 0.30 + act.score * 0.20 +
    dev.score * 0.10 + ts.score  * 0.05 + ipSig.score * 0.10
  ), 100);

  const verdict = fraudScore >= 60 ? 'fraud_risk' : fraudScore >= 30 ? 'suspicious' : 'genuine_worker';

  const allFlags = [
    ...gps.flags, ...freq.flags, ...act.flags,
    ...dev.flags, ...ts.flags,   ...ipSig.flags,
  ].map(f => ({ ...f, detectedAt: new Date() }));

  const report = await FraudReport.findOneAndUpdate(
    { worker: workerId },
    {
      verdict, fraudScore,
      signals: {
        gpsConsistency:    { score: gps.score,    detail: gps.detail },
        claimFrequency:    { score: freq.score,   detail: freq.detail },
        activityRatio:     { score: act.score,    detail: act.detail },
        devicePattern:     { score: dev.score,    detail: dev.detail },
        timestampValidity: { score: ts.score,     detail: ts.detail },
        ipLocationMatch:   { score: ipSig.score,  detail: ipSig.detail },
      },
      flags: allFlags,
      analysisSnapshot: {
        totalClaims:     allClaims.length,
        claimsLast7Days: recent.filter(c => Date.now() - new Date(c.createdAt) < 7 * 86400000).length,
        totalDeliveries: user.totalDeliveries || 0,
        lastClaimCity:   recent[0]?.location?.city || user.location?.city,
        registeredCity:  user.location?.city,
        sessionCount:    recent.length,
      },
      lastAnalyzedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return report;
}

// Claim-level gate used in claims route
async function evaluateClaimApproval(workerId, ip = null) {
  const report = await analyzeWorker(workerId, ip);
  return {
    approved:    report.fraudScore < 30,
    underReview: report.fraudScore >= 30 && report.fraudScore < 60,
    blocked:     report.fraudScore >= 60,
    fraudScore:  report.fraudScore,
    verdict:     report.verdict,
    flags:       report.flags,
  };
}

module.exports = { analyzeWorker, evaluateClaimApproval, mockIpToCity };
