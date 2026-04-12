# Finora Backend (Node/Express)

This is the API server for Finora.

- **Frontend repo**: `https://github.com/mayjary/finora-frontend`

## Tech

- Node.js + Express
- CORS enabled
- Routes mounted under `/api/*`

## Setup

```bash
cd backend
npm install
```

## Environment variables

Create a `backend/.env` file (do **not** commit it). Typical values you may need:

- `PORT=5001`
- Any API keys used by your routes (Gemini/Supabase, etc.)

## Run

```bash
cd backend
npm start
```

By default the server listens on `http://localhost:5001` (or `PORT`).

## Endpoints (mounted in `server.js`)

- `GET /` → health string (`API running`)
- `GET /api/market/quotes/*`
- `POST /api/ai/chart-analysis/*`
- `POST /api/ai/chart-image-analysis/*`
- `POST /api/ai/dimon` → Dimon chat (Gemini, short replies; body: `{ "messages": [{ "role": "user"|"model", "text": "..." }] }`)
- `POST /api/ai/trade-insights`
- `/api/trades/*`

## Notes for deploying

- Set environment variables on your host (don’t use a committed `.env`).
- Make sure your frontend points to the deployed API base URL and CORS is configured accordingly.

# finora-backend
