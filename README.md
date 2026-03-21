# Draught — Web

Mobile-first React app for **Draught**, sharing the same backend as `draught-fe` (Django API).

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS** — theme: cream `#F0EADA`, active `#EFCA83`, header `#D8A477`
- **Framer Motion** — splash, modals, micro-interactions
- **Zustand** + **Axios** — auth & API (aligned with `draught-fe/src/services/api.ts`)

## Environment (dev / prod)

| File                 | Purpose |
| -------------------- | ------- |
| `.env.development`   | Used by `npm run dev` — default `VITE_API_BASE_URL=/api` + Vite proxy to `localhost:8000` |
| `.env.production`    | Used by `npm run build` — set `VITE_API_BASE_URL` to your **hosted** Django API (e.g. `https://api.example.com/api`) |
| `.env.local`         | Optional overrides (gitignored) |

If `VITE_API_BASE_URL` is empty, the app falls back to `/api` (same-origin or proxy).

## Setup

```bash
cd draught-web
npm install
npm run dev
```

- Run Django on **port 8000** so the Vite proxy can reach `/api`. For production, build with `.env.production` pointing at your deployed backend.

## Gameplay

- **Local 2P** (`/play/local`) and **vs AI** (`/play/ai`) create a game via `POST /api/games/` and open `/play/game/:id`.
- Moves use `POST /api/games/:id/move/`. AI replies use `POST /api/games/:id/ai-move/` (implemented in `draught-be` for REST clients).

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Dev server         |
| `npm run build` | Production build |
| `npm run preview` | Preview build   |

## Routes

- `/` — Splash → `/home`
- `/home`, `/puzzle`, `/train`, `/more` — tab shell (bottom bar mobile, sidebar xl)
- `/play` — Play a game (mirrors RN `play-a-game`)
- `/auth/*` — Get started, login, register
- `/play/local`, `/play/matchmaking`, … — placeholders for game flows

## Assets

See `public/README-assets.md` for optional logos copied from the Expo project.
