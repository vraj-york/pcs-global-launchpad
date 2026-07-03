# Set New Password page (node `4:24233`)

Figma node `4:24233` ("Set New Password") is the split-screen auth page reached at the end of the
forgot-password flow: left brand panel (gradient + behavioral-nodes art + BSP symbol + "Map your behavioral
intelligence." headline + subtitle) and a right card with BSP logo, "Set New Password" heading, the
"Your new password must be at least 8 characters, with upper & lowercase, a symbol or a number." subtitle,
a **New Password** field (eye toggle), a **Confirm Password** field (eye toggle) with a **password strength
indicator** below it, a full-width primary **Reset Password** button, a full-width ghost **Back to Login**
button, "Need help? Contact Us", and the "© 2026 BSPBlueprint · Privacy Policy · Terms of Use" footer.

This page already exists and is fully wired. Only a small spacing/layout refinement was needed to match the
design; no new components, assets, or backend endpoints are required.

## Frontend

- **Changed:** `components/auth/SetNewPasswordForm.tsx` — form restructured to the Figma layout: three
  groups with 32px gaps (`gap-8`) — New Password / (Confirm Password + strength, `gap-2` = 8px) / buttons
  (`gap-3` = 12px). "Back to Login" is now a full-width ghost button (`h-10`, semibold `text-text-foreground`,
  transparent hover) matching Figma frame `#4:24307`'s stacked full-width buttons, replacing the previous
  compact centered text button. Removed the ad-hoc `mt-2`/`pt-1` spacing hacks now handled by the group gaps.
- **Existing (reused, no change):**
  - Layout: `layout/AuthLayout.tsx` — the split-screen shell (gradient + `BehavioralNodes` + `BSPSymbol`,
    `AUTH_LAYOUT_CONTENT`, "Need help? Contact Us", copyright + Privacy / Terms footer).
  - Route/host: `pages/auth/ForgotPasswordPage.tsx` renders `<SetNewPasswordForm>` inside `<AuthLayout>` for
    the `newPassword` step (after email → verification).
  - Fields reuse `components/common` `FormInput` + `PasswordStrengthIndicator`, `components/ui` `Button`,
    with the eye/eye-off toggles (`lucide-react`). Copy comes from `SET_NEW_PASSWORD_PAGE_CONTENT`; validation
    from `setNewPasswordSchema` (min length, upper/lower, symbol-or-number, match). All styling uses
    `index.css` tokens (`text-text-foreground`, `text-muted-foreground`, `text-light-same`, brand gradient).
  - No new assets — brand art (`BehavioralNodes`, `BSPSymbol`, `BSPLogo`) already exists.

## Backend / auth

- Password reset is performed **client-side against AWS Cognito** via the auth store
  (`confirmPasswordReset(email, passwordResetToken, newPassword)` → Amplify `confirmResetPassword`). There is
  **no custom REST endpoint** for this screen; the confirmation code + new password are submitted directly to
  the Cognito user pool.
- Backend "support" is purely Cognito user-pool configuration (forgot-password / confirm-forgot-password
  enabled, SES sender for the reset code). No NestJS route, DTO, data model, or new IaC is required beyond the
  existing Cognito + SES stack already used by login and the forgot-password flow.
