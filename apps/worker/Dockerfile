# ---- Base ----
FROM node:20-alpine AS base
RUN npm install -g pnpm@10.33.0
WORKDIR /app

# ---- Install deps ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/r2-client/package.json ./packages/r2-client/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- Build ----
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN pnpm --filter @gamehub/shared build
RUN pnpm --filter @gamehub/r2-client build
RUN pnpm --filter @gamehub/worker build

# ---- Production image ----
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10.33.0
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/r2-client/package.json ./packages/r2-client/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/r2-client/dist ./packages/r2-client/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

CMD ["node", "apps/worker/dist/index.js"]
