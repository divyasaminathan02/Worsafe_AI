const mongoose = require('mongoose');

/**
 * FraudReport — one document per worker, upserted on every analysis run.
 * Stores adversarial defense signals, composite fraud score, and verdict.
 */
const fraudReportSchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  verdict: {
    type: String,
    enum: ['genuine_worker', 'suspicious', 'fraud_risk'],
    default: 'genuine_worker',
  },

  // 0–100 composite score (higher = more suspicious)
  fraudScore: { type: Number, default: 0, min: 0, max: 100 },

  signals: {
    gpsConsistency:    { score: Number, detail: String },
    claimFrequency:    { score: Number, detail: String },
    activityRatio:     { score: Number, detail: String },
    devicePattern:     { score: Number, detail: String },
    timestampValidity: { score: Number, detail: String },
    ipLocationMatch:   { score: Number, detail: String },
  },

  flags: [{
    type:        { type: String },
    severity:    { type: String, enum: ['low', 'medium', 'high'] },
    description: String,
    detectedAt:  { type: Date, default: Date.now },
  }],

  analysisSnapshot: {
    totalClaims:     Number,
    claimsLast7Days: Number,
    totalDeliveries: Number,
    lastClaimCity:   String,
    registeredCity:  String,
    sessionCount:    Number,
  },

  lastAnalyzedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FraudReport', fraudReportSchema);
