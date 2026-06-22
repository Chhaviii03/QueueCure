# Queue Cure

Live digital queue manager for a neighbourhood clinic. **React** frontend + Express/MongoDB/Socket.io backend.

## Quick start

```bash
npm install
npm run build    # build React app
npm start        # serve on http://localhost:3000
```

**Development** (hot reload + API):

```bash
npm run dev      # Express :3000 + Vite :5173
```

Open during dev:
- Receptionist: http://localhost:5173/receptionist
- Patient phone: http://localhost:5173/display?token=1

Production (after `npm start`):
- Receptionist: http://localhost:3000/receptionist
- Patient phone: http://localhost:3000/display?token=1

## Stack

| Layer | Tech |
|-------|------|
| Frontend | **React 19** + Vite + React Router |
| Real-time | Socket.io (client + server) |
| Backend | Express.js |
| Database | MongoDB (in-memory fallback if unavailable) |

## Project structure

```
client/src/
  pages/Receptionist.jsx   — receptionist desk
  pages/Display.jsx        — patient waiting room
  hooks/useSocket.js       — live queue + patient subscriptions
server.js                  — API + WebSocket + serves React build
services/queueService.js   — queue logic + wait time calculation
```

## Demo flow

1. Open receptionist and patient display side by side.
2. Issue token #3 — patient sees "2 ahead, ~20 min."
3. Click **Call next** twice — patient's React screen updates instantly with no refresh.

That live drop in wait time is the moment a clinic owner says *"I want this."*
