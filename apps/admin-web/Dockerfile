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
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/apps/admin-web/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "serve dist --single -l ${PORT:-3000}"]
