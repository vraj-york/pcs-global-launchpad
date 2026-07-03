# Login 2FA — "Enter Verification Code" page (node `4:24045`)

Figma node `4:24045` ("2FA - Code") is the split-screen login **Enter Verification Code** page: left brand
panel (gradient + behavioral-nodes art + BSP symbol + "Map your behavioral intelligence." headline +
subtitle) and a right card with BSP logo, "Enter Verification Code" heading, "We've sent a 6-digit code to
your email <masked>", a 6-digit OTP input with a countdown, a **Verify & Proceed** button, "Didn't receive
the code? Resend Code", "Need help? Contact Us", and the "© 2026 BSPBlueprint · Privacy Policy · Terms of
Use" footer.

This page already exists and is fully wired. The **only** change required was a copy update to match the
design; no new components, assets, or backend endpoints are needed.

## Frontend

- **Changed:** `const/common/auth.const.ts` — `VERIFICATION_PAGE_CONTENT.submitButton` "Verify Account" →
  **"Verify & Proceed"** (matches the Figma CTA; consistent with the password-reset verification CTA that
  already reads "Verify & Proceed").
- **Existing (reused, no change):**
  - Layout: `layout/AuthLayout.tsx` — the exact split-screen shell (gradient + `BehavioralNodes` +
    `BSPSymbol`, `AUTH_LAYOUT_CONTENT` headline/subtitle, "Need help? Contact Us", copyright + Privacy /
    Terms footer).
  - Form: `components/auth/VerificationForm.tsx` — title/subtitle with masked email (`maskEmail`),
    `OTPInput` (`VERIFICATION_CONFIG.codeLength = 6`) + countdown (`formatTime`), submit button, and
    "Didn't receive the code? Resend Code" (disabled while the timer runs).
  - Route: `pages/auth/LoginPage.tsx` renders `<VerificationForm>` inside `<AuthLayout>` for the
    verification step after `login()` returns `"verification"`.
  - Reuses `components/ui` + `components/common` (`Card`, `Button`, `OTPInput`) and `index.css` tokens
    (`text-text-foreground`, `text-text-secondary`, `text-link`, `text-destructive`, `bg-card`, brand
    gradient tokens). No new assets — brand art (`BehavioralNodes`, `BSPSymbol`, `BSPLogo`) already exists.

## Backend / auth

- 2FA verification is performed **client-side against AWS Cognito** via Amplify `confirmSignIn`
  (`store/auth.store.ts`), and the resend re-invokes `signIn`. The email OTP challenge is issued by the
  Cognito user pool — there is **no custom REST endpoint** for this screen.
- Backend "support" is purely Cognito user-pool configuration: the pool must have the email OTP / MFA
  challenge enabled so the `CONFIRM_SIGN_IN` step returns for these users. No NestJS route, DTO, data
  model, or new IaC is required; ensure the Cognito user pool (and its email/SES sender) is provisioned in
  the target AWS environment.

## Auth / deployment

- No new DTOs, data-model, RBAC, or server code. Same Cognito + AWS (SES for OTP email) stack already used
  by login. Nothing new to deploy beyond existing Cognito MFA configuration.
