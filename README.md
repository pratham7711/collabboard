# CollabBoard 🎨

A real-time collaborative whiteboard built with React, Fabric.js, and Socket.io.

**Live Demo:** [https://collabboard-phi.vercel.app](https://collabboard-phi.vercel.app)

## Features

- 🎨 **Drawing tools:** Pen, Rectangle, Circle, Line, Text, Eraser, Image upload
- 🔄 **Real-time sync:** All canvas changes instantly broadcast to everyone in the room
- 👥 **User presence:** See who's online with coloured avatars and live cursors
- 🌙 **Dark / Light theme:** Persisted to localStorage, applied to all UI & canvas
- 🎨 **Color picker:** 8 preset colours + custom hex picker for stroke & fill
- 📏 **Pen size slider:** 1–32 px stroke width with live preview
- 📱 **Mobile responsive:** Bottom toolbar, touch drawing, pinch-to-zoom
- ⌨️  **Keyboard shortcuts:** V, P, R, C, L, T, E, Ctrl+Z/Y, Ctrl+A
- 🗺️ **Mini-map** overview panel (desktop)
- 📥 **Download** board as PNG
- 🔗 **Share** via URL with `?board=<id>` parameter

---

## Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  Frontend (Vercel)              │────▶│  Socket Server (Railway/Render)  │
│  React + Fabric.js + Zustand    │◀────│  Node.js + Socket.io             │
│  https://collabboard-phi.…app   │ WS  │  (needs VITE_SOCKET_URL set)     │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the socket server (dev)

```bash
npm run server      # starts on ws://localhost:3001
```

### 3. Start the frontend (dev)

```bash
npm run dev         # Vite dev server with /socket.io proxy to :3001
```

---

## Deployment

### Frontend → Vercel

The project deploys automatically via the Vercel CLI or GitHub integration.

```bash
vercel deploy --prod
```

### Socket Server → Railway (recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/pratham7711/collabboard)

**Manual steps:**

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `pratham7711/collabboard`
3. Railway auto-detects `railway.json` and runs `node server.mjs`
4. In **Variables**, add:
   ```
   CORS_ORIGIN = https://collabboard-phi.vercel.app
   PORT        = (set automatically)
   ```
5. Copy the Railway public URL (e.g. `https://collabboard-server.up.railway.app`)
6. In **Vercel → collabboard → Settings → Environment Variables**, add:
   ```
   VITE_SOCKET_URL = https://collabboard-server.up.railway.app
   ```
7. **Redeploy** the Vercel project for the env var to take effect

### Socket Server → Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/pratham7711/collabboard)

The `render.yaml` in the repo configures the service automatically.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_SOCKET_URL` | Vercel | URL of the deployed socket server (e.g. Railway). Leave empty to use the built-in Vercel serverless fallback (single-node, polling only). |
| `PORT` | Railway/Render | HTTP port for the socket server (auto-set by the platform) |
| `CORS_ORIGIN` | Railway/Render | Allowed frontend origin (e.g. `https://collabboard-phi.vercel.app`) |

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7, Fabric.js 7, Zustand, Framer Motion
- **Realtime:** Socket.io 4 (WebSocket + polling fallback)
- **Deployment:** Vercel (frontend), Railway or Render (socket server)
