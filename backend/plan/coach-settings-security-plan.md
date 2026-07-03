# Coach Settings — Security tab (node `4:22095`)

Figma node `4:22095` is the **Security** tab of the Coach Settings page: a single "Security Settings"
card with two rows — **Change Password** (→ "Update") and **2FA Preference** (→ "Enable 2FA").

This tab reuses the app's **existing** account-security feature end-to-end — **no new backend work is
required**. This file documents the wiring for traceability.

## Frontend (this change)

- New `src/components/dashboard/coach-dashboard/CoachSecurityTab.tsx` — a thin wrapper that:
  - Reads `securityLoading` / `securityError` and calls `fetchSecurityStatus()` from
    `useAccountSecurityStore` (fetched on mount + retry), mirroring `SettingsPageContent`.
  - Renders the existing, fully-wired `SettingsSecurityTab` (`components/settings`), which already
    contains the "Security Settings" card (Change Password + `SquarePen` "Update" button, 2FA Preference
    + Enable/Disable button) and drives the real `SettingsChangePasswordDialog` and `SettingsMfaDialog`.
- Wired into `CoachSettings.tsx` for `activeTab === "security"` and exported from
  `components/dashboard/coach-dashboard/index.ts`.
- No new components, tokens, colors, or copy were introduced — the shared security tab already matches
  the design (`Security Settings` header, Change Password / 2FA rows, outline buttons), and it is a
  superset (adds loading/error states + real dialogs + MFA enabled/disabled states).

## API (existing — reused, in `account-security.api` / `useAccountSecurityStore`)

| Concern | Endpoint |
| --- | --- |
| MFA status + registered email | `GET /users/me/security` |
| Change password | `POST /users/me/security/change-password` |
| Start MFA enable/disable (send OTP) | `POST /users/me/security/mfa/{enable\|disable}/send-otp` |
| Resend MFA OTP | `POST /users/me/security/mfa/{enable\|disable}/resend-otp` |
| Verify MFA enable/disable | `POST /users/me/security/mfa/{enable\|disable}/verify` |

## Auth / deployment

- All endpoints are `me`-scoped and already guarded by `CognitoAuthGuard`; password change + MFA are
  backed by Amazon Cognito (password policy + TOTP/software-token MFA). The same flows apply to a coach
  user, so no role-specific changes, DTOs, data-model, or IaC changes are needed.
- When a dedicated Cognito coach group / coach settings route is introduced, this tab continues to work
  unchanged because it operates on the authenticated user's own security settings.
