const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  location: {
    city: { type: String, default: 'Melbourne' },
    lat: Number,
    lng: Number
  },
  temperature: { type: Number, required: true },   // Celsius
  rainfall: { type: Number, required: true },       // mm/hr
  aqi: { type: Number, required: true },            // Air Quality Index
  windSpeed: { type: Number, default: 0 },          // km/h
  humidity: { type: Number, default: 0 },           // %
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  anomalyDetected: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for efficient queries
sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
