const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Claim = require('../models/Claim');
const Subscription = require('../models/Subscription');
const SensorData = require('../models/SensorData');

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const subscription = await Subscription.findOne({ worker: req.user._id, status: 'active' });
    const claims = await Claim.find({ worker: req.user._id })
      .populate('sensorData', 'temperature rainfall aqi riskLevel timestamp')
      .sort({ createdAt: -1 }).limit(10);
    res.json({ user, subscription, claims });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id, { name, phone, location }, { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const claims = await Claim.find({ worker: req.user._id });
    const totalPayout = claims.filter(c => c.status === 'paid' || c.status === 'auto_approved')
      .reduce((s, c) => s + c.payoutAmount, 0);
    const activeSub = await Subscription.findOne({ worker: req.user._id, status: 'active' });

    // Weekly earnings breakdown (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(); day.setDate(day.getDate() - i); day.setHours(0,0,0,0);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const dayClaims = claims.filter(c => {
        const d = new Date(c.createdAt);
        return d >= day && d < next && (c.status === 'paid' || c.status === 'auto_approved');
      });
      weeklyData.push({
        day: day.toLocaleDateString('en-IN', { weekday: 'short' }),
        earnings: dayClaims.reduce((s, c) => s + c.payoutAmount, 0),
        claims: dayClaims.length,
        deliveries: Math.floor(Math.random() * 20 + 8), // simulated
      });
    }

    res.json({
      totalClaims: claims.length,
      approvedClaims: claims.filter(c => c.status === 'paid' || c.status === 'auto_approved').length,
      pendingClaims: claims.filter(c => c.status === 'pending').length,
      totalPayout,
      riskScore: req.user.riskScore,
      hasActivePlan: !!activeSub,
      plan: activeSub?.plan || null,
      weeklyData,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
