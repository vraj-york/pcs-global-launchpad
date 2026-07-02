# pcs-global-uat — Launchpad

Static demo frontend aligned with the PCS Global integration repository (`development-1/frontend`). Runs without a live backend or Cognito.

## Quick start

```bash
cd frontend
cp .env.example .env   # VITE_DEMO_MODE=true by default
pnpm install
pnpm dev
```

Open the app and sign in with demo credentials (shown on the login screen):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@demo.launchpad` | `demo` |
| Corporation Admin | `corpadmin@demo.launchpad` | `demo` |
| Company Admin | `companyadmin@demo.launchpad` | `demo` |
| End User | `user@demo.launchpad` | `demo` |

## Build

```bash
cd frontend
pnpm build
pnpm preview
```

## Demo mode

When `VITE_DEMO_MODE=true` (default in `.env.example`):

- API calls are served from in-memory mocks (`frontend/src/demo/`)
- Auth uses local demo personas instead of AWS Cognito
- PostHog and Sentry are disabled unless keys are set

Set `VITE_DEMO_MODE=false` and provide real `VITE_API_BASE_URL` / Cognito env vars to connect to a live backend.

## Source alignment

UI source is mirrored from the customer integration repo at `development-1/frontend/` (read-only sibling clone). Edits belong in this launchpad repo only.
