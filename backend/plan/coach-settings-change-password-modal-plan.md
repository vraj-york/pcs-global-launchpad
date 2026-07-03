# Coach Settings — Change Password modal (node `4:23448`)

Figma node `4:23448` is the **Change Password** modal (550px popup: header "Change Password" + subtitle
"Set a new password for your account" + close; a "Password Rule" info banner; Current Password / New
Password (+ strength meter "Strong") / Confirm Password fields, each with a show/hide eye toggle; footer
Cancel + Save & Update).

**No new frontend or backend work is required** — this modal already exists and is fully wired. This file
records the mapping for traceability.

## Frontend (existing — reused, no change)

- Component: `components/settings/SettingsChangePasswordDialog.tsx`, an exact match for the design:
  - `ContentModal` header (`changePasswordDialogTitle` / `changePasswordDialogSubtitle`) + close.
  - `Banner` "Password Rule" with `Lock` icon and bold min-length / upper & lowercase / symbol-or-number
    copy (`SETTINGS_SECURITY_CONTENT`).
  - Three `FormInput` password fields with `Eye` / `EyeOff` toggles, plus `PasswordStrengthIndicator`.
  - Footer `Button`s: outline **Cancel** + primary **Save & Update**, disabled until the form is valid
    (strong password, no errors, confirm matches) and showing a loading state while submitting.
  - Validation via `settingsChangePasswordSchema` (yup) + `calculatePasswordStrength`.
- Launch path already available to the coach persona: `SettingsSecurityTab` ("Change Password → Update")
  → `SettingsChangePasswordDialog`. The coach Security tab (`CoachSecurityTab`, node `4:22095`) reuses
  `SettingsSecurityTab`, so this modal is already reachable in Coach Settings → Security.
- Reuses `components/ui` + `components/common` (`ContentModal`, `FormInput`, `Banner`, `Button`,
  `PasswordStrengthIndicator`) and `index.css` tokens (`text-info-text`, `text-icon-info`, `border-border`,
  etc.). No new assets — all icons are Lucide (`Lock`, `Eye`, `EyeOff`) already in use.

## API (existing — reused)

| Concern | Endpoint |
| --- | --- |
| Change password | `POST /users/me/security/change-password` (`useAccountSecurityStore().changePassword`) |

- The endpoint is `me`-scoped and guarded by the existing `CognitoAuthGuard`; the change is performed
  against Cognito. Password policy (≥8 chars, upper & lowercase, symbol or number) is enforced both
  client-side (yup schema) and by the Cognito user-pool password policy.

## Auth / deployment

- No new DTOs, data-model, RBAC, or IaC changes. Same NestJS + Cognito + AWS stack already documented in
  `coach-settings-security-plan.md`; a coach user hits the same `me`-scoped endpoint. Nothing to deploy.
