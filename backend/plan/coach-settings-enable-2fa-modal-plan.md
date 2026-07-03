# Coach Settings — Enable 2FA (OTP) modal (node `4:23467`)

Figma node `4:23467` is the **Two Factor Authentication** modal (550px popup: header "Two Factor
Authentication" + subtitle "Enable enhanced security with an OTP." + close; a "Note" info banner "We'll
send a 6-digit code on your given email."; a read-only **Email** field; a divider; a **Code** label with a
countdown timer and a 6-digit OTP input; "Didn't receive the code? **Resend**"; footer Cancel +
Save & Update).

**No new frontend or backend work is required** — this modal already exists and is fully wired. This file
records the mapping for traceability.

## Frontend (existing — reused, no change)

- Component: `components/settings/SettingsMfaDialog.tsx`, an exact match for the design:
  - `ContentModal` header (`mfaDialogTitleEnable` / `mfaDialogSubtitleEnable`) + close.
  - `Banner` "Note" with the 6-digit-code copy (`SETTINGS_SECURITY_CONTENT`).
  - Read-only **Email** row bound to the account's registered email.
  - `Separator`, then **Code** label + countdown (`formatTime`, destructive color) and the shared
    `OTPInput` (`SETTINGS_SECURITY_OTP_CONFIG.codeLength = 6`).
  - "Didn't receive the code? Resend" (link `Button`, disabled while the timer runs).
  - Footer `Button`s: outline **Cancel** + primary **Save & Update** (disabled until the OTP is complete;
    loading state while sending/verifying).
  - The dialog auto-sends the OTP on open and supports both `enable` and `disable` modes.
- Launch path already available to the coach persona: `SettingsSecurityTab` ("2FA Preference →
  Enable 2FA") → `SettingsMfaDialog`. The coach Security tab (`CoachSecurityTab`, node `4:22095`) reuses
  `SettingsSecurityTab`, so this modal is already reachable in Coach Settings → Security.
- Reuses `components/ui` + `components/common` (`ContentModal`, `OTPInput`, `Banner`, `Button`,
  `Separator`) and `index.css` tokens (`text-text-foreground`, `text-destructive`, `border-input`,
  `text-link`, etc.). No new assets — the only icon (`Loader2`) is Lucide, already in use.

## API (existing — reused, `useAccountSecurityStore` / `account-security.api`)

| Concern | Endpoint |
| --- | --- |
| Registered email + MFA status | `GET /users/me/security` |
| Send OTP | `POST /users/me/security/mfa/{enable\|disable}/send-otp` |
| Resend OTP | `POST /users/me/security/mfa/{enable\|disable}/resend-otp` |
| Verify OTP + toggle MFA | `POST /users/me/security/mfa/{enable\|disable}/verify` |

- All endpoints are `me`-scoped and guarded by the existing `CognitoAuthGuard`; OTP delivery + MFA state
  are handled by the existing Cognito integration (email OTP via the account-security module / SES).

## Auth / deployment

- No new DTOs, data-model, RBAC, or IaC changes. Same NestJS + Cognito + AWS stack already documented in
  `coach-settings-security-plan.md`; a coach user hits the same `me`-scoped MFA endpoints. Nothing to
  deploy.
