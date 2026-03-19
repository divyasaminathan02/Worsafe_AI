const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Claim = require('../models/Claim');
const Subscription = require('../models/Subscription');
const { detectFraud, calculatePayout } = require('../utils/riskEngine');

router.get('/', protect, async (req, res) => {
  try {
    const claims = await Claim.find({ worker: req.user._id })
      .populate('sensorData', 'temperature rainfall aqi windSpeed riskLevel timestamp')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const claim = await Claim.findOne({ _id: req.params.id, worker: req.user._id })
      .populate('sensorData');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json(claim);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Manual claim submission
router.post('/manual', protect, async (req, res) => {
  try {
    const { claimType, description, triggerValues, location } = req.body;
    if (!claimType) return res.status(400).json({ message: 'Claim type is required' });

    const subscription = await Subscription.findOne({ worker: req.user._id, status: 'active' });
    if (!subscription) return res.status(400).json({ message: 'No active subscription. Please subscribe to a plan first.' });

    if (!subscription.coverageTypes.includes(claimType)) {
      return res.status(400).json({ message: `Your ${subscription.plan} plan does not cover ${claimType.replace(/_/g, ' ')}. Upgrade your plan.` });
    }

    const recentClaims = await Claim.find({ worker: req.user._id }).sort({ createdAt: -1 }).limit(10);
    const fraudFlags = detectFraud({ claimType }, recentClaims);
    const payoutAmount = calculatePayout(subscription.plan, claimType, subscription.maxPayout);
    const status = fraudFlags.length > 0 ? 'flagged' : 'pending';

    const claim = await Claim.create({
      worker: req.user._id,
      subscription: subscription._id,
      claimType,
      triggerValues: triggerValues || {},
      status,
      payoutAmount: 0, // manual claims start at 0 until approved
      location: location || { city: req.user.location?.city || 'Melbourne' },
      fraudFlags,
      isAutoTriggered: false,
      description: description || `Manual claim: ${claimType.replace(/_/g, ' ')}`,
    });

    res.status(201).json(claim);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
