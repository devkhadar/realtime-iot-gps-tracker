# 🛰️ Real-Time IoT GPS Tracker

**A production-grade IoT telemetry pipeline — MQTT ingestion + WebSocket push layer for 100s of GPS devices with sub-200ms end-to-end latency.**

Built to handle 100s of concurrent IoT devices with sub-200ms end-to-end latency.

---

## Architecture

```
┌──────────────┐    MQTT     ┌──────────────────┐              ┌──────────────────┐
│  IoT GPS     │────────────►│  MQTT Ingestion   │──validate──►│  Telemetry       │
│  Devices     │  telemetry  │  Layer            │  + enrich   │  Pipeline        │
│  (100s)      │             │  ┌──────────┐     │             │  ┌────────────┐  │
└──────────────┘             │  │ Conn Pool│     │             │  │ Geofence   │  │
                             │  │ (N conns)│     │             │  │ Engine     │  │
       ┌─────────────┐       │  └──────────┘     │             │  └────────────┘  │
       │  HTTP API   │──────►│  ┌──────────┐     │             └────────┬─────────┘
       │  /api/live  │       │  │ Message  │     │                      │
       └─────────────┘       │  │ Buffer   │     │                      ▼
                             │  └──────────┘     │             ┌──────────────────┐
                             └──────────────────┘             │  WebSocket Push   │
                                      │                       │  Layer            │
                                      ▼                       │  ┌────────────┐   │    ws://
                             ┌──────────────────┐             │  │ Room-based │   │◄──────────┐
                             │  Device Registry  │             │  │ Routing    │   │           │
                             │  ┌──────────┐     │             │  └────────────┘   │    ┌──────┴──────┐
                             │  │ Rate     │     │             └──────────────────┘    │  Dashboard  │
                             │  │ Limiter  │     │                      │              │  Clients    │
                             │  └──────────┘     │                      ▼              └─────────────┘
                             └──────────────────┘             ┌──────────────────┐
                                                              │ Async DB Worker  │
                                                              │ ┌──────────────┐ │
                                                              │ │ Prisma ORM   │ │
                                                              │ │ Batch Insert │ │
                                                              │ └──────┬───────┘ │
                                                              └────────┼─────────┘
                                                                       ▼
                                                                  [PostgreSQL]
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Ingestion** | MQTT (Eclipse Mosquitto) | Lightweight pub/sub for IoT devices |
| **Backend** | Node.js + Express | Telemetry processing pipeline |
| **Database**| PostgreSQL + Prisma ORM| Production-grade data persistence |
| **Push Layer** | Socket.IO (WebSockets) | Real-time dashboard delivery |
| **Frontend** | React + Vite + Leaflet | High-performance real-time visualizer dashboard |
| **Geofencing** | Turf.js | In-memory point-in-polygon detection |
| **Logging** | Winston | Structured JSON logging |
| **Containerization** | Docker + Compose | One-command deployment |

## Key Design Decisions

### Why MQTT over HTTP?
MQTT was chosen for its **3-byte minimum header** vs HTTP's ~700 bytes. For battery-constrained GPS devices transmitting every 2 seconds, this reduces bandwidth by **99.5%**. The pub/sub model also means the server never polls — devices push when they have data.

### How Reconnection Works
The system implements **exponential backoff with jitter**:
- Base delay doubles each attempt: 1s → 2s → 4s → 8s → 16s (capped at 30s)
- Random jitter (0-30% of base) prevents [thundering herd](https://en.wikipedia.org/wiki/Thundering_herd_problem) when a broker restarts and 500 devices reconnect simultaneously
- Messages are buffered during outages and drained on reconnect (up to 5,000 messages)

### How Latency Stays Under 200ms
The pipeline achieves sub-200ms end-to-end latency through:
1. **In-memory geofence processing** — Turf.js point-in-polygon runs in <1ms
2. **Asynchronous DB Persistence** — Telemetry data is batched in-memory and flushed to PostgreSQL via Prisma asynchronously. The hot path never waits for a database write.
3. **Connection pooling** — Round-robin across N MQTT connections prevents single-connection bottlenecks
4. **Direct WebSocket piping** — Socket.IO rooms route data to subscribed clients without broadcasting to all

### Rate Limiting
Per-device sliding window rate limiter (10 msg/sec default) prevents any single misbehaving device from overwhelming the pipeline. Throttled messages are logged but not dropped — they're simply not forwarded to downstream processors.

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/devkhadar/realtime-iot-gps-tracker.git
cd realtime-iot-gps-tracker

# Configure environment
cp .env.example .env

# Start everything
docker compose up -d

# Start with 50 simulated devices for testing
docker compose --profile simulate up -d
```

### Option 2: Local Development

```bash
# Prerequisites: Node.js >= 18, MQTT broker running on localhost:1883

npm install
cp .env.example .env
npm run dev

# In another terminal — simulate 100 GPS devices
npm run simulate:100
```

### Verify It's Working

```bash
# Health check
curl http://localhost:5000/health

# Pipeline metrics
curl http://localhost:5000/metrics

# Swagger API docs
open http://localhost:5000/swagger
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | HTTP server port | `5000` |
| `MQTT_BROKER_URL` | MQTT broker connection URL | `mqtt://localhost` |
| `MQTT_PORT` | MQTT broker port | `1883` |
| `MQTT_POOL_SIZE` | Number of pooled MQTT connections | `3` |
| `DEVICE_RATE_LIMIT_PER_SEC` | Max messages per device per second | `10` |
| `DEVICE_OFFLINE_THRESHOLD_MS` | Time before marking device offline | `60000` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Pipeline health + component metrics |
| `GET` | `/metrics` | Detailed pipeline metrics |
| `POST` | `/api/live` | HTTP telemetry ingestion (batch) |
| `GET` | `/api/all-vehicles` | Fetch all registered vehicles |
| `GET` | `/api/geofence` | List all geofences |
| `POST` | `/api/geofence` | Create a geofence |
| `GET` | `/swagger` | Interactive API documentation |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:device` | Client → Server | Subscribe to a specific device's telemetry |
| `subscribe:fleet` | Client → Server | Subscribe to all fleet telemetry |
| `telemetry:update` | Server → Client | Real-time GPS update for subscribed devices |
| `geofence:event` | Server → Client | Geofence entry/exit notification |

## Project Structure

```
├── core/                    # Pipeline core components
│   ├── pipeline.js          # Orchestrator — wires everything together
│   ├── mqtt-ingestion.js    # MQTT connection pool + message handling
│   ├── ws-push-layer.js     # WebSocket room-based push delivery
│   ├── device-registry.js   # Device tracking + rate limiting
│   └── geofence-engine.js   # In-memory geofence processor
├── routes/
│   └── fleet-api/           # REST API endpoints
├── config/
│   ├── geofences.json       # Geofence definitions
│   └── vehicles.json        # Vehicle registry
├── utils/
│   ├── logger.js            # Structured Winston logger
│   └── validation.js        # Payload validation
├── tools/
│   └── device-simulator.js  # Load testing tool
├── mosquitto/               # MQTT broker config
├── docker-compose.yml       # One-command deployment
├── Dockerfile
└── server.js                # Entry point
```

## Load Testing

The included device simulator can generate realistic GPS telemetry:

```bash
# 10 devices (default)
npm run simulate

# 100 devices
npm run simulate:100

# 500 devices
npm run simulate:500

# Custom configuration
node tools/device-simulator.js --devices=200 --interval=1000
```

## License

MIT

---

*Solo built — architecture, backend, deployment. Open source at [github.com/devkhadar/realtime-iot-gps-tracker](https://github.com/devkhadar/realtime-iot-gps-tracker)*
