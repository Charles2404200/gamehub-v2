# ---- Pruner: extract only what @gamehub/worker needs ----
FROM node:20-alpine AS pruner
RUN npm install -g pnpm@10.33.0 turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @gamehub/worker --docker

# ---- Install deps ----
FROM node:20-alpine AS deps
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- Build ----
FROM deps AS builder
RUN npm install -g turbo@2
COPY --from=pruner /app/out/full/ .
RUN turbo run build --filter=@gamehub/worker

# ---- Production image ----
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10.33.0
WORKDIR /app

ENV NODE_ENV=production

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/r2-client/dist ./packages/r2-client/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

CMD ["node", "apps/worker/dist/index.js"]
