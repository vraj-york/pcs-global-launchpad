# Forgot Password page (node `4:24394`)

Figma node `4:24394` ("Forgot Password") is the first step of the forgot-password flow: split-screen with
the left brand panel (gradient + behavioral-nodes art + BSP symbol + "Map your behavioral intelligence."
headline + subtitle) and a right card with BSP logo, "Forgot Password?" heading, the "No worries, we'll
send you reset instructions." subtitle, an **Email** field, a full-width primary **Send Instructions**
button, a full-width ghost **Back to Login** button, "Need help? Contact Us", and the "© 2026 BSPBlueprint ·
Privacy Policy · Terms of Use" footer.

This page already exists and is fully wired. Only spacing/layout and a subtitle color correction were needed
to match the design; no new components, assets, or backend endpoints are required.

## Frontend

- **Changed:** `components/auth/ForgotPasswordForm.tsx`
  - Form restructured to the Figma layout: two groups with a 32px gap (`gap-8`) — Email field / buttons
    (`gap-3` = 12px). "Back to Login" is now a full-width ghost button (`h-10`, semibold
    `text-text-foreground`, transparent hover) matching Figma frame `#4:24465`'s stacked full-width buttons,
    replacing the previous compact centered text button. Removed the ad-hoc `mt-2` and the redundant email
    wrapper `div`.
  - Subtitle color fixed from `text-muted-foreground` (#498291, the lighter footer gray) to
    `text-text-secondary` (#385966), matching the Figma subtitle fill (`fill_0a7754f0`).
- **Also corrected (same subtitle token bug):** `components/auth/SetNewPasswordForm.tsx` (node `4:24233`)
  subtitle `text-muted-foreground` → `text-text-secondary` (#385966), so the whole reset flow uses the
  correct subtitle color.
- **Existing (reused, no change):**
  - Layout: `layout/AuthLayout.tsx` — split-screen shell (gradient + `BehavioralNodes` + `BSPSymbol`,
    `AUTH_LAYOUT_CONTENT`, "Need help? Contact Us", copyright + Privacy / Terms footer).
  - Host: `pages/auth/ForgotPasswordPage.tsx` renders `<ForgotPasswordForm>` inside `<AuthLayout>` for the
    `email` step (email → verification → newPassword → success).
  - `components/common` `FormInput`, `components/ui` `Button`; copy from `FORGOT_PASSWORD_PAGE_CONTENT`;
    validation from `forgotPasswordSchema`. All styling via `index.css` tokens; no new assets.

## Backend / auth

- Requesting the reset code is done **client-side against AWS Cognito** via the auth store
  (`requestPasswordReset(email)` → Amplify `resetPassword`), which triggers the Cognito user pool to email a
  confirmation code (SES). There is **no custom REST endpoint** for this screen.
- Backend "support" is purely Cognito user-pool configuration (forgot-password enabled, SES sender). No
  NestJS route, DTO, data model, or new IaC is required beyond the existing Cognito + SES stack already used
  by login and the rest of the reset flow.
