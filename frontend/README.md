# Frontend — Real-Time IoT Fleet Dashboard

React + Vite dashboard consuming the backend WebSocket pipeline.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Backend API base URL | `http://localhost:5000` |
| `VITE_SOCKET_URL` | Socket.IO server URL | `http://localhost:5000` |

For production, point both to your deployed backend URL.
