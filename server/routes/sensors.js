const router = require('express').Router();
const { protect } = require('../middleware/auth');
const SensorData = require('../models/SensorData');
const Claim = require('../models/Claim');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { assessRisk, calculatePayout, detectFraud } = require('../utils/riskEngine');

// Receive IoT sensor data (can be called by simulator)
router.post('/ingest', async (req, res) => {
  try {
    const { deviceId, location, temperature, rainfall, aqi, windSpeed, humidity } = req.body;
    const { riskScore, riskLevel, claimType, anomalyDetected } = assessRisk({ temperature, rainfall, aqi, windSpeed: windSpeed || 0 });

    const sensor = await SensorData.create({
      deviceId, location, temperature, rainfall, aqi,
      windSpeed: windSpeed || 0, humidity: humidity || 0,
      riskLevel, anomalyDetected
    });

    const io = req.app.get('io');
    io.emit('sensorUpdate', sensor);

    // Auto-trigger claims if anomaly detected
    if (anomalyDetected && claimType) {
      const workers = await User.find({ 'location.city': location?.city || 'Melbourne', isActive: true });

      for (const worker of workers) {
        const subscription = await Subscription.findOne({ worker: worker._id, status: 'active' });
        if (!subscription || !subscription.coverageTypes.includes(claimType)) continue;

        const recentClaims = await Claim.find({ worker: worker._id }).sort({ createdAt: -1 }).limit(10);
        const fraudFlags = detectFraud({ claimType }, recentClaims);

        const payoutAmount = calculatePayout(subscription.plan, claimType, subscription.maxPayout);
        const status = fraudFlags.length > 0 ? 'flagged' : 'auto_approved';

        const claim = await Claim.create({
          worker: worker._id,
          subscription: subscription._id,
          sensorData: sensor._id,
          claimType,
          triggerValues: { temperature, rainfall, aqi, windSpeed: windSpeed || 0 },
          status,
          payoutAmount: status === 'auto_approved' ? payoutAmount : 0,
          payoutDate: status === 'auto_approved' ? new Date() : null,
          location: location || { city: 'Melbourne' },
          fraudFlags,
          description: `Auto-triggered: ${claimType} detected. Risk level: ${riskLevel}`
        });

        if (status === 'auto_approved') {
          await Subscription.findByIdAndUpdate(subscription._id, {
            $inc: { totalClaimsPaid: payoutAmount }
          });
          await User.findByIdAndUpdate(worker._id, {
            $inc: { earnings: payoutAmount },
            riskScore
          });
          // Mark as paid
          await Claim.findByIdAndUpdate(claim._id, { status: 'paid' });
        }

        io.emit('claimTriggered', { workerId: worker._id, claim, riskLevel });
        io.emit('notification', {
          workerId: worker._id,
          message: `⚠️ Disruption detected! ${claimType.replace('_', ' ')} - Claim auto-filed`,
          type: riskLevel
        });
      }
    }

    res.status(201).json({ sensor, anomalyDetected, riskLevel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/latest', protect, async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const data = await SensorData.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    const anomalies = await SensorData.countDocuments({ anomalyDetected: true });
    const total = await SensorData.countDocuments();
    res.json({ latest, anomalies, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
