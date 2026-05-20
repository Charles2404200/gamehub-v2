# GameHub

A monorepo containing the GameHub game launcher ecosystem: REST API, Admin web panel, Electron desktop launcher, and background worker.

## Stack

| App/Package | Tech |
|---|---|
| `apps/api` | NestJS + MongoDB + BullMQ |
| `apps/admin-web` | React + Vite + Tailwind (black/red) |
| `apps/launcher-desktop` | Electron + React + electron-updater |
| `apps/worker` | BullMQ workers |
| `packages/shared` | TypeScript types (shared across all) |
| `packages/r2-client` | Cloudflare R2 wrapper (AWS SDK v3) |
| `packages/installer` | Patch installer (Node built-ins only) |

## Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Cloudflare R2 bucket

## Local Development

```bash
# Install all dependencies
pnpm install

# Copy env files and fill in your values
cp apps/api/.env.example apps/api/.env
cp apps/admin-web/.env.example apps/admin-web/.env
cp apps/launcher-desktop/.env.example apps/launcher-desktop/.env
cp apps/worker/.env.example apps/worker/.env

# Generate admin password hash (run once)
node -e "const b=require('bcryptjs');console.log(b.hashSync('yourpassword',10))"
# Paste the output into ADMIN_PASSWORD_HASH in apps/api/.env

# Start everything in dev mode
pnpm dev

# Or start individual apps
pnpm --filter @gamehub/api dev
pnpm --filter @gamehub/admin-web dev
pnpm --filter @gamehub/launcher-desktop dev
pnpm --filter @gamehub/worker dev
```

## Building

```bash
pnpm build
```

## Railway Deployment

1. Create 3 Railway services: `api`, `admin-web`, `worker`
2. Set root directory for each service in Railway settings
3. Set environment variables (see `.env.example` files)
4. The API auto-migrates Mongoose schemas on startup — no manual migrations needed

## Launcher Release Workflow

1. Upload installer artifacts via Admin Web → Launcher page
2. Tag the release: `git tag launcher-v1.2.3 && git push --tags`
3. GitHub Actions builds and uploads to R2
4. Publish the release in Admin Web (sets `status: PUBLISHED`)
5. Running launchers will auto-update based on `minSupportedVersion` and `forceUpdate` flags

## Security Notes

- Admin credentials never leave the backend
- R2 credentials never exposed to frontend (presigned URLs only)
- Electron renderer has `nodeIntegration: false` + `contextIsolation: true`
- All launcher filesystem ops go through IPC to the main process
- Installer validates all paths to prevent directory traversal
