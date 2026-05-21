# ---- Pruner: extract only what @gamehub/api needs ----
FROM node:20-alpine AS pruner
RUN npm install -g pnpm@10.33.0 turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @gamehub/api --docker

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
# Build API and all its workspace dependencies (shared, r2-client) in correct order
RUN turbo run build --filter=@gamehub/api

# ---- Production image ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules from builder (has all dependencies already installed)
COPY --from=builder /app/node_modules ./node_modules

# Copy built API and shared packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/r2-client/dist ./packages/r2-client/dist

# Copy package.json files for reference
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/r2-client/package.json ./packages/r2-client/package.json

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
