# Verification Code Email — Backend Implementation Plan

Design: [Figma node 2733-85844](https://www.figma.com/design/PS90cVnLY2qWdwRhTtWQAl/Untitled?node-id=2733-85844)
Template asset: `frontend/public/email-templates/verification-code.html`
Repo: `github.com/vraj-york/pcs-global-launchpad` (mono-repo, `main`)

## Summary

The Figma design is a **transactional verification-code email** (BSP Blueprint
header banner, "Verification Code" title, a 6-digit code such as `121-012`, and a
Support Team link). The UI half of this work is the pixel-perfect, email-client-safe
HTML template committed under `frontend/public/email-templates/verification-code.html`.
This plan covers the server side needed to render and deliver it.

The app authenticates via **AWS Cognito** (see `frontend/src/store/auth.store.ts`,
`requiresVerification` / `confirmSignIn`). The verification code is a Cognito MFA /
sign-in challenge (`SMS_MFA` / `SOFTWARE_TOKEN_MFA` / custom `CUSTOM_CHALLENGE`) or a
custom email OTP. Two integration options are described below.

## Option A (recommended) — Cognito Custom Message Lambda trigger

Use Cognito's **CustomMessage** Lambda trigger to override the default plaintext code
email with this branded HTML template. No new HTTP endpoint required.

- Trigger: `CustomMessage_Authentication` / `CustomMessage_SignUp` /
  `CustomMessage_ForgotPassword` (whichever emits the code).
- The Lambda receives `event.request.codeParameter` (`{####}`); inject it into the
  template's `{{code}}` slot and set `event.response.emailMessage` + `emailSubject`.
- Cognito must be configured to send email via **Amazon SES** (Developer/SES mode)
  so HTML emails and a verified from-address/domain are supported.

### Lambda outline (`backend/functions/cognito-custom-message/`)

```ts
// handler.ts
import { readFileSync } from "node:fs";
const template = readFileSync(`${__dirname}/verification-code.html`, "utf8");
const ASSET_BASE_URL = process.env.ASSET_BASE_URL;   // e.g. https://cdn.bspblueprint.com
const SUPPORT_URL = process.env.SUPPORT_URL;          // e.g. https://app.bspblueprint.com/support

export const handler = async (event) => {
  if (event.triggerSource.startsWith("CustomMessage_")) {
    const code = event.request.codeParameter; // "{####}"
    event.response.emailSubject = "Your BSP Blueprint verification code";
    event.response.emailMessage = template
      .replaceAll("{{assetBaseUrl}}", ASSET_BASE_URL)
      .replaceAll("{{code}}", code)
      .replaceAll("{{supportUrl}}", SUPPORT_URL);
  }
  return event;
};
```

Notes:
- `{{code}}` renders Cognito's `{####}` placeholder; Cognito substitutes the real
  code before delivery. Cognito enforces the code TTL — the template copy states
  "valid for the next 10 minutes"; keep it aligned with the pool's code expiry.
- Bundle `verification-code.html` into the Lambda package (copy from
  `frontend/public/email-templates/`).

## Option B — Standalone SES send endpoint

For non-Cognito flows (e.g. app-generated OTP), expose an internal endpoint that a
service calls after generating a code.

- `POST /internal/emails/verification-code` (service-to-service, not public)
- Body: `{ "to": string, "code": string }`
- Auth: IAM / internal service token; never callable from the browser.
- Handler renders the template (same replacement logic) and calls SES
  `SendEmailCommand`.

### Data model (if app-generated OTP)

`verification_codes` (DynamoDB, TTL-enabled):
| attr | type | notes |
|---|---|---|
| `pk` (userId/email) | S | partition key |
| `codeHash` | S | store a hash, never plaintext |
| `expiresAt` | N | epoch seconds; DynamoDB TTL auto-purge (10 min) |
| `attempts` | N | rate-limit / lockout |

## Assets & rendering rules (email-client constraints)

- The header uses `{{assetBaseUrl}}/EmailHeader.png` — the existing asset in
  `frontend/public/EmailHeader.png`. Host it on a public HTTPS URL (S3 + CloudFront);
  email clients cannot load `file://` or app-relative paths.
- Template is table-based with **inline styles only** and **literal hex** colors
  mirrored from `frontend/src/tokens/tokens.css` (bsp-light) — email clients don't
  support CSS variables:
  - Page bg `#f8f7fb` (`--bspGray50`), card `#ffffff`, radius `24px`
  - Title/code `#2f414a` (`--bspGunmetalGray900`), body `#385966` (`--bspGunmetalGray700`)
  - Divider `#f1f0f7` (`--bspGray100`), link `#3a6fd8` (`--bspBlueBase`)
  - Font Inter with Arial/Helvetica fallback (web fonts are unreliable in email).

## AWS deployment notes

- **SES**: verify the sending domain (DKIM + SPF); request production access to exit
  the sandbox. Configure a configuration set for bounce/complaint tracking.
- **Cognito** (Option A): set User Pool email to SES (`EmailSendingAccount: DEVELOPER`),
  attach the CustomMessage Lambda, grant the Lambda `ses:SendEmail` if it sends
  directly (not needed when Cognito sends).
- **Assets**: `EmailHeader.png` → S3 bucket behind CloudFront; set `ASSET_BASE_URL`.
- **Config**: `ASSET_BASE_URL`, `SUPPORT_URL` via Lambda env vars / SSM Parameter Store.
- **IaC**: add the Lambda, triggers, env vars, and SES config to the existing infra
  stack (Terraform/CDK/SAM as used in the mono-repo).

## Security

- Never log or persist the plaintext code; store only a hash if app-generated.
- Rate-limit resend (frontend already gates resend behind a timer in
  `VerificationForm.tsx`); enforce server-side too.
- HTML-escape any dynamic values; `{{code}}` is numeric so injection risk is minimal.

## Testing

- Render check: substitute placeholders and open the HTML in Litmus/Email on Acid
  (Gmail, Outlook desktop/web, Apple Mail, iOS) — verify the 24px card radius,
  banner, code sizing, and Support Team link color.
- Cognito trigger: use a test user pool; confirm `{####}` is replaced and subject is set.
