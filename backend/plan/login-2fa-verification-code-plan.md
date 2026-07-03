# Login 2FA — "Enter Verification Code" page (nodes `4:24045`, `4:23763`, `4:23856`)

Figma nodes `4:24045` ("2FA - Code"), `4:23763` ("2FA - Enter Code"), and `4:23856` ("2FA / Code - Error
State") are the split-screen login **Enter Verification Code** page: left brand panel (gradient +
behavioral-nodes art + BSP symbol + "Map your behavioral intelligence." headline + subtitle) and a right
card with BSP logo, "Enter Verification Code" heading, "We've sent a 6-digit code to your email <masked>",
a 6-digit OTP input with a countdown, a **Verify Account** button, "Didn't receive the code? Resend Code",
"Need help? Contact Us", and the "© 2026 BSPBlueprint · Privacy Policy · Terms of Use" footer.

This page already exists and is fully wired. No new components, assets, or backend endpoints are needed;
the only frontend change was adding the inline error message for the error state (below).

## Frontend

- **CTA label:** kept as **"Verify Account"** (`VERIFICATION_PAGE_CONTENT.submitButton`). The 2FA nodes are
  inconsistent — `4:23763` and `4:23856` label the CTA "Verify Account" (matching the existing app value),
  while `4:24045` shows "Verify & Proceed"; the two-node majority + original value is treated as the source
  of truth, so no copy change was made.
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

## Error state (node `4:23856`)

The "2FA / Code - Error State" is the same page with an invalid code: the OTP inputs render with a red
(error) border and an inline red message appears below them ("The verification code is invalid.").

- **Changed:** `components/auth/VerificationForm.tsx` — renders the store's `error` inline below the
  `OTPInput` (`text-small text-destructive`, `role="alert"`) inside an 8px-gap column, matching the Figma
  error layout. The red input border was already wired via `OTPInput`'s `error` prop; the message clears as
  soon as the user edits the code (`clearError`).
- The message text is the auth store's mapped error
  (`AUTH_ERROR_MESSAGES.invalidVerificationCode`), set by `confirmSignIn` on a Cognito
  `CodeMismatch`/expiry.
- No new component, asset, token, or backend change for the error state.

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
