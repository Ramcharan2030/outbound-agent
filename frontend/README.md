# SPXAgent Operations Console

A production-ready frontend console for the SPXAgent Gemini backend.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** (v4 via `@tailwindcss/vite`)
- **TanStack Query** — data fetching & caching
- **react-hot-toast** — feedback notifications
- **react-router-dom** — SPA routing
- **lucide-react** — icons

## Quick Start

```bash
cd frontend
cp .env.example .env
# edit .env and set VITE_API_BASE_URL to your backend address
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend base URL | `http://localhost:8000` |

## Backend Connection

The frontend connects to the backend via `VITE_API_BASE_URL`. During development, Vite proxies `/api` and `/health` requests to the backend automatically.

For production deployment, point `VITE_API_BASE_URL` to the deployed backend and ensure CORS is allowed on the backend.

## Production Build

```bash
npm run build
# Outputs to frontend/dist/
```

Serve the `dist/` directory with any static host (Nginx, Caddy, Vercel, Netlify, etc.).

## Pages

| Route | Description |
|---|---|
| `/` | Overview — stats, recent calls, upcoming appointments, system health |
| `/config` | Configuration — all backend agent settings grouped by category |
| `/logs` | Call Logs — full call history with transcript viewer |
| `/contacts` | Contacts — callers derived from call history |
| `/appointments` | Appointments — full CRUD with scheduling conflict handling |
| `/kb` | Knowledge Base — sources, jobs, search playground, inventory, LeadRat |
| `/calls` | Outbound Calls — single and bulk dispatch with per-number results |

## Project Structure

```
frontend/
├── src/
│   ├── api/           # Typed API client per domain
│   │   ├── client.ts  # Base fetch wrapper + error normalization
│   │   ├── types.ts   # All TypeScript types from backend contract
│   │   ├── config.ts
│   │   ├── logs.ts
│   │   ├── stats.ts
│   │   ├── contacts.ts
│   │   ├── appointments.ts
│   │   ├── kb.ts
│   │   └── calls.ts
│   ├── components/    # Reusable shared components
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── PageHeader.tsx
│   │   ├── StatCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── SecretInput.tsx
│   ├── pages/         # Page-level route components
│   │   ├── Overview.tsx
│   │   ├── Configuration.tsx
│   │   ├── CallLogs.tsx
│   │   ├── Contacts.tsx
│   │   ├── Appointments.tsx
│   │   ├── KnowledgeBase.tsx
│   │   └── OutboundCalls.tsx
│   ├── App.tsx        # Route definitions
│   ├── main.tsx       # Entry point
│   └── index.css      # Design system (CSS custom properties + utilities)
├── .env.example
├── vite.config.ts
└── README.md
```
