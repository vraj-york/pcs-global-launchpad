# Coach Settings — Privacy & Data tab (node `4:22154`)

Figma node `4:22154` is the **Privacy & Data** tab of the Coach Settings page: a single "Privacy & Data"
card with three rows — **Terms of Use** (→ "View"), **Privacy Policy** (→ "View"), and **Download My
Data** (→ "Send Request") with the note "Personal profile, assessment, results, activities & consent
details will be included."

This tab reuses the app's **existing** privacy/data feature end-to-end — **no new backend work is
required**. This file documents the wiring for traceability.

## Frontend (this change)

- `CoachSettings.tsx` now renders the existing, fully-wired `SettingsPrivacyDataTab`
  (`components/settings`) for `activeTab === "privacy-data"` (previously a "coming soon" placeholder).
  It is imported from `@/components/settings` and takes no props.
- `SettingsPrivacyDataTab` already matches the design exactly:
  - "Privacy & Data" card header.
  - **Terms of Use** / **Privacy Policy** rows, each with an outline **View** button (`Eye` icon) that
    opens the legal route (`ROUTES.auth.termsOfUse` / `ROUTES.auth.privacyPolicy`) in a new tab.
  - **Download My Data** row (title + description) with an outline **Send Request** button (`Send` icon,
    end position) that opens `SettingsDataDownloadDialog` (OTP-verified export request).
- No new components, tokens, colors, or copy introduced; the shared tab already uses `index.css` tokens
  (`border-border`, `text-text-secondary`, `text-muted-foreground`, `bg-background`) and is a superset of
  the static design (adds the OTP export dialog).

## API (existing — reused, in `privacy-data.api` / `usePrivacyDataStore`)

| Concern | Endpoint |
| --- | --- |
| Terms of Use page | Client route `ROUTES.auth.termsOfUse` (new tab) |
| Privacy Policy page | Client route `ROUTES.auth.privacyPolicy` (new tab) |
| Start data export (send OTP) | `POST /users/me/privacy/data-export/send-otp` |
| Resend export OTP | `POST /users/me/privacy/data-export/resend-otp` |
| Verify export + queue download | `POST /users/me/privacy/data-export/verify` |

## Auth / deployment

- All data-export endpoints are `me`-scoped and already guarded by `CognitoAuthGuard`; the export bundles
  the authenticated user's own profile, assessment, results, activities, and consent records. The same
  flow applies to a coach user, so no role-specific changes, DTOs, data-model, or IaC changes are needed.
- When a dedicated Cognito coach group / coach settings route is introduced, this tab keeps working
  unchanged because it operates on the authenticated user's own privacy/data.
