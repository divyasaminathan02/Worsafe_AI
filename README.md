# WorkSafe AI — Parametric Insurance Platform

AI-powered parametric insurance for gig delivery workers using IoT real-time data.

---

## Quick Start (VS Code)

### Prerequisites
- Node.js 18+
- MongoDB running locally (default port 27017)
  - Install: https://www.mongodb.com/try/download/community
  - Or use MongoDB Compass and connect to `mongodb://localhost:27017`

---

### Step 1 — Install dependencies

Open **two terminals** in VS Code.

**Terminal 1 (Server):**
```bash
cd server
npm install
```

**Terminal 2 (Client):**
```bash
cd client
npm install
```

---

### Step 2 — Seed demo accounts

In the server terminal:
```bash
cd server
node seed.js
```

This creates:
| Role   | Email              | Password  |
|--------|--------------------|-----------|
| Worker | worker@demo.com    | demo123   |
| Admin  | admin@demo.com     | admin123  |

---

### Step 3 — Start the backend

```bash
cd server
npm run dev
```
Server runs on → http://localhost:5000

---

### Step 4 — Start the frontend

```bash
cd client
npm run dev
```
App runs on → http://localhost:5173

---

### Step 5 — Run IoT Simulator (optional, for live data)

Open a **third terminal**:
```bash
cd server
node iot-simulator.js
```

Sends sensor data every 5 seconds. When thresholds are crossed, claims are auto-triggered.

**Manual scenario testing:**
```bash
node iot-simulator.js "Heavy Rain"
node iot-simulator.js "Storm"
node iot-simulator.js "Hot Day"
node iot-simulator.js "Poor Air"
```

---

## Project Structure

```
Worksafe_AI/
├── client/                  # React + Vite + Tailwind CSS
│   └── src/
│       ├── pages/           # Login, Register, Dashboard, Claims, Sensors, Subscription
│       │   └── admin/       # AdminDashboard
│       ├── components/      # Layout (sidebar + topbar)
│       ├── context/         # AuthContext, SocketContext (Socket.io)
│       └── utils/           # Axios API instance
│
└── server/                  # Node.js + Express
    ├── models/              # User, SensorData, Claim, Subscription
    ├── routes/              # auth, workers, sensors, claims, subscriptions, admin
    ├── middleware/          # JWT auth, admin guard
    ├── utils/               # riskEngine (AI risk scoring + fraud detection)
    ├── seed.js              # Demo data seeder
    └── iot-simulator.js     # IoT device simulator
```

---

## MongoDB Collections

| Collection    | Description                              |
|---------------|------------------------------------------|
| users         | Worker and admin accounts                |
| sensordata    | IoT readings (temp, rain, AQI, wind)     |
| claims        | Auto-triggered insurance claims          |
| subscriptions | Weekly insurance plan subscriptions      |

---

## Features

- JWT authentication (login / register)
- Worker dashboard with earnings, risk level, live sensor data
- Real-time IoT sensor ingestion via REST + Socket.io broadcast
- AI risk engine — rule-based scoring across 4 sensor types
- Auto claim triggering when thresholds exceeded
- Fraud detection — duplicate claims, excessive weekly claims
- Instant payout simulation
- Admin panel — manage users, claims, sensor data
- Live charts (Recharts) for sensor trends and claim stats
- Notification bell with real-time disruption alerts

---

## Risk Thresholds

| Sensor      | High       | Critical    |
|-------------|------------|-------------|
| Temperature | ≥ 38°C     | ≥ 42°C      |
| Rainfall    | ≥ 10 mm/hr | ≥ 25 mm/hr  |
| AQI         | ≥ 150      | ≥ 200       |
| Wind Speed  | ≥ 60 km/h  | ≥ 90 km/h   |
