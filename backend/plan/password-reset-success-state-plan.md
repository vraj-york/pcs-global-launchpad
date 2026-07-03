# Password Reset — Success state (node `4:24316`)

Figma node `4:24316` ("Reset Success State") is the final split-screen screen of the forgot-password flow:
left brand panel (gradient + behavioral-nodes art + BSP symbol + "Map your behavioral intelligence."
headline + subtitle) and a right card with BSP logo, an 80×80 green rounded-square check icon, a
"Password Reset Successful" heading, the "Your new password has been successfully created. Login again to
access the platform." subtitle, a full-width primary **Let's Login Again** button, and the
"© 2026 BSPBlueprint · Privacy Policy · Terms of Use" footer.

This screen already exists and is fully wired — it renders pixel-accurately within the app's token system.
**No frontend or backend changes were required.**

## Frontend (existing, reused — no change)

- Component: `components/auth/PasswordResetSuccessView.tsx` — matches the design 1:1:
  - Icon: `size-20` (80px) `bg-success` (#2F8F6B) `rounded-3xl` (24px) `p-2` (8px) wrapper with a 48px
    `CircleCheck` (`size-12 text-light-same`), matching Figma `.Empty Decorative Icon` (`#4:24382`).
  - Layout: `gap-10` (40px) between icon / text / button (Figma Main Wrapper `#4:24381`), `gap-3` (12px)
    between title and subtitle (`#4:24387`).
  - Title: `text-heading-3` (24px/600) — the auth-title convention uses `tracking-heading-2` because
    `index.css` defines no `tracking-heading-3` token (only `tracking-tight`, `tracking-heading-2`,
    `tracking-normal`); the ~0.2px letter-spacing delta vs the Figma value is imperceptible and matches how
    other heading-3 auth titles are styled (e.g. `SupportForm.tsx`).
  - Subtitle: `text-regular` `text-text-secondary` (#385966); CTA: full-width primary `Button` reading
    `PASSWORD_RESET_SUCCESS_PAGE_CONTENT.ctaButton` ("Let's Login Again"). Copy in
    `const/common/auth.const.ts` keeps the correct "Login again" spelling (the Figma mockup has a "agin"
    typo).
- Host: `pages/auth/ForgotPasswordPage.tsx` renders `<PasswordResetSuccessView>` inside `<AuthLayout>` for
  the `success` step (email → verification → newPassword → success). `AuthLayout` supplies the brand panel
  and footer. All styling uses `index.css` tokens; no new assets (brand art already exists).

## Backend / auth

- Purely a client-side terminal state after `confirmPasswordReset` (Cognito `confirmResetPassword`)
  succeeds; the CTA navigates to `ROUTES.auth.login`. **No REST endpoint, DTO, data model, or IaC** is
  needed beyond the existing Cognito + SES stack used by the rest of the auth flow.
