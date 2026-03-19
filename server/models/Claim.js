const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  sensorData: { type: mongoose.Schema.Types.ObjectId, ref: 'SensorData' },
  claimType: {
    type: String,
    enum: ['extreme_heat', 'heavy_rain', 'poor_air_quality', 'storm', 'combined'],
    required: true
  },
  triggerValues: {
    temperature: Number,
    rainfall: Number,
    aqi: Number,
    windSpeed: Number
  },
  status: {
    type: String,
    enum: ['pending', 'auto_approved', 'paid', 'rejected', 'flagged'],
    default: 'pending'
  },
  payoutAmount: { type: Number, default: 0 },
  payoutDate: Date,
  location: {
    city: String,
    lat: Number,
    lng: Number
  },
  fraudFlags: [{
    type: { type: String },
    description: String
  }],
  isAutoTriggered: { type: Boolean, default: true },
  description: String
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
