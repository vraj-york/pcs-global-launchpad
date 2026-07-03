# Verification Code Email Template — Implementation Plan

Design source: Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:20113`
("Email Template - Verification Code"). Unlike the coach-dashboard nodes, this is
a **transactional email**, not an in-app React screen — so it lives in the
**backend email layer**, not `frontend/`. The template already exists and this
change aligns its visual details to the Figma; this plan documents the feature,
the delta applied, and the one asset dependency.

Stack: **NestJS + Cognito + AWS SES**, with a **Cognito Custom Email Sender
Lambda** for auth-flow emails.

---

## 1. Where this UI lives (no React involved)

Emails are HTML strings (table layout + inline styles, Outlook/MSO-safe) — they
cannot use React, `components/ui`, or `index.css` runtime tokens. Two code paths
render the verification-code email and are intentionally kept **identical**:

| Path | File | Used for |
|---|---|---|
| App (NestJS) | `backend/src/account-security/templates/verification-code.template.ts` (shell: `backend/src/common/email-shell.util.ts`) | MFA OTP emails sent by `AccountSecurityService` → `EmailService.sendEmail` (SES) |
| Cognito | `backend/cloudformation/lambda/custom-email-sender/index.js` (`getLoginVerificationHtml`) | Login MFA, verify-email, forgot-password, admin-create-user codes |

Both were updated in this change to match node `4:20113`.

---

## 2. Visual delta applied (to match Figma node 4:20113)

Card = light shell (`#F8F7FB` page, white card, 20px radius) + header image row +
centered content. Content body updated to the Figma spec:

| Element | Figma | Applied (exact Figma values) |
|---|---|---|
| Title "Verification Code" | Inter SemiBold, 20.9/25.09, `#2F414A` | `font-weight:600;font-size:20.9px;line-height:25.09px;color:#2F414A` |
| Subtitle | Inter 400, 14.63/21.95, `#385966` | `font-size:14.63px;line-height:21.95px;color:#385966` (minutes from `VERIFICATION_CODE_VALID_MINUTES`) |
| Code `121-012` | Inter Bold, 50.17/60.63, `-0.0083em`, `#2F414A` | `font-weight:700;font-size:50.17px;line-height:60.63px;letter-spacing:-0.42px;color:#2F414A` |
| Divider | 1px `#DDD9EB` | `border-top:1px solid #DDD9EB` |
| Footer + link | 14.63px `#385966`; link `#3A6FD8` | `font-size:14.63px;line-height:21.95px;color:#385966`; `<a style="color:#3A6FD8">Support Team</a>` |
| Section gaps | 40px children gap; 8.36px title→subtitle; 41.81px container padding | `margin:40px 0 0` between code / divider / footer; `margin:0 0 8.36px` title→subtitle; row padding `41.81px 24px` |

Figma type/spacing values carry a ~1.045 scale factor (e.g. 20.9 = 20×1.045); the
exact decimals are used verbatim rather than rounded so the render matches the
mockup pixel-for-pixel. `-0.0083em` on the 50.17px code resolves to `-0.42px`.

Grammar kept correct ("didn't trigger this, please contact our") rather than
reproducing the mockup typo; code value stays dynamic (`formatVerificationCode`).

---

## 3. Header logo + brand blobs (asset dependency)

The Figma header shows the **BSPBlueprint logo** over four blurred brand-colored
ellipses (`#ED1C24` red, `#6D6E71` gray, `#00A651` green, `#749DEF` blue,
`blur(100px)`, 50% opacity). Email clients do **not** reliably support CSS blur /
absolute positioning, so this header ships as a **single hosted PNG**, referenced
by `renderEmailHeaderRow()` via the `EMAIL_LOGO_URL` env var (600px wide, top
radius 20px).

Action item (design → asset, not an in-repo React asset):
- Export the Figma logo header (node `4:20153`, 600×~152) as a 2× PNG.
- Upload to the existing public assets bucket / CDN and set `EMAIL_LOGO_URL` in
  the app env and the Lambda env. No template code change needed — the shell
  already renders `EMAIL_LOGO_URL`.

---

## 4. Trigger flow / endpoints (already implemented)

- **App MFA OTP:** `AccountSecurityService` generates + formats the code, persists
  the OTP token (TTL = `VERIFICATION_CODE_VALID_MINUTES`), and calls
  `EmailService.sendEmail({ subject: VERIFICATION_CODE_SUBJECT, htmlBody:
  getVerificationCodeHtml(...), textBody: getVerificationCodeText(...) })`.
  Verify endpoint validates the submitted code (`verify-mfa-otp.dto`).
- **Cognito auth flows:** the Custom Email Sender Lambda decrypts the code and
  sends the same HTML for `Authentication` / `VerifyUserAttribute` /
  `ForgotPassword` / `AdminCreateUser` triggers.

No new endpoints or data models are required for the design change.

---

## 5. Deployment notes (AWS)

- **SES:** unchanged — sender from `SES_SENDER_EMAIL`; app sends via `EmailService`
  (ECS Fargate). Keep the SES sending identity verified.
- **Lambda:** redeploy the Custom Email Sender Lambda
  (`backend/cloudformation/lambda/custom-email-sender`) so the synced HTML ships;
  the KMS key + Cognito trigger wiring are unchanged.
- **Env:** set `EMAIL_LOGO_URL` (app task def + Lambda env) to the hosted header
  PNG once exported.
- **Consistency guard:** the two templates must stay identical — consider a small
  unit test / snapshot (mirrors existing `verification-code` spec) asserting the
  shared body markup, so future edits update both.
- Send a live test to Gmail + Outlook after deploy to confirm the MSO-safe
  rendering of the 50px code and divider.
