const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { analyzeWorker }      = require('../services/fraudAnalyzer');
const FraudReport            = require('../models/FraudReport');
const User                   = require('../models/User');

// Worker: get own fraud report (triggers fresh analysis)
router.get('/my-report', protect, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const report = await analyzeWorker(req.user._id, ip);
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Worker: get cached report without re-running analysis
router.get('/my-report/cached', protect, async (req, res) => {
  try {
    const report = await FraudReport.findOne({ worker: req.user._id });
    if (!report) return res.json(null);
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: get all fraud reports with worker info
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const reports = await FraudReport.find()
      .populate('worker', 'name email location riskScore totalDeliveries isActive')
      .sort({ fraudScore: -1 });
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: trigger fresh analysis for a specific worker
router.post('/analyze/:workerId', protect, adminOnly, async (req, res) => {
  try {
    const report = await analyzeWorker(req.params.workerId);
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: summary stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const all = await FraudReport.find();
    res.json({
      total:        all.length,
      genuine:      all.filter(r => r.verdict === 'genuine_worker').length,
      suspicious:   all.filter(r => r.verdict === 'suspicious').length,
      fraudRisk:    all.filter(r => r.verdict === 'fraud_risk').length,
      avgScore:     all.length ? Math.round(all.reduce((s, r) => s + r.fraudScore, 0) / all.length) : 0,
      highRisk:     all.filter(r => r.fraudScore >= 60).length,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
