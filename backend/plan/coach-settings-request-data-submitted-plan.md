# Coach Settings — "Request Submitted!" success modal (node `4:23534`)

Figma node `4:23534` is the **Request Submitted!** confirmation step of the "Request Your Data" flow
(green circle-check icon; title "Request Submitted!"; body "We're preparing your data. You'll receive an
email with a download link once it's ready."; an info pill "Usually takes up to 24–48 hours."; a full-width
primary **Ok, Understood** button). It is the terminal state of node `4:23504` (verify-identity OTP modal).

**No new frontend or backend work is required** — this success view already exists and is fully wired.
This file records the mapping for traceability.

## Frontend (existing — reused, no change)

- Component: `components/settings/SettingsDataDownloadDialog.tsx` — the `step === "success"` branch, an
  exact match for the design:
  - Green rounded-square icon (`bg-success`, `rounded-3xl`, `size-20`) with `CircleCheck` (`size-12`,
    `text-light-same`).
  - `requestSubmittedTitle` = "Request Submitted!" (heading-4).
  - `requestSubmittedBody` = "We're preparing your data. You'll receive an email with a download link once
    it's ready."
  - Info pill `requestSubmittedTimeframe` = "Usually takes up to 24–48 hours." (`bg-info-bg`, `text-link`).
  - Footer: full-width primary `Button` `okUnderstoodButton` = "Ok, Understood" (closes the dialog),
    with a top border.
  - Reached automatically after the OTP is verified in the same dialog (`onSubmit` → `setStep("success")`).
- Launch path already available to the coach persona: `SettingsPrivacyDataTab` ("Download My Data →
  Send Request") → `SettingsDataDownloadDialog` → verify OTP → this success step. The coach Privacy & Data
  tab (node `4:22154`) reuses `SettingsPrivacyDataTab`.
- Reuses `components/ui` + `components/common` (`ContentModal`, `Button`) and `index.css` tokens
  (`bg-success`, `text-light-same`, `bg-info-bg`, `text-link`, `border-border`). No new assets — the icon
  (`CircleCheck`) is Lucide, already in use.

## API

- None for this step. It renders after `POST /users/me/privacy/data-export/verify` succeeds (see
  `coach-settings-request-data-otp-modal-plan.md`). The actual data compilation + email-with-download-link
  is performed asynchronously by the existing privacy/data-export backend (Cognito-guarded, SES email);
  this modal is purely the client-side confirmation.

## Auth / deployment

- No new DTOs, data-model, RBAC, or IaC changes. Same NestJS + Cognito + AWS (SES) stack already
  documented in `coach-settings-privacy-data-plan.md` / `coach-settings-request-data-otp-modal-plan.md`.
  Nothing to deploy.
