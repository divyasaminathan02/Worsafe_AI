const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Subscription = require('../models/Subscription');

const PLANS = {
  basic:    { weeklyPremium: 5,  maxPayout: 100, coverageTypes: ['heavy_rain'] },
  standard: { weeklyPremium: 12, maxPayout: 250, coverageTypes: ['heavy_rain', 'extreme_heat', 'poor_air_quality'] },
  premium:  { weeklyPremium: 20, maxPayout: 500, coverageTypes: ['heavy_rain', 'extreme_heat', 'poor_air_quality', 'storm', 'combined'] }
};

router.post('/subscribe', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan' });

    // Cancel existing active subscription
    await Subscription.updateMany({ worker: req.user._id, status: 'active' }, { status: 'cancelled' });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const subscription = await Subscription.create({
      worker: req.user._id,
      plan,
      ...PLANS[plan],
      endDate,
      totalPremiumPaid: PLANS[plan].weeklyPremium
    });

    res.status(201).json(subscription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ worker: req.user._id, status: 'active' });
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/cancel', protect, async (req, res) => {
  try {
    await Subscription.updateMany({ worker: req.user._id, status: 'active' }, { status: 'cancelled' });
    res.json({ message: 'Subscription cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/plans', (req, res) => res.json(PLANS));

module.exports = router;
