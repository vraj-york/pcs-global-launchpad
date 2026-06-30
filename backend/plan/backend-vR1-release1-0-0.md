# Backend Plan — DevCity R1 / Release 1.0.0

**Execution mode:** Cloud with server (AWS CloudFormation With Server)  
**Integration UI root:** `development-1/` (Vite React SPA at repo root; no separate `Frontend/` folder)  
**Project:** DevCity — 3D GitHub developer city visualization

## Data Source Inventory

| Source | Entity | Fields | Used by | Mutations |
|--------|--------|--------|---------|-----------|
| `src/data/mockDevelopers.ts` | Developer | id, username, avatarUrl, displayName, bio, location, contributions, repoCount, starCount, followers, joinedDate, topRepos[], achievements[], buildingPosition[2], buildingColor, isOnline, customization? | BuildingInstances, SearchBar, ProfilePanel, ShopModal, App hover | equipItem (customization) |
| `src/data/mockDevelopers.ts` | City stats | CITY_DEV_COUNT (1247) | LiveCounterBadge | read-only |
| `src/data/mockShopItems.ts` | ShopItem | id, name, description, price, category, previewColor?, auraType? | ShopModal | read-only catalog |
| `src/data/mockAchievements.ts` | Achievement | id, name, icon, unlockedAt | AchievementsTab (catalog + per-dev unlocks) | read-only |

**Upload surfaces:** None — no file inputs, avatars use external URLs. **Storage: N/A — no uploads.**

**Auth surfaces:** Shop modal shows "Sign in to claim" placeholder only; no login/signup routes, no OAuth SDK, no protected views. **Auth: N/A — public read API; customization PATCH is open for R1 (no Cognito until claim flow ships).**

## API Contract

Base path: `/api/v1` · JSON · camelCase response keys matching frontend `Developer` type.

| Method | Path | Purpose | Query / Body | Response |
|--------|------|---------|--------------|----------|
| GET | `/api/v1/developers` | List developers for city | `q` (optional search), `limit` (optional, default all) | `{ data: Developer[] }` |
| GET | `/api/v1/developers/:id` | Single developer | — | `{ data: Developer }` or 404 |
| PATCH | `/api/v1/developers/:id/customizations` | Equip shop cosmetics | `{ crown?, aura?, roofEffect? }` | `{ data: DeveloperCustomization }` |
| GET | `/api/v1/city/stats` | Live counter | — | `{ data: { totalDevelopers: number } }` |
| GET | `/api/v1/shop-items` | Shop catalog | — | `{ data: ShopItem[] }` |
| GET | `/api/v1/achievements` | Achievement catalog | — | `{ data: Achievement[] }` |
| GET | `/health` | ALB health check | — | `{ status: "ok" }` |

**Errors:** `{ error: { code, message } }` with HTTP 400/404/500.

**Pagination:** Not required — fixed seed set (~30 displayed, 1247 total stat).

## Database (PostgreSQL / RDS)

- `developers` — core profile + building fields + `customization` JSONB
- `top_repos` — FK `developer_id`, name, stars, language, description
- `achievements` — catalog (id, name, icon)
- `developer_achievements` — developer_id, achievement_id, unlocked_at
- `shop_items` — catalog seed (static)
- `city_stats` — singleton row for `total_developers`

Migrations in `backend/migrations/001_initial.sql`. Seed ports `mockDevelopers`, `SHOP_ITEMS`, `ALL_ACHIEVEMENTS`, `CITY_DEV_COUNT`.

## Shared Utility Layer (`backend/src/utils/`)

config, db pool, logger, errors, response helpers, validation (zod).

## Network (Cloud)

VPC (2 AZ), public subnets (ALB), private subnets (ECS, RDS), NAT, SG chain ALB→ECS→RDS, CORS allowlist from `CORS_ORIGINS` env (CloudFront URL post-deploy).

## Compute

Node.js Express in Docker on ECS Fargate behind ALB.

## Frontend Wire-up

1. Add `src/api/` client reading `VITE_API_BASE_URL`
2. Add `DevelopersProvider` context — replaces direct `mockDevelopers` imports
3. `useCityStore.equipItem` → PATCH customizations API
4. `LiveCounterBadge` → GET city stats
5. Shop/achievements → GET catalog endpoints

## Environment Examples

**`backend/.env.example`:** `PORT`, `NODE_ENV`, `DATABASE_URL`, `CORS_ORIGINS`, `LOG_LEVEL`

**`development-1/.env.example`:** `VITE_API_BASE_URL`

**`backend/parameters.json`:** `EnvironmentName`, `EcrRepositoryUri`, `EcrImageTag`, `VpcCidr`, `ContainerPort`, `DesiredCount`, `CorsOrigins`

**`development-1/parameters.json`:** `CustomDomainName`, `AcmCertificateArn` (optional)

## Unified Deploy Script

Root `deploy.sh`: Phase A ECR push → Phase B backend CFN ∥ Phase C frontend CFN → Phase D build + s3 sync + CloudFront invalidation. `FRONTEND_LAYER_DIR=$ROOT` (UI at repo root).

## Integration Steps

1. Deploy backend stack → run migrations + seed against RDS endpoint
2. Deploy frontend stack → Phase D patches `VITE_API_BASE_URL` from `ApiBaseUrl` output
3. Verify ALB `/api/v1/developers` returns seeded shapes
4. Open CloudFront URL — city loads buildings from API

## Assumptions

- No Cognito until GitHub OAuth claim flow is implemented
- Customization PATCH is unauthenticated for R1 demo equip behavior
- External avatar URLs remain client-side (not stored in S3)

## Backend Components Coverage Report

| Component | Application (planned files) | Infrastructure (planned IaC) |
|-----------|---------------------------|------------------------------|
| Auth | N/A — no auth UI in R1 | N/A — no Cognito |
| Network | `src/app.ts` CORS/helmet/rate-limit; `utils/config.ts` | VPC, subnets, IGW, NAT, ALB, SGs |
| Compute | `src/index.ts`, `src/app.ts`, routes, Dockerfile | ECS cluster, Fargate service, task def, ECR |
| Storage | N/A — no uploads | N/A — no uploads |
| Database | `migrations/`, `seeds/`, `utils/db.ts` | RDS PostgreSQL, DB subnet group |
| Frontend Hosting | Vite build at repo root | S3 + CloudFront in `cloudformation-template.yaml` (repo root) |
