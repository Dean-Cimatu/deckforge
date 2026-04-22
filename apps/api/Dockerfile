# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copy workspace manifests first so layer is cached until deps change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared types first, then bundle API into a single file
RUN pnpm --filter @deckforge/shared build
RUN pnpm --filter @deckforge/api build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy all workspace manifests so pnpm can resolve the full workspace
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

# Install production deps — pnpm installs api deps under apps/api/node_modules
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy the bundle into the api package dir so Node resolves deps from there
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run from apps/api so Node walks up to apps/api/node_modules for external deps
WORKDIR /app/apps/api
CMD ["node", "dist/index.cjs"]
