const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Claim = require('../models/Claim');
const Subscription = require('../models/Subscription');
const { detectFraud, calculatePayout } = require('../utils/riskEngine');
const { evaluateClaimApproval } = require('../services/fraudAnalyzer');

// GET /api/claims — worker's own claims
router.get('/', protect, async (req, res) => {
  try {
    const claims = await Claim.find({ worker: req.user._id })
      .populate('sensorData', 'temperature rainfall aqi windSpeed riskLevel timestamp')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/claims/user — alias for worker's own claims
router.get('/user', protect, async (req, res) => {
  try {
    const claims = await Claim.find({ worker: req.user._id })
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/claims/all — admin: all claims
router.get('/all', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    const claims = await Claim.find(filter)
      .populate('worker', 'name email location')
      .populate('sensorData', 'temperature rainfall aqi windSpeed riskLevel')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/claims — simple claim submission (worker raises claim with reason)
router.post('/', protect, async (req, res) => {
  try {
    const { claimType, description, location } = req.body;
    if (!claimType) return res.status(400).json({ message: 'Claim type is required' });

    const recentClaims = await Claim.find({ worker: req.user._id }).sort({ createdAt: -1 }).limit(10);
    const fraudFlags = detectFraud({ claimType }, recentClaims);
    const status = fraudFlags.length > 0 ? 'flagged' : 'pending';

    const claim = await Claim.create({
      worker: req.user._id,
      claimType,
      description: description || '',
      location: location || { city: req.user.location?.city || 'Unknown' },
      status,
      fraudFlags,
      fraudScore: fraudFlags.length * 25,
      isAutoTriggered: false,
      payoutAmount: 0,
    });

    res.status(201).json({ claim, message: 'Claim submitted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/claims/:id — admin update claim status
router.put('/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  try {
    const { status, adminNote } = req.body;
    const allowed = ['pending', 'auto_approved', 'paid', 'rejected', 'flagged'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const update = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (status === 'paid' || status === 'auto_approved') update.payoutDate = new Date();

    const claim = await Claim.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('worker', 'name email');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json(claim);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/claims/:id — single claim
router.get('/:id', protect, async (req, res) => {
  try {
    const claim = await Claim.findOne({ _id: req.params.id, worker: req.user._id })
      .populate('sensorData');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json(claim);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/claims/manual — manual claim with fraud analysis
router.post('/manual', protect, async (req, res) => {
  try {
    const { claimType, description, triggerValues, location } = req.body;
    if (!claimType) return res.status(400).json({ message: 'Claim type is required' });

    const subscription = await Subscription.findOne({ worker: req.user._id, status: 'active' });
    if (!subscription) return res.status(400).json({ message: 'No active subscription. Please subscribe to a plan first.' });

    if (!subscription.coverageTypes.includes(claimType)) {
      return res.status(400).json({ message: `Your ${subscription.plan} plan does not cover ${claimType.replace(/_/g, ' ')}. Upgrade your plan.` });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const defense = await evaluateClaimApproval(req.user._id, ip);

    const recentClaims = await Claim.find({ worker: req.user._id }).sort({ createdAt: -1 }).limit(10);
    const legacyFlags = detectFraud({ claimType }, recentClaims);

    const allFlags = [
      ...legacyFlags,
      ...defense.flags.map(f => ({ type: f.type, description: f.description })),
    ];

    let status;
    if (defense.blocked) status = 'flagged';
    else if (defense.underReview || allFlags.length > 0) status = 'flagged';
    else status = 'pending';

    const payoutAmount = defense.blocked ? 0 : calculatePayout(subscription.plan, claimType, subscription.maxPayout);

    const claim = await Claim.create({
      worker: req.user._id,
      subscription: subscription._id,
      claimType,
      triggerValues: triggerValues || {},
      status,
      payoutAmount: status === 'pending' ? payoutAmount : 0,
      location: location || { city: req.user.location?.city || 'Chennai' },
      fraudFlags: allFlags,
      fraudScore: defense.fraudScore || allFlags.length * 25,
      isAutoTriggered: false,
      description: description || `Manual claim: ${claimType.replace(/_/g, ' ')}`,
    });

    res.status(201).json({
      claim,
      defense: {
        fraudScore: defense.fraudScore,
        verdict: defense.verdict,
        status: defense.blocked ? 'blocked' : defense.underReview ? 'under_review' : 'approved',
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
