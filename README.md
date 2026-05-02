# Vanguard Telemetry: Enterprise IoT Fleet Tracking

**Vanguard Telemetry** is an enterprise-grade, high-performance IoT fleet tracking platform. Built with a modern tech stack, it is designed to ingest thousands of GPS telemetry points per second, evaluate them against active geographical perimeters (geofences), and stream live state updates to a glassmorphic command center UI via WebSockets.

## 🚀 Key Capabilities

*   **Real-Time Geofencing Engine:** High-performance, in-memory spatial evaluation using the Ray-Casting algorithm. Determines if an asset is inside or outside a drawn perimeter in sub-milliseconds.
*   **Live WebSockets Streaming:** Real-time push architecture ensures the UI updates instantly without polling the server.
*   **Dynamic Command Center:** A secure, admin-only dashboard where operators can draw, edit, and manage corporate building perimeters directly on an interactive map.
*   **Asset Simulator (Mock Mode):** Includes a built-in IoT simulator that realistically mimics hundreds of fleet vehicles moving along natural road networks, firing webhooks and AMQP messages for local testing without physical hardware.
*   **Security First:** Role-based access control (RBAC), AES-256 encrypted JWTs, API webhook signature verification, and a repository-pattern architecture that safely decouples logic from the persistence layer.
    * *Architecture Note:* The main tracking dashboard is intentionally left public (read-only) for portfolio demonstration purposes to allow frictionless UX. The Command Center (write-access) is strictly locked behind JWT authorization. In a true corporate deployment, the public route would be placed behind an SSO gateway or VPN.
---

## 🏗️ Architecture Stack

### Backend (Node.js & Express)
*   **Language:** TypeScript
*   **Database:** Prisma ORM (SQLite for local dev, easily swappable to PostgreSQL)
*   **Cache:** Redis (In-memory queues and WebSocket state management)
*   **IoT Ingestion:** Webhooks (HMAC secured) & MQTT Protocol support
*   **Real-time Layer:** Socket.io

### Frontend (React & Vite)
*   **Framework:** React 18 + Vite
*   **Styling:** Custom CSS with Glassmorphism UI & Framer Motion animations
*   **Maps:** React-Leaflet with Mapbox/OpenStreetMap tiles
*   **Geofence Drawing:** Leaflet-Geoman for tactile perimeter construction
*   **State Management:** React Context API + Service Pattern Architecture

---

## 🛠️ Local Development Setup

### Prerequisites
*   Node.js (v18+)
*   Redis Server (Running locally on port 6379)
*   *Optional:* A free Mapbox API key for premium map styling.

### 1. Installation

Clone the repository and install dependencies for both the frontend and backend.

```bash
# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

You must configure the `.env` files before running the application.

**Backend Configuration:**
```bash
cd backend
cp .env.example .env
```
*(Optional: Open `backend/.env` and adjust the `JWT_SECRET` or Redis URLs if needed. The defaults are safe for local development).*

**Frontend Configuration:**
```bash
cd frontend
cp .env.example .env
```
*(Optional: Open `frontend/.env` and add `VITE_MAPBOX_TOKEN=your_token_here` for premium maps. If omitted, the app gracefully falls back to OpenStreetMap).*

### 3. Database Initialization (Prisma)

Before running the backend, you must initialize the local SQLite database.

```bash
cd backend
npx prisma db push
```

---

## 🏃‍♂️ Running the Application

The application supports two distinct execution modes depending on your needs.

### Mode A: Mock / Simulation Mode (Recommended for Demos)
This mode boots the application using in-memory databases and spins up a local fleet simulator. It automatically draws dummy geofences and moves simulated cars around the map. **You do not need physical IoT hardware or a running database to use this mode.**

**Start the Backend (Mock):**
```bash
cd backend
npm run dev:mock
```

**Start the Frontend:**
```bash
cd frontend
npm run dev
```

### Mode B: Production / Actual Config Mode
This mode connects to your actual database and expects live telemetry data to be pushed via authenticated Webhooks or an MQTT broker.

**Start the Backend (Production/Live):**
```bash
cd backend
npm run dev
```

**Start the Frontend:**
```bash
cd frontend
npm run dev
```

---

## 📡 Simulating IoT Traffic (Live Mode)

If you are running in "Actual Config" mode, the system expects live data. You can push a test coordinate to the system using a standard cURL webhook request:

```bash
curl -X POST http://localhost:5000/api/live \
  -H "Content-Type: application/json" \
  -H "X-Signature: YOUR_WEBHOOK_SECRET_HMAC" \
  -d '{
    "deviceId": "TEST-TRUCK-01",
    "latitude": 17.44123,
    "longitude": 78.38123,
    "speed": 45
  }'
```
*(Note: If testing via Postman/cURL, ensure you either configure the `WEBHOOK_SECRET` correctly to generate the HMAC signature, or temporarily disable the `verifyWebhookSignature` middleware).*

---

## 🔐 Initial Admin Login

1. Navigate to the login screen.
2. In Mock Mode, use the default credentials:
   * **Administrator ID:** `admin`
   * **Access Protocol (Password):** `admin123`
3. In Actual Mode, you will need to hit the `/api/auth/setup` endpoint once to create your first secure administrator account.

---

## 🎨 UI Customization (White-Labeling)

Vanguard Telemetry is designed to be easily rebranded. You do not need to hunt through React components to change titles. 
Simply open `frontend/src/config/appConfig.js` and update the strings. The entire application (Navbar, Logins, Dashboards) will update instantly.

---

*Built with precision for Enterprise IoT Operations.*
