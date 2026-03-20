const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Claim = require('../models/Claim');
const SensorData = require('../models/SensorData');
const Subscription = require('../models/Subscription');

router.use(protect, adminOnly);

router.get('/dashboard', async (req, res) => {
  try {
    const [totalUsers, totalClaims, totalSensors, activeSubs] = await Promise.all([
      User.countDocuments({ role: 'worker' }),
      Claim.countDocuments(),
      SensorData.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
    ]);

    const recentClaims = await Claim.find()
      .populate('worker', 'name email location')
      .sort({ createdAt: -1 }).limit(10);

    const claimStats = await Claim.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalPayout: { $sum: '$payoutAmount' } } }
    ]);

    const sensorStats = await SensorData.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0);
      const end = new Date(d); end.setMonth(end.getMonth() + 1);
      const [mClaims, mUsers] = await Promise.all([
        Claim.find({ createdAt: { $gte: d, $lt: end } }),
        User.countDocuments({ role: 'worker', createdAt: { $lte: end } }),
      ]);
      monthlyTrend.push({
        month: d.toLocaleDateString('en-AU', { month: 'short' }),
        claims: mClaims.length,
        payouts: mClaims.filter(c => c.status === 'paid').reduce((s, c) => s + c.payoutAmount, 0),
        workers: mUsers,
      });
    }

    const totalPayout = await Claim.aggregate([
      { $match: { status: { $in: ['paid', 'auto_approved'] } } },
      { $group: { _id: null, total: { $sum: '$payoutAmount' } } }
    ]);

    res.json({
      totalUsers, totalClaims, totalSensors, activeSubs,
      totalPayout: totalPayout[0]?.total || 0,
      recentClaims, claimStats, sensorStats, monthlyTrend,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'worker' }).select('-password').sort({ createdAt: -1 });
    // Attach subscription info
    const withSubs = await Promise.all(users.map(async u => {
      const sub = await Subscription.findOne({ worker: u._id, status: 'active' });
      const claimCount = await Claim.countDocuments({ worker: u._id });
      return { ...u.toObject(), subscription: sub, claimCount };
    }));
    res.json(withSubs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/claims', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};
    const claims = await Claim.find(filter)
      .populate('worker', 'name email location')
      .populate('sensorData', 'temperature rainfall aqi windSpeed riskLevel')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Claim.countDocuments(filter);
    res.json({ claims, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/claims/:id', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (status === 'paid' || status === 'auto_approved') update.payoutDate = new Date();
    const claim = await Claim.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('worker', 'name email');
    res.json(claim);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/sensors', async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(200);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
