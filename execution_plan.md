Bạn là senior full-stack architect + senior Electron developer. Hãy xây dựng cho tôi một hệ thống GameHub Launcher chuẩn enterprise để tôi upload và phát hành các bản patch Việt hóa game.

Mục tiêu sản phẩm:
Tôi muốn có một nền tảng gồm:
1. Admin Panel để quản lý game, upload ảnh, thêm link demo YouTube, tạo patch, upload patch Việt hóa, publish patch, update patch mới và thay thế patch cũ.
2. Desktop Launcher cho người dùng cuối. Ai cũng có thể tải và mở launcher, không cần đăng ký, không cần đăng nhập.
3. Server/API deploy trên Railway.
4. File storage dùng Cloudflare R2.
5. Database dùng MongoDB.
6. Có hệ thống update patch mới cho từng game, cho phép patch mới ghi đè patch cũ khi người dùng cài/update.
7. Có hệ thống auto-update launcher. Khi tôi upload launcher version mới, launcher cũ phải hiện thông báo bắt buộc cập nhật. Người dùng bấm Update thì launcher tự tải bản mới và setup đè lên version cũ.

QUAN TRỌNG VỀ AUTH:
- Không có hệ thống user.
- Không có register.
- Không có user profile.
- Không có role ADMIN/STAFF.
- Launcher public hoàn toàn, ai cũng mở được.
- Admin Panel chỉ cần một lớp bảo vệ đơn giản bằng credential hardcoded trong backend env.
- Admin credential phải nằm ở API env trên Railway, không được nằm trong frontend VITE env.
- Không tạo collection users.
- Không tạo user management.
- Không tạo role-based access control.
- Admin login chỉ so sánh với ADMIN_USERNAME và ADMIN_PASSWORD hoặc ADMIN_PASSWORD_HASH trong env backend.
- Sau khi admin login thành công, backend có thể trả về admin token/session đơn giản để gọi admin API.

Tech stack bắt buộc:
- Admin Web: ReactJS + TypeScript + Vite
- Desktop Launcher: Electron + ReactJS + TypeScript
- Backend API: NestJS + TypeScript
- Database: MongoDB + Mongoose
- Storage: Cloudflare R2, dùng S3-compatible API
- Queue/cache: Redis + BullMQ nếu cần
- Deploy: Railway
- Package manager: pnpm workspace
- Monorepo architecture
- Auto update Electron: electron-builder + electron-updater
- Validation: Zod hoặc class-validator
- Logging: structured logs
- Code style: enterprise, modular, scalable, maintainable

Nguyên tắc quan trọng:
Không được upload file patch lớn đi xuyên qua Railway API. API chỉ tạo upload session và presigned URL. Admin client upload file trực tiếp lên Cloudflare R2. API chỉ lưu metadata vào MongoDB.

Monorepo structure:

gamehub/
├─ apps/
│  ├─ admin-web/
│  ├─ launcher-desktop/
│  ├─ api/
│  └─ worker/
├─ packages/
│  ├─ shared/
│  ├─ ui/
│  ├─ r2-client/
│  └─ installer/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ README.md

Giải thích:
- apps/admin-web: giao diện admin để tạo game, upload ảnh, upload patch, publish patch, quản lý launcher release.
- apps/launcher-desktop: Electron launcher public cho người dùng cuối.
- apps/api: NestJS API deploy Railway.
- apps/worker: background worker xử lý xóa R2 object, verify upload, cleanup, job retry.
- packages/shared: shared TypeScript types, DTO, schemas.
- packages/ui: shared UI components nếu cần.
- packages/r2-client: helper upload/delete/list object R2.
- packages/installer: logic cài patch, verify hash, copy file, overwrite file.

PHASE 1 — Project setup

Setup monorepo bằng pnpm workspace.

Yêu cầu:
1. Tạo root package.json.
2. Tạo pnpm-workspace.yaml.
3. Tạo turbo.json để chạy build/dev/lint.
4. Tạo apps/api NestJS project.
5. Tạo apps/admin-web React Vite TypeScript project.
6. Tạo apps/launcher-desktop Electron + React + TypeScript project.
7. Tạo apps/worker TypeScript project.
8. Tạo packages/shared để chứa common types.
9. Tạo packages/r2-client để chứa R2 helper.
10. Tạo packages/installer để chứa patch install logic.

Root scripts:
- pnpm dev
- pnpm build
- pnpm lint
- pnpm typecheck

Env API:
MONGODB_URI=
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=
REDIS_URL=
ADMIN_ORIGIN=
LAUNCHER_UPDATE_BASE_URL=
FORCE_UPDATE_ENABLED=true
MIN_SUPPORTED_LAUNCHER_VERSION=
LATEST_LAUNCHER_VERSION=

Env admin-web:
VITE_API_BASE_URL=

Env launcher:
VITE_API_BASE_URL=
VITE_UPDATE_BASE_URL=

Lưu ý:
- ADMIN_USERNAME và ADMIN_PASSWORD_HASH chỉ nằm trong backend env.
- Không bao giờ đưa admin password vào frontend env.
- Không tạo User model.
- Không tạo users collection.

PHASE 2 — MongoDB database design

Dùng MongoDB + Mongoose. Không tạo users collection.

Tạo các collection sau:

1. Game

Fields:
- slug
- title
- description
- status: DRAFT | ACTIVE | DELETING | DELETED
- executableNames: string[]
- installPathHints: string[]
- coverImage: { key, url }
- bannerImage: { key, url }
- youtubeDemoUrl
- latestPatchVersionId
- createdAt
- updatedAt
- deletedAt

Indexes:
- unique slug
- status + updatedAt

2. PatchVersion

Fields:
- gameId
- version
- title
- changelog
- status: DRAFT | UPLOADING | PROCESSING | PUBLISHED | FAILED | ARCHIVED | REPLACED
- mode: NEW_VERSION | REPLACE_EXISTING
- r2Prefix
- manifestKey
- totalSize
- fileCount
- publishedAt
- replacedPatchVersionId
- createdAt
- updatedAt

Indexes:
- gameId + version
- gameId + status + createdAt

3. PatchFile

Fields:
- patchVersionId
- gameId
- relativePath
- r2Key
- size
- sha256
- contentType
- createdAt

Indexes:
- patchVersionId + relativePath unique
- gameId

4. UploadSession

Fields:
- gameId
- patchVersionId
- status: CREATED | UPLOADING | COMPLETED | EXPIRED | FAILED
- totalFiles
- uploadedFiles
- totalSize
- uploadedSize
- expiresAt
- createdAt
- updatedAt

Use TTL index trên expiresAt.

5. AuditLog

Fields:
- action: ADMIN_LOGIN | CREATE_GAME | UPDATE_GAME | DELETE_GAME | CREATE_PATCH | UPLOAD_PATCH | PUBLISH_PATCH | REPLACE_PATCH | FORCE_UPDATE_LAUNCHER | DELETE_R2_OBJECTS
- entityType: GAME | PATCH_VERSION | LAUNCHER | SYSTEM
- entityId
- metadata
- ipAddress
- userAgent
- createdAt

Không cần userId vì không có users.

6. DownloadEvent

Fields:
- gameId
- patchVersionId
- launcherVersion
- ipHash
- createdAt

7. InstallReport

Fields:
- gameId
- patchVersionId
- launcherVersion
- status: SUCCESS | FAILED
- errorMessage
- createdAt

8. LauncherRelease

Fields:
- version
- platform: win32 | darwin | linux
- status: DRAFT | PUBLISHED
- forceUpdate: boolean
- minSupportedVersion
- releaseNotes
- updateBaseUrl
- artifactKeys
- publishedAt
- createdAt
- updatedAt

PHASE 3 — Backend API architecture

Dùng NestJS modules:
- AdminSessionModule
- GamesModule
- PatchVersionsModule
- UploadSessionsModule
- R2Module
- LauncherModule
- LauncherReleasesModule
- AuditLogsModule
- QueueModule
- HealthModule

Admin session logic:
- POST /admin/login nhận username/password.
- So sánh username với ADMIN_USERNAME.
- So sánh password với ADMIN_PASSWORD_HASH bằng bcrypt hoặc argon2.
- Nếu đúng, tạo admin session token hoặc signed token bằng ADMIN_SESSION_SECRET.
- Admin token chỉ dùng để gọi admin API.
- Không có user database.
- Không có refresh token.
- Không có register.
- Không có role.
- Có middleware/guard đơn giản để bảo vệ /admin/* routes.
- Public launcher routes không cần token.

Admin API endpoints:

Admin session:
POST /admin/login
POST /admin/logout
GET /admin/session

Games:
GET /admin/games
POST /admin/games
GET /admin/games/:id
PATCH /admin/games/:id
DELETE /admin/games/:id

Game media:
POST /admin/games/:id/cover/presign
POST /admin/games/:id/banner/presign
PATCH /admin/games/:id/media

Patch:
GET /admin/games/:gameId/patches
POST /admin/games/:gameId/patches
GET /admin/patches/:patchVersionId
PATCH /admin/patches/:patchVersionId
POST /admin/patches/:patchVersionId/upload-session
POST /admin/patches/:patchVersionId/presign-files
POST /admin/patches/:patchVersionId/complete-upload
POST /admin/patches/:patchVersionId/publish
POST /admin/patches/:patchVersionId/replace-latest
DELETE /admin/patches/:patchVersionId

Launcher release:
GET /admin/launcher/releases
POST /admin/launcher/releases
POST /admin/launcher/releases/:id/publish
POST /admin/launcher/releases/:id/force-update
POST /admin/launcher/releases/:id/presign-artifacts

Public launcher API:
GET /launcher/config
GET /launcher/games
GET /launcher/games/:slug
GET /launcher/games/:slug/latest
GET /launcher/patches/:patchVersionId/manifest
POST /launcher/download-events
POST /launcher/install-report

Health:
GET /health

PHASE 4 — Cloudflare R2 storage design

Dùng object key format:

Game images:
games/{gameId}/cover/cover.webp
games/{gameId}/banner/banner.webp

Patch files:
games/{gameId}/versions/{patchVersionId}/files/{relativePath}

Patch manifest:
games/{gameId}/versions/{patchVersionId}/manifest.json

Launcher updates:
launcher-updates/win/latest.yml
launcher-updates/win/GameHub-Setup-{version}.exe
launcher-updates/win/GameHub-Setup-{version}.exe.blockmap

launcher-updates/mac/latest-mac.yml
launcher-updates/mac/GameHub-{version}.dmg

launcher-updates/linux/latest-linux.yml
launcher-updates/linux/GameHub-{version}.AppImage

Yêu cầu R2:
- Không expose R2 secret ra frontend.
- API tạo presigned PUT URL.
- Admin client upload trực tiếp lên R2.
- Worker có quyền list/delete object theo prefix.
- Khi xóa game, xóa toàn bộ prefix games/{gameId}/.
- Khi replace patch, xóa prefix patch cũ nếu admin chọn “delete old patch files”.
- Dùng R2 public custom domain cho download production.

PHASE 5 — Admin Panel requirements

Admin panel phải có các màn hình:

1. Admin Login page
- Chỉ có username/password.
- Không có register.
- Không có forgot password.
- Không có user profile.
- Login gọi POST /admin/login.
- Sau khi login, lưu admin session token.
- Token dùng để gọi admin routes.

2. Dashboard
- Tổng số game.
- Tổng số patch.
- Patch mới nhất.
- Launcher version hiện tại.
- Trạng thái force update.

3. Games page
- List game.
- Search/filter.
- Create game.
- Edit game.
- Delete game.
- Status badge.

4. Create/Edit Game
Fields:
- Title
- Slug
- Description
- Executable names
- Install path hints
- Cover image upload
- Banner image upload
- YouTube demo URL
- Status

5. Patch Versions page
Cho từng game:
- List patch versions.
- Version.
- Changelog.
- Status.
- Total size.
- File count.
- Published date.
- Button: Create New Patch Version.
- Button: Replace Latest Patch.
- Button: Publish.
- Button: Archive/Delete.

6. Upload Patch UI

Admin chọn folder cha, ví dụ folder “Patch_A”.
Web phải upload toàn bộ file bên trong folder đó và giữ relative path.

Flow:
- Admin chọn game.
- Admin chọn “Create New Patch Version” hoặc “Replace Latest Patch”.
- Admin nhập version, title, changelog.
- Admin chọn parent folder.
- App scan toàn bộ file trong folder.
- Tính relativePath cho từng file.
- Tính size.
- Tính SHA-256 từng file ở client.
- Hiển thị preview file tree.
- Gửi metadata lên API.
- API tạo upload session.
- API trả presigned URL.
- Admin web upload trực tiếp lên R2.
- Hiển thị progress từng file và total progress.
- Khi upload xong, gọi complete-upload.
- API/worker verify metadata.
- Tạo manifest.json.
- Cho admin bấm Publish.

7. Replace Latest Patch behavior

Phải có option:

A. Create New Version:
- Tạo patch version mới.
- Publish xong thì game.latestPatchVersionId trỏ sang version mới.
- Patch cũ có thể chuyển ARCHIVED hoặc vẫn giữ PUBLISHED nhưng không còn latest.

B. Replace Latest Patch:
- Dùng khi tôi muốn update patch mới và ghi đè patch cũ của game.
- Admin chọn folder patch mới.
- Hệ thống tạo patch version mới với mode REPLACE_EXISTING.
- Khi publish:
  - Version mới trở thành latestPatchVersionId.
  - Patch cũ chuyển status REPLACED.
  - Launcher người dùng khi mở app sẽ thấy game có patch mới.
  - Khi cài/update, launcher copy file mới đè lên file cũ trong thư mục game.
  - Có option “delete old R2 files after replace”.
  - Nếu bật option này, worker xóa prefix R2 của patch cũ sau khi patch mới publish thành công.

Không được xóa patch cũ trước khi patch mới upload và publish thành công.

PHASE 6 — Patch manifest design

Mỗi patch version phải có manifest.json trên R2 và metadata trong MongoDB.

Manifest format:

{
  "schemaVersion": 1,
  "gameId": "...",
  "gameSlug": "...",
  "patchVersionId": "...",
  "version": "1.0.0",
  "mode": "NEW_VERSION or REPLACE_EXISTING",
  "title": "Vietnamese Patch v1.0.0",
  "changelog": "...",
  "totalSize": 123456789,
  "fileCount": 100,
  "createdAt": "...",
  "publishedAt": "...",
  "files": [
    {
      "relativePath": "data/localization/vietnamese.pak",
      "url": "https://cdn.domain.com/games/{gameId}/versions/{patchVersionId}/files/data/localization/vietnamese.pak",
      "r2Key": "...",
      "size": 123456,
      "sha256": "...",
      "overwrite": true
    }
  ],
  "install": {
    "strategy": "COPY_OVERWRITE",
    "requiresBackup": true
  }
}

Yêu cầu:
- Launcher tải manifest trước khi cài.
- Launcher verify từng file bằng SHA-256 sau khi download.
- Launcher copy file vào game path theo relativePath.
- Nếu file đã tồn tại thì ghi đè.
- Trước khi ghi đè, nếu requiresBackup = true thì backup file cũ vào thư mục backup local.
- Sau khi cài xong, ghi install receipt.

PHASE 7 — Launcher Desktop requirements

Launcher dùng Electron + React + TypeScript.

Không có login trong launcher.
Không có user account trong launcher.
Không có register trong launcher.
Ai tải launcher về cũng dùng được.

Màn hình:
1. Splash/loading
2. Force update modal
3. Home/game list
4. Game detail
5. Select game folder
6. Install patch
7. Update patch
8. Install progress
9. Logs/settings

Launcher flow:
1. App start.
2. Gọi GET /launcher/config.
3. Kiểm tra launcher version hiện tại.
4. Nếu server báo forceUpdate = true và currentVersion < minSupportedVersion:
   - Hiển thị blocking modal.
   - Không cho dùng app.
   - Nội dung: “A new launcher version is required. Please update to continue.”
   - Button: Update Now.
   - Khi bấm Update Now:
     - Gọi electron-updater download update.
     - Hiển thị progress.
     - Sau khi download xong, gọi quitAndInstall.
     - Installer chạy và setup đè bản mới.
5. Nếu không cần force update:
   - Load game list.
   - User chọn game.
   - User chọn thư mục game.
   - Launcher validate path bằng executableNames/installPathHints.
   - Fetch latest patch.
   - Nếu chưa cài patch: hiển thị Install.
   - Nếu đã cài patch version cũ: hiển thị Update Patch.
   - Nếu đã mới nhất: hiển thị Installed / Reinstall option.

Install/update patch logic:
- Download manifest.
- Download files vào temp cache.
- Verify SHA-256.
- Backup file cũ nếu tồn tại.
- Copy file mới vào game folder.
- Overwrite file cũ.
- Save install receipt.

Local install receipt:
{
  "gameId": "...",
  "gameSlug": "...",
  "installedPatchVersionId": "...",
  "installedVersion": "1.0.0",
  "gamePath": "D:/SteamLibrary/steamapps/common/...",
  "installedAt": "...",
  "files": [
    {
      "relativePath": "...",
      "sha256": "...",
      "installedPath": "..."
    }
  ]
}

Launcher security:
- Không bật Node integration trong renderer.
- Filesystem operations phải nằm trong main process.
- Renderer gọi main process qua secure IPC.
- Validate relativePath để chặn path traversal như ../.
- Không cho ghi file ngoài selected game directory.
- Log lỗi rõ ràng.

PHASE 8 — Launcher auto-update force update

Yêu cầu bắt buộc:
Mỗi lần tôi upload launcher version mới, launcher cũ phải hiện thông báo force update. User phải bấm Update để app tải bản mới và setup đè lên bản cũ.

Implementation:
1. Tạo collection LauncherRelease.
2. Admin panel có màn Launcher Releases.
3. Admin upload artifact:
   - latest.yml
   - setup exe
   - blockmap
4. Upload artifact lên R2 prefix:
   launcher-updates/win/
5. Admin bấm Publish Release.
6. Server set:
   - latestLauncherVersion = new version
   - minSupportedLauncherVersion = new version
   - forceUpdate = true
7. Launcher khi start gọi /launcher/config.
8. Nếu app.getVersion() < minSupportedLauncherVersion:
   - Show force update modal.
   - Disable rest of app.
   - Button Update Now gọi electron-updater.
9. electron-updater tải bản mới từ R2 update URL.
10. Sau download, app gọi quitAndInstall.

Electron-builder config:
- Use generic provider.
- provider: generic
- url: https://cdn.domain.com/launcher-updates/win/
- Generate latest.yml.
- Upload latest.yml, .exe, .blockmap lên R2.
- CI/CD nên build release bằng GitHub Actions.

Yêu cầu UI force update:
- Không cho skip.
- Không cho close modal.
- Có progress bar.
- Có trạng thái:
  - Checking update
  - Downloading update
  - Update downloaded
  - Installing
  - Error, retry button
- Nếu update lỗi, cho Retry hoặc Open Download Page nếu có.

PHASE 9 — Worker requirements

Worker dùng BullMQ + Redis nếu Redis có sẵn.

Jobs:

1. delete-game-r2-prefix
Input:
- gameId
- r2Prefix = games/{gameId}/

Logic:
- List all R2 objects under prefix.
- Delete in batches.
- Update game status to DELETED.
- Write audit log.

2. delete-patch-r2-prefix
Input:
- patchVersionId
- r2Prefix

Logic:
- Delete patch files after replace/archive if requested.
- Do not delete latest active patch.

3. verify-upload
Input:
- patchVersionId

Logic:
- Compare MongoDB PatchFile metadata with R2 object existence.
- Mark patch PROCESSING/PUBLISHED-ready.

4. cleanup-expired-upload-sessions

Logic:
- Find expired upload sessions.
- Mark EXPIRED.
- Delete incomplete R2 files if needed.

PHASE 10 — Railway deployment

Deploy services:
1. gamehub-api
2. gamehub-worker
3. gamehub-admin-web
4. Redis nếu cần
5. MongoDB Atlas external connection

Railway variables for API:
MONGODB_URI=
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=
REDIS_URL=
ADMIN_ORIGIN=
LAUNCHER_UPDATE_BASE_URL=
FORCE_UPDATE_ENABLED=true
MIN_SUPPORTED_LAUNCHER_VERSION=
LATEST_LAUNCHER_VERSION=

Railway variables for worker:
MONGODB_URI=
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
REDIS_URL=

Railway variables for admin:
VITE_API_BASE_URL=

Requirements:
- API must expose /health.
- Worker must log job success/failure.
- Admin web must call API URL from env.
- CORS only allow admin origin for admin routes.
- Public launcher routes can be public.
- Secrets must never be committed.

PHASE 11 — Error handling and enterprise quality

Implement:
- Centralized error handling.
- Request validation.
- DTO schemas.
- Audit logging for admin actions.
- Rate limit admin login.
- Upload retry.
- R2 upload failure retry in frontend.
- Worker retry with exponential backoff.
- Structured logger.
- Clear user-facing error messages.
- README with setup steps.
- .env.example for all services.
- Script to generate ADMIN_PASSWORD_HASH.

Security requirements:
- No user auth.
- No user database.
- No user roles.
- Admin credential only from backend env.
- Hash admin password in env.
- Protect /admin/* routes with admin session guard.
- Public /launcher/* routes require no auth.
- Validate YouTube URL.
- Validate file paths.
- Prevent path traversal.
- Never expose R2 credentials.
- Use presigned URLs.
- Sanitize slug.

PHASE 12 — Deliverables

Please generate:
1. Full monorepo structure.
2. All package.json files.
3. NestJS API code.
4. Mongoose schemas.
5. Admin session/login module using env credential.
6. Game CRUD module.
7. Patch upload module.
8. R2 presigned URL module.
9. Worker module.
10. Admin React pages.
11. Electron launcher app.
12. Secure IPC filesystem installer.
13. Patch install/update/overwrite logic.
14. Auto-update launcher logic with force update modal.
15. Electron-builder config.
16. GitHub Actions workflow for building launcher and uploading artifacts to R2.
17. Railway deployment guide.
18. README with local dev and production deploy instructions.
19. Testing checklist.

Important implementation priority:
Do not try to finish everything in one messy file. Build phase by phase:
- First scaffold monorepo.
- Then backend schemas/API.
- Then simple admin login from env.
- Then R2 upload flow.
- Then admin UI.
- Then launcher install patch.
- Then patch update/overwrite.
- Then auto-update launcher.
- Then worker cleanup.
- Then deploy docs.

Expected final behavior:

Admin:
- Open admin panel.
- Login with env-based admin credential.
- Create game.
- Upload cover/banner.
- Add YouTube demo URL.
- Create patch version.
- Select parent folder containing patch files.
- Upload entire folder structure to R2.
- Publish patch.
- Replace latest patch if needed.
- Delete game and automatically delete its R2 patch files.
- Upload launcher release.
- Enable force update.

Launcher user:
- Download launcher.
- Open launcher without login.
- If launcher version is old, forced update appears.
- User clicks Update.
- Launcher downloads new installer and installs over old version.
- After update, launcher opens normally.
- User selects game.
- User selects local game folder.
- Launcher installs patch.
- If new patch exists, launcher shows Update Patch.
- Update Patch downloads new patch and overwrites old patch files safely.