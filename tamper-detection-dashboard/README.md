# TPTL Tamper Detection & Prevention Dashboard

A complete MERN-stack IoT tamper detection and prevention dashboard featuring real-time monitoring, anomaly detection, hash-chained event logs, and interactive simulations.

## Tech Stack
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO
- Frontend: React, React Router, TailwindCSS, Axios, Recharts, Socket.IO Client

## Features
- Real-time device monitoring with Socket.IO
- Anomaly detection using Z-score
- Tamper simulations (Physical, Firmware, Calibration, Magnetic, Digital)
- Hash-chained tamper events with verification
- Interactive dashboard and device monitoring pages

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB running locally

### Setup (Automated)
Run the setup script to install dependencies, create env files, and seed the DB:

```bash
bash setup.sh
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:3000`.

### Manual Setup
1. Backend
```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```
2. Frontend
```bash
cd frontend
npm install
npm start
```

## API Overview
- `GET /api/health` – health check
- Devices endpoints under `/api/devices`
- Events endpoints under `/api/events`

See inline route handlers for details.

## Troubleshooting
- Ensure MongoDB is running on the configured URI
- Check CORS config if API calls fail from the frontend
- Inspect server logs and browser console for Socket.IO connection messages

## Deployment
- Set `MONGODB_URI` to your production cluster
- Serve frontend with a static host or build pipeline
- Use a process manager (PM2) and HTTPS termination as needed


