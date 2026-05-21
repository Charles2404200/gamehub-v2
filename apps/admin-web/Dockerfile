# ---- Build ----
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @gamehub/shared build
RUN pnpm --filter @gamehub/admin-web exec vite build

# ---- Serve static files ----
FROM nginx:stable-alpine AS runner
COPY --from=builder /app/apps/admin-web/dist /usr/share/nginx/html
COPY apps/admin-web/nginx.conf /etc/nginx/templates/default.conf.template
CMD ["nginx", "-g", "daemon off;"]
