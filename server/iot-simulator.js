/**
 * WorkSafe AI - IoT Sensor Simulator
 * Simulates real-time sensor data from multiple IoT devices
 * Run: node iot-simulator.js
 */

const http = require('http');

const DEVICES = [
  { id: 'DEV-MEL-001', city: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { id: 'DEV-MEL-002', city: 'Melbourne', lat: -37.8200, lng: 144.9800 },
  { id: 'DEV-SYD-001', city: 'Sydney',    lat: -33.8688, lng: 151.2093 },
];

const SCENARIOS = [
  { name: 'Normal',       temp: [18, 28], rain: [0, 2],   aqi: [20, 80],  wind: [5, 20]  },
  { name: 'Hot Day',      temp: [38, 44], rain: [0, 1],   aqi: [80, 130], wind: [10, 30] },
  { name: 'Heavy Rain',   temp: [12, 18], rain: [15, 35], aqi: [30, 60],  wind: [30, 60] },
  { name: 'Storm',        temp: [10, 16], rain: [25, 50], aqi: [50, 100], wind: [70, 110]},
  { name: 'Poor Air',     temp: [22, 30], rain: [0, 1],   aqi: [160, 250],wind: [5, 15]  },
];

function rand(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(1);
}

function generateReading(device, scenario) {
  const s = scenario || SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  return {
    deviceId: device.id,
    location: { city: device.city, lat: device.lat, lng: device.lng },
    temperature: rand(...s.temp),
    rainfall:    rand(...s.rain),
    aqi:         rand(...s.aqi),
    windSpeed:   rand(...s.wind),
    humidity:    rand(30, 90)
  };
}

function sendReading(data) {
  const body = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/sensors/ingest',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        const icon = parsed.anomalyDetected ? '🚨' : '✅';
        console.log(`${icon} [${data.deviceId}] ${data.location.city} | Temp:${data.temperature}°C Rain:${data.rainfall}mm AQI:${data.aqi} Wind:${data.windSpeed}km/h | Risk: ${parsed.riskLevel}`);
      } catch {
        console.log(`📡 [${data.deviceId}] Data sent`);
      }
    });
  });

  req.on('error', (e) => console.error(`❌ Error sending data: ${e.message}`));
  req.write(body);
  req.end();
}

// Simulate a specific scenario (for demo/testing)
function runScenario(scenarioName) {
  const scenario = SCENARIOS.find(s => s.name === scenarioName);
  if (!scenario) { console.log('Unknown scenario'); return; }
  console.log(`\n🎬 Running scenario: ${scenarioName}\n`);
  DEVICES.forEach(device => sendReading(generateReading(device, scenario)));
}

// Normal simulation loop
let tick = 0;
function simulate() {
  tick++;
  // Every 10th tick, trigger a high-risk scenario for demo
  const forceScenario = tick % 10 === 0 ? SCENARIOS[Math.floor(Math.random() * (SCENARIOS.length - 1)) + 1] : null;

  DEVICES.forEach(device => {
    const reading = generateReading(device, forceScenario);
    sendReading(reading);
  });
}

const INTERVAL_MS = 5000; // Send data every 5 seconds
console.log('🌡️  WorkSafe AI IoT Simulator Started');
console.log(`📡 Simulating ${DEVICES.length} devices every ${INTERVAL_MS / 1000}s`);
console.log('Press Ctrl+C to stop\n');

// Send initial batch
simulate();
setInterval(simulate, INTERVAL_MS);

// CLI args for manual scenario testing
const arg = process.argv[2];
if (arg) setTimeout(() => runScenario(arg), 1000);
