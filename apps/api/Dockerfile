# ---- Base ----
FROM node:20-alpine AS base
RUN npm install -g pnpm@10.33.0
WORKDIR /app

# ---- Install deps ----
FROM base AS deps
# Copy manifests needed for pnpm to resolve workspace deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/r2-client/package.json ./packages/r2-client/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- Build shared packages ----
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY turbo.json ./

# Build workspace deps first
RUN pnpm --filter @gamehub/shared build
RUN pnpm --filter @gamehub/r2-client build

# Build API
RUN pnpm --filter @gamehub/api build

# ---- Production image ----
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10.33.0
WORKDIR /app

ENV NODE_ENV=production

# Copy manifests for production install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/r2-client/package.json ./packages/r2-client/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/r2-client/dist ./packages/r2-client/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
