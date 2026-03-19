// Thresholds for disruption detection
const THRESHOLDS = {
  temperature: { high: 38, critical: 42 },   // Celsius
  rainfall: { high: 10, critical: 25 },       // mm/hr
  aqi: { high: 150, critical: 200 },          // AQI index
  windSpeed: { high: 60, critical: 90 }       // km/h
};

const PAYOUT_RATES = {
  basic: { heavy_rain: 50, extreme_heat: 0, poor_air_quality: 0, storm: 0, combined: 0 },
  standard: { heavy_rain: 100, extreme_heat: 80, poor_air_quality: 70, storm: 0, combined: 120 },
  premium: { heavy_rain: 150, extreme_heat: 130, poor_air_quality: 120, storm: 200, combined: 250 }
};

function assessRisk(sensorData) {
  const { temperature, rainfall, aqi, windSpeed } = sensorData;
  let riskScore = 0;
  let triggers = [];

  if (temperature >= THRESHOLDS.temperature.critical) { riskScore += 40; triggers.push('extreme_heat'); }
  else if (temperature >= THRESHOLDS.temperature.high) { riskScore += 20; }

  if (rainfall >= THRESHOLDS.rainfall.critical) { riskScore += 40; triggers.push('heavy_rain'); }
  else if (rainfall >= THRESHOLDS.rainfall.high) { riskScore += 20; triggers.push('heavy_rain'); }

  if (aqi >= THRESHOLDS.aqi.critical) { riskScore += 30; triggers.push('poor_air_quality'); }
  else if (aqi >= THRESHOLDS.aqi.high) { riskScore += 15; triggers.push('poor_air_quality'); }

  if (windSpeed >= THRESHOLDS.windSpeed.critical) { riskScore += 30; triggers.push('storm'); }
  else if (windSpeed >= THRESHOLDS.windSpeed.high) { riskScore += 15; }

  let riskLevel = 'low';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 40) riskLevel = 'high';
  else if (riskScore >= 20) riskLevel = 'medium';

  const claimType = triggers.length > 1 ? 'combined' : triggers[0] || null;
  const anomalyDetected = riskScore >= 40;

  return { riskScore, riskLevel, triggers, claimType, anomalyDetected };
}

function calculatePayout(plan, claimType, maxPayout) {
  const base = PAYOUT_RATES[plan]?.[claimType] || 0;
  return Math.min(base, maxPayout);
}

function detectFraud(claim, recentClaims) {
  const flags = [];

  // Duplicate claim prevention - same worker, same type within 24 hours
  const recent = recentClaims.filter(c =>
    c.claimType === claim.claimType &&
    new Date() - new Date(c.createdAt) < 24 * 60 * 60 * 1000
  );
  if (recent.length > 0) {
    flags.push({ type: 'duplicate', description: 'Similar claim filed within 24 hours' });
  }

  // Excessive claims - more than 5 claims in a week
  const weeklyCount = recentClaims.filter(c =>
    new Date() - new Date(c.createdAt) < 7 * 24 * 60 * 60 * 1000
  ).length;
  if (weeklyCount >= 5) {
    flags.push({ type: 'excessive', description: 'More than 5 claims in 7 days' });
  }

  return flags;
}

module.exports = { assessRisk, calculatePayout, detectFraud, THRESHOLDS };
