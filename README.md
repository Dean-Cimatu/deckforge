# DeckForge

Turn any lecture, slide deck, or PDF into flashcards you'll actually remember.

## Local development

**Prerequisites:** Docker Desktop, Node 20, pnpm 9+

```bash
# 1. Clone and enter the repo
git clone https://github.com/Dean-Cimatu/deckforge.git
cd deckforge

# 2. Copy the example env and fill in your keys
cp .env.example .env
# Required: ANTHROPIC_API_KEY
# JWT_SECRET defaults to a dev value — change it before deploying

# 3. Start everything (Mongo + API + Web)
docker compose up

# 4. Open http://localhost:5173
```

The API is also reachable at `http://localhost:3000` (e.g. `curl http://localhost:3000/health`).

## Without Docker (faster iteration)

```bash
pnpm install
pnpm --filter @deckforge/shared build

# Terminal 1 — API (needs local MongoDB on :27017)
pnpm dev:api

# Terminal 2 — Web
pnpm dev:web
```

## Running checks

```bash
pnpm --recursive typecheck
pnpm --recursive lint
pnpm --recursive test
```

## Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Frontend | React 18, Vite, Tailwind, shadcn  |
| Backend  | Express 4, TypeScript, MongoDB    |
| AI       | Anthropic Claude (Haiku)          |
| Auth     | JWT, httpOnly cookies             |
| Deploy   | Render (API + static), Docker     |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for what's planned after v1.
