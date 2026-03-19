const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: {
    type: String,
    enum: ['basic', 'standard', 'premium'],
    default: 'basic'
  },
  weeklyPremium: { type: Number, required: true },
  maxPayout: { type: Number, required: true },
  coverageTypes: [String],
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  totalPremiumPaid: { type: Number, default: 0 },
  totalClaimsPaid: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
