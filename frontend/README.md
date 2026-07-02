# BSP Blueprint — Frontend

Technical reference for the BSP Blueprint web application (`BSP-WEB`): a React SPA for behavioral assessment, multi-tenant administration, billing, and AI-assisted coaching.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Build | Vite 7 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| UI primitives | Radix UI + shadcn/ui (radix-vega style) |
| State | Zustand (with `persist` where needed) |
| Forms | React Hook Form + Yup (`@hookform/resolvers`) |
| Routing | React Router DOM 7 |
| HTTP | Axios (`src/lib/apiClient.ts`) |
| Auth | AWS Amplify v6 (Cognito User Pools) |
| Charts | ECharts |
| PDF | react-pdf |
| Toasts | Sonner |
| Icons | Lucide React |
| Analytics | PostHog |
| Error tracking | Sentry (`@sentry/react`) |
| Lint / format | Biome |
| Component docs | Storybook 10 |
| Unit tests | Vitest 4 |
| Design tokens | Tokens Studio JSON → Style Dictionary (`build-tokens.mjs`) |

Package manager: **pnpm only**.

## Application Domains

The frontend is organized around these product areas:

| Domain | Route prefix (`ROUTES`) | Description |
|--------|-------------------------|-------------|
| Auth & onboarding | `ROUTES.auth.*` | Login, password reset, end-user onboarding |
| Dashboard | `ROUTES.dashboard` | Role-specific dashboards (super admin, corporation admin, company admin, end user) |
| Corporation directory | `ROUTES.corporateDirectory` | Corporation CRUD, quick/advanced setup |
| Company directory | `ROUTES.companyDirectory` | Company CRUD under corporations |
| User directory | `ROUTES.userDirectory` | Users, contacts, invites |
| Assessment | `ROUTES.assessment` | Take assessment, view/print report results |
| Assessments directory | `ROUTES.assessments` | Admin list of assessments |
| Invite management | `ROUTES.inviteManagement` | Send assessment invites |
| Roles & permissions | `ROUTES.roles` | RBAC role configuration |
| Finance — invoices | `ROUTES.finance.invoices` | Invoice management |
| Finance — billing | `ROUTES.finance.billing` | Super-admin billing oversight |
| Company admin billing | (page-level) | Self-serve subscription management |
| Plans & pricing | `ROUTES.plansPricing` | Plan tier configuration |
| Promo codes | `ROUTES.promoCodes` | Promo code CRUD and usage |
| Chatbot | `ROUTES.chatbot` | AI coaching chat (subscription-gated) |
| Settings | `ROUTES.settings` | Profile, security, privacy |
| Legal | `ROUTES.auth.privacyPolicy`, etc. | Privacy policy, terms, subprocessors |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  main.tsx                                                   │
│  ├── instrument.ts (Sentry)                                 │
│  ├── configureAmplify() (Cognito)                           │
│  ├── initPosthog()                                          │
│  └── BrowserRouter → App                                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│  App.tsx                                                    │
│  ├── AuthProvider                                           │
│  ├── PostHogAnalytics                                       │
│  └── Routes (src/routes/index.tsx)                          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  Route guards          Pages (thin)         Feature components
  ProtectedRoute        compose layout       src/components/<domain>/
  PublicRoute           + const copy
  RoleGuardRoute
  SubmoduleGuardRoute
  SubscriptionGuardRoute
```

### Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Pages | `src/pages/` | Thin route entry points; compose `AppLayout` / `AssessmentLayout` and feature content |
| Components | `src/components/<feature>/` | Feature UI; shared pieces in `components/common/`; primitives in `components/ui/` |
| API | `src/api/*.api.ts` | HTTP calls via `apiClient`; one file per backend domain |
| Store | `src/store/*.store.ts` | Zustand state and async actions per domain |
| Types | `src/types/<domain>/` | TypeScript interfaces and store shapes |
| Constants | `src/const/<domain>/` | UI copy, enums, config — no raw strings in components |
| Schemas | `src/schemas/` | Yup validation for forms |
| Tables | `src/tables/<feature>/` | DataTable column definitions |
| Hooks | `src/hooks/` | Reusable React logic (roles, permissions, theme, payment gates, etc.) |
| Lib | `src/lib/` | Cross-cutting utilities (`apiClient`, RBAC helpers, analytics, `cn`) |
| Utils | `src/utils/` | Domain-specific pure helpers (assessment math, promo formatting, etc.) |
| Layout | `src/layout/` | `AppLayout`, `AssessmentLayout` |
| Routes | `src/routes/` | Route config with guard composition |
| Config | `src/config/` | Amplify / Cognito setup |

### Data flow

1. Page mounts → reads from Zustand store or triggers store action.
2. Store action calls `src/api/<domain>.api.ts`.
3. API module uses `apiClient` (Axios) with Cognito bearer token injected by request interceptor.
4. Response mapped to typed store state; components re-render.

Assessment and chatbot additionally call dedicated microservice URLs (`VITE_BSP_ASSESSMENT_API_URL`, `VITE_CHATBOT_API_URL`)

## Project Structure

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── api/                    # API client functions (29 domain modules)
│   ├── assets/                 # Images, SVGs
│   ├── components/
│   │   ├── ui/                 # shadcn primitives (do not modify for feature work)
│   │   ├── common/             # Shared app components (DataTable wrappers, guards, loaders)
│   │   └── <feature>/          # Feature-specific UI (assessment, chatbot, dashboard, …)
│   ├── config/                 # Amplify configuration
│   ├── const/                  # Constants grouped by domain
│   ├── hooks/                  # Custom hooks (barrel: @/hooks)
│   ├── layout/                 # AppLayout, AssessmentLayout
│   ├── lib/                    # apiClient, analytics, RBAC, shared utilities
│   ├── pages/                  # Route-level page components
│   ├── routes/                 # Route definitions with guards
│   ├── schemas/                # Yup form schemas
│   ├── store/                  # Zustand stores (24 domains)
│   ├── stories/                # Storybook stories
│   ├── tables/                 # DataTable column configs
│   ├── test/                   # Vitest unit tests
│   ├── tokens/                 # Design token JSON + generated tokens.css
│   ├── types/                  # TypeScript types grouped by domain
│   ├── utils/                  # Domain-specific pure functions
│   ├── App.tsx
│   ├── index.css               # Tailwind theme + semantic token mapping
│   ├── instrument.ts           # Sentry initialization
│   └── main.tsx                # Entry point
├── .storybook/                 # Storybook config
├── build-tokens.mjs            # Style Dictionary token build
├── biome.json
├── components.json             # shadcn/ui config
├── vite.config.ts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- Running BSP backend API (default `http://localhost:3000`) and Cognito app client credentials

### Install and run

```bash
cd frontend
pnpm install
pnpm build-tokens   # required after clone or token changes
pnpm dev            # http://localhost:5173
```

Restart the dev server after changing any `VITE_*` environment variable — Vite bakes them in at startup.

### Production build

```bash
pnpm build          # tsc -b && vite build → dist/
pnpm preview        # serve dist/ locally
```

## Environment Variables

Create `frontend/.env` (or `.env.local`) for local development. All client-side variables must be prefixed with `VITE_`.

### Required

| Variable | Purpose |
|----------|---------|
| `VITE_AWS_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_AWS_USER_POOL_CLIENT_ID` | Cognito app client (default session) |
| `VITE_API_BASE_URL` | Main BSP REST API base URL (e.g. `http://localhost:3000`) |

### Optional — auth

| Variable | Purpose |
|----------|---------|
| `VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER` | Cognito client with longer refresh token for "Remember me" |

### Optional — assessment services

| Variable | Purpose |
|----------|---------|
| `VITE_BSP_ASSESSMENT_API_URL` | Assessment microservice base URL |
| `VITE_ASSESSMENT_REPORTS_BASE_URL` | Report asset/CDN base URL |
| `VITE_ASSESSMENT_REPORT_IMAGES_BASE_URL` | Report image asset base URL |
| `VITE_SKIP_ASSESSMENT_PERSISTENCE` | Dev flag to skip assessment response persistence |

### Optional — chatbot

| Variable | Purpose |
|----------|---------|
| `VITE_CHATBOT_API_URL` | Chatbot REST API |
| `VITE_CHATBOT_STREAM_URL` | Chatbot SSE/stream endpoint |
| `VITE_CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE` | Proactive chat data source |

### Optional — observability

| Variable | Purpose |
|----------|---------|
| `VITE_SENTRY_DSN` | Sentry DSN (omit to disable) |
| `VITE_SENTRY_ENVIRONMENT` | Sentry environment label |
| `VITE_SENTRY_RELEASE` | Sentry release name |
| `VITE_POSTHOG_KEY` | PostHog project API key |
| `VITE_POSTHOG_HOST` | PostHog ingest host |
| `VITE_POSTHOG_DASHBOARD_URL` | Embedded PostHog dashboard URL (super-admin tab) |

### Optional — integrations

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_MAPS_API_KEY` | Address autocomplete |
| `VITE_BRAND_LOGO_BASE_URL` | Brand logo CDN override |
| `VITE_ENV` | Environment label for asset URL construction |
| `VITE_AWS_REGION` | AWS region for asset URLs (default `us-east-1`) |

### Build-time only (CI)

| Variable | Purpose |
|----------|---------|
| `SENTRY_AUTH_TOKEN` | Upload source maps via `@sentry/vite-plugin` |
| `SENTRY_ORG` | Sentry organization |
| `SENTRY_PROJECT_FRONTEND` | Sentry project slug |

Access in code:

```typescript
const baseUrl = import.meta.env.VITE_API_BASE_URL;
```

## Authentication

Authentication uses **AWS Cognito** via **AWS Amplify v6** (`src/config/amplify.config.ts`).

- Login state: `useAuthStore` (`src/store/auth.store.ts`) — persisted with Zustand `persist`.
- JWT access tokens are attached to main API requests by the Axios interceptor in `src/lib/apiClient.ts`.
- On `401` with message `"Authorization token is missing"`, the client redirects to login with a return URL (`buildLoginUrlWithRedirect`).
- **Remember me**: when `VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER` is set, login selects the long-lived refresh-token client; `configureAmplify` is called at startup based on stored preference.

Cognito groups drive coarse role checks (`COGNITO_SUPER_ADMIN_GROUP`, `COGNITO_CORPORATION_ADMIN_GROUP`, `COGNITO_COMPANY_ADMIN_GROUP`, etc. in `src/const/common/cognito-groups.const.ts`).

## Routing & Access Control

Routes are declared in `src/routes/index.tsx` as a `RouteConfig[]` array. Guards are composed per route:

| Guard | Purpose |
|-------|---------|
| `PublicRoute` | Redirects authenticated users away from login |
| `ProtectedRoute` | Requires auth; enforces onboarding, payment gates, and assessment access rules |
| `RoleGuardRoute` | Restricts by Cognito group |
| `SubmoduleGuardRoute` | Restricts by RBAC submodule key (`SUBMODULE_KEYS`) |
| `SubscriptionGuardRoute` | Restricts by subscription feature (e.g. chatbot) |

RBAC submodule permissions are resolved via `usePermissions` and configured per role category on the backend. Sidebar menu visibility is driven by `src/lib/rbac/sidebar-menu.ts`.

Payment gates (`useCompanyAdminPaymentGate`, `useIndividualPaymentGate`) block navigation until checkout is complete for unpaid company admins and individual subscribers.

## API Layer

### Main API

- Base URL: `API_CONFIG.baseUrl` → `VITE_API_BASE_URL`
- Endpoint paths: `API_ENDPOINTS` in `src/const/common/api.const.ts`
- Client: `apiClient` in `src/lib/apiClient.ts` — typed `get` / `post` / `put` / `patch` / `delete` returning `ApiResponse<T> | ApiError`
- Error guard: `isApiError(response)`

Each domain exposes functions from `src/api/<domain>.api.ts`, re-exported through `src/api/index.ts`.

### Separate service clients

Some modules call dedicated base URLs directly:

- **Assessment**: `src/api/assessment.api.ts` → `VITE_BSP_ASSESSMENT_API_URL`
- **Chatbot**: `src/api/chatbot.api.ts` → `VITE_CHATBOT_API_URL` / `VITE_CHATBOT_STREAM_URL`

## State Management

Zustand stores live in `src/store/`, one per domain. Key stores:

| Store | Domain |
|-------|--------|
| `auth.store` | Session, Cognito groups |
| `users.store` | User profile, onboarding |
| `corporations.store` / `companies.store` | Directory CRUD |
| `assessment.store` | In-progress assessment session |
| `assessment-directory.store` | Admin assessment list |
| `roles.store` | RBAC roles |
| `billing-management.store` / `invoice-management.store` | Finance |
| `company-admin-billing.store` | Self-serve billing |
| `chatbot.store` | Chat threads and compact widget |
| `subscription-access.store` | Feature entitlements |

Import stores from `@/store` (barrel). Reset cross-store state on logout in `auth.store`.

## UI & Design System

### shadcn/ui

Primitives live in `src/components/ui/`. Style: **radix-vega** (`components.json`). Add new primitives with:

```bash
npx shadcn@latest add <component>
```

Current primitives include: alert-dialog, avatar, badge, banner, button, calendar, card, checkbox, collapsible, combobox, dialog, dropdown-menu, field, input, input-group, label, popover, resizable, select, separator, sheet, sidebar, skeleton, sonner, switch, table, textarea, tooltip.

### Design tokens

Token JSON files live in `src/tokens/`. After editing tokens:

```bash
pnpm build-tokens
```

This regenerates `src/tokens/tokens.css` via Style Dictionary + `@tokens-studio/sd-transforms`. The generated file is imported in `index.css`.

Token themes use `data-theme` selectors (`bsp-light`, `bsp-dark`). Runtime theme switching uses the `dark` class on `<html>` via `useTheme` (`src/hooks/useTheme.ts`), which maps to the `.dark` block in `index.css`.

### Layout

- `AppLayout` — sidebar, header, breadcrumbs, optional compact chatbot widget.
- `AssessmentLayout` — full-screen assessment flow without standard app.

## Forms & Validation

- Forms: React Hook Form with Yup schemas from `src/schemas/`.
- Resolver: `@hookform/resolvers/yup`.
- Form field names and payload keys should match backend JSON keys where practical.
- Event handlers use `handle` prefix (`handleSubmit`, `handleClick`).

## Testing

### Unit tests (Vitest)

```bash
pnpm test          # watch mode
pnpm test:unit     # single run, node environment
```

Tests live in `src/test/` and cover API client contracts, schemas, and utility logic. Configured in `vite.config.ts` under `test.projects[0]` (name: `unit`).


## Observability

### Sentry

Initialized in `src/instrument.ts` when `VITE_SENTRY_DSN` is set. Integrates React Router tracing, session replay (errors only at 100%), and console error capture. React error boundaries hook into `reactErrorHandler` in `main.tsx`.

Source maps uploaded in CI when `SENTRY_AUTH_TOKEN` is present (`vite.config.ts`).

### PostHog

Initialized in `src/lib/analytics/posthog.ts`. `PostHogAnalytics` component in `App.tsx` handles pageview tracking. Event names in `src/const/analytics/posthog-events.const.ts`. User identity set on login via `capturePosthogLoginSuccess`; reset on logout.

## Code Quality

[Biome](https://biomejs.dev/) handles linting and formatting.

```bash
pnpm lint                              # check
npx biome check --write .              # auto-fix
```

Pre-commit: Husky + lint-staged runs Biome on staged files.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Vite dev server (`:5173`) |
| `pnpm build` | Typecheck + production build → `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Biome check |
| `pnpm build-tokens` | Regenerate `src/tokens/tokens.css` |
| `pnpm test` | Vitest (watch) |
| `pnpm test:unit` | Vitest unit run |
| `pnpm storybook` | Storybook dev server (`:6006`) |
| `pnpm build-storybook` | Static Storybook build |
