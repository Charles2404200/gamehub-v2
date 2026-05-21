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
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
RUN printf '#!/bin/sh\nset -e\n: "${PORT:=8080}"\necho "ENTRYPOINT: PORT=$PORT"\nsed -i "s/NGINX_PORT/$PORT/" /etc/nginx/conf.d/default.conf\necho "ENTRYPOINT: nginx config updated, starting nginx"\nexec nginx -g "daemon off;"\n' > /entrypoint.sh && chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
