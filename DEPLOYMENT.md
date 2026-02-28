# CollabBoard Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Production Setup                          │
│                                                                 │
│  Browser ──► Vercel (collabboard-phi.vercel.app)               │
│               └── React frontend (static)                       │
│               └── VITE_SOCKET_URL ──► Railway (socket server)  │
│                                        └── server.mjs           │
│                                            └── in-memory rooms  │
└─────────────────────────────────────────────────────────────────┘
```

## Why Vercel Serverless Doesn't Work for WebSockets

The `api/socket.js` Vercel serverless function is **not reliable for real-time
collaboration**. Here's why:

- Socket.IO's polling transport makes multiple separate HTTP requests per session
- Vercel can route each request to a **different function instance**
- Each instance has its own in-memory state — the session created on instance A
  is unknown to instance B
- Result: `{"code":1,"message":"Session ID unknown"}` → infinite reconnect loop

The app now degrades gracefully: after 5 failed attempts it shows **"Solo mode"**
so you can still draw, just without live collaboration.

---

## Step 1 — Deploy the Socket Server to Railway

Railway gives you a persistent Node.js process — exactly what Socket.IO needs.

### 1a. Sign up / log in

Go to [railway.app](https://railway.app) and sign in with GitHub.

### 1b. Create a new project

1. Click **New Project** → **Deploy from GitHub repo**
2. Select your `collabboard` repository
3. Railway auto-detects `railway.json` and uses `node server.mjs` as the start command

### 1c. Configure environment variables

In the Railway project settings → **Variables**, add:

| Variable | Value |
|---|---|
| `PORT` | *(Railway sets this automatically — leave it blank)* |
| `CORS_ORIGIN` | `https://collabboard-phi.vercel.app` |

> **CORS_ORIGIN** — set this to your Vercel deployment URL. It controls which
> origins are allowed to connect to the WebSocket server.

### 1d. Deploy

Railway will build and deploy automatically on every push to your default branch.
Once deployed, copy the Railway deployment URL — it looks like:
`https://collabboard-server.up.railway.app`

---

## Step 2 — Configure Vercel to Use the Railway Server

### 2a. Add the env var

```bash
vercel env add VITE_SOCKET_URL production
# When prompted, enter: https://your-railway-app.up.railway.app
```

Or via the Vercel dashboard:
**Project → Settings → Environment Variables → Add New**
- Name: `VITE_SOCKET_URL`
- Value: `https://your-railway-app.up.railway.app`
- Environment: Production (and optionally Preview)

### 2b. Redeploy

```bash
cd /path/to/collabboard
vercel --prod
```

Vercel will pick up the new env var and bake `VITE_SOCKET_URL` into the frontend
bundle. After this, the client connects to Railway (WebSocket + polling) instead
of the broken Vercel serverless route.

---

## Local Development

Run two terminals:

```bash
# Terminal 1 — Socket server
npm run server          # starts server.mjs on localhost:3001

# Terminal 2 — Vite dev server
npm run dev             # proxies /socket.io → localhost:3001
```

No `VITE_SOCKET_URL` needed locally — Vite proxies the socket automatically.

---

## Quick Commands

```bash
# Deploy frontend only
vercel --prod

# Check Vercel env vars
vercel env ls

# Add Railway socket URL
vercel env add VITE_SOCKET_URL production

# Deploy socket server via Railway CLI (after railway login)
railway login
railway link      # link to the existing project
railway up        # manual deploy (Railway also auto-deploys on git push)
```

---

## Troubleshooting

### "Solo mode — live collab needs a dedicated server" banner
- `VITE_SOCKET_URL` is not set in Vercel, OR it's pointing to a server that's down
- Follow Step 2 above to configure the Railway URL

### CORS errors in production
- Set `CORS_ORIGIN` in Railway to your exact Vercel URL (no trailing slash)
- Example: `https://collabboard-phi.vercel.app`

### Railway server keeps restarting
- Check Railway logs for errors
- Make sure `PORT` is not hardcoded — `server.mjs` uses `process.env.PORT ?? 3001`

### WebSocket falls back to polling
- This is OK — Socket.IO uses WebSocket first and polling as fallback
- As long as both transports are available, collaboration works

---

## Cost

| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Railway | Starter (free $5 credit/month) | ~$0–$5/mo for light usage |

Railway's free tier covers a small Node.js server with low traffic easily.
