# Coach Settings — "Request Your Data" verify-identity modal (node `4:23504`)

Figma node `4:23504` is the **Request Your Data — Verify Identity with Code** modal (header "Request Your
Data" + subtitle "Confirm your identity & proceed further" + close; an "Important Note" info banner "We'll
compile your account data, including assessment's results."; a **Code** label with a countdown timer and a
6-digit OTP input; "Didn't receive the code? **Resend**"; footer Cancel + **Request Data**).

**No new frontend or backend work is required** — this modal already exists and is fully wired. This file
records the mapping for traceability.

## Frontend (existing — reused, no change)

- Component: `components/settings/SettingsDataDownloadDialog.tsx`, an exact match for the design:
  - `ContentModal` header (`dialogTitle` "Request Your Data" / `dialogSubtitle` "Confirm your identity &
    proceed further") + close.
  - `Banner` "Important Note" with body "We'll compile your account data, including assessment's results."
    (`SETTINGS_PRIVACY_CONTENT` — copy matches Figma verbatim).
  - **Code** label + countdown (`formatTime`, destructive color) and the shared `OTPInput`
    (`SETTINGS_PRIVACY_OTP_CONFIG.codeLength = 6`).
  - "Didn't receive the code? Resend" (link `Button`, disabled while the timer runs).
  - Footer `Button`s: outline **Cancel** + primary **Request Data** (disabled until the OTP is complete;
    loading state while submitting).
  - On successful verify it transitions to the existing **Request Submitted!** success step.
  - The dialog auto-sends the OTP on open.
- Launch path already available to the coach persona: `SettingsPrivacyDataTab` ("Download My Data →
  Send Request") → `SettingsDataDownloadDialog`. The coach Privacy & Data tab (node `4:22154`) reuses
  `SettingsPrivacyDataTab`, so this modal is already reachable in Coach Settings → Privacy & Data.
- Reuses `components/ui` + `components/common` (`ContentModal`, `OTPInput`, `Banner`, `Button`) and
  `index.css` tokens (`text-info-text`, `text-destructive`, `text-link`, `border-border`, etc.). No new
  assets — the only icons (`CircleCheck`, `Loader2`) are Lucide, already in use.

## API (existing — reused, `usePrivacyDataStore` / `privacy-data.api`)

| Concern | Endpoint |
| --- | --- |
| Send verification OTP | `POST /users/me/privacy/data-export/send-otp` |
| Resend OTP | `POST /users/me/privacy/data-export/resend-otp` |
| Verify OTP + queue export | `POST /users/me/privacy/data-export/verify` |

- All endpoints are `me`-scoped and guarded by the existing `CognitoAuthGuard`; OTP delivery is handled by
  the existing account/privacy module (SES email), and a verified request compiles the authenticated
  user's own data (profile, assessment results, activities, consent) for download.

## Auth / deployment

- No new DTOs, data-model, RBAC, or IaC changes. Same NestJS + Cognito + AWS (SES) stack already
  documented in `coach-settings-privacy-data-plan.md`; a coach user hits the same `me`-scoped data-export
  endpoints. Nothing to deploy.
