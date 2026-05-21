# ---- Build ----
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @gamehub/shared build
RUN pnpm --filter @gamehub/admin-web exec vite build

# ---- Serve static files ----
FROM node:20-alpine AS runner
RUN npm install -g http-server
WORKDIR /app
COPY --from=builder /app/apps/admin-web/dist ./dist
CMD ["sh", "-c", "http-server dist -p ${PORT:-3000} -d false --spa -c-1"]
