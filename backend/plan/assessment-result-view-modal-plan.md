# Assessment Result — admin "View Result" modal (node `4:22217`)

Figma frame `4:22217` is **"User Directory / View Details / Assessments & Results - View Result"**: an
admin opens a user's completed **Behavioral Assessment** report inside a large modal launched from the
**Assessments & Results** tab of the **View User Details** page. Modal chrome = header ("Assessment
Result" + **Download** + close ✕), body = the report section nav (left) + the full report content (right).

The report **content** already exists and is reused as-is; only the **launcher list** (a user's
assessments for an admin) needs a new endpoint.

## Frontend (this change)

- New `src/components/assessment/AssessmentResultModal.tsx` (exported via `components/assessment/index.ts`).
  - Reuses `AssessmentReportResultsNav`, `AssessmentReportResultsContent`, and
    `UserAssessmentStylesProvider` (same components the report page renders) inside a `Dialog` /
    `DialogContent` (`components/ui/dialog`).
  - Header row (node `4:22219`): `DialogTitle` "Assessment Result", an outline **Download** `Button`
    (`icon={Download}`, disabled + loading states), and a ghost icon close `Button` in a `DialogClose`.
  - Body (node `4:22225`): scrollable two-column layout matching `AssessmentReportResultsShell`
    (sticky nav aside + `min-w-0 flex-1` report column).
  - Props (`AssessmentResultModalProps` in `types/assessment/assessment-report-results.types.ts`):
    `open`, `onOpenChange`, `assessmentId`, `welcomeDisplayName`, `reportKey?`.
  - Download reuses `downloadAssessmentReport(reportKey)`; disabled when no `reportKey`.
  - Labels: `ASSESSMENT_RESULT_MODAL` in
    `const/assessment/assessment-report-results-page.const.ts` (title, download, close). Section nav
    labels reuse the existing `ASSESSMENT_REPORT_RESULTS_NAV`.
  - Styling: `components/ui` + `index.css` tokens only (`bg-background`, `border-border`, `text-heading-4`
    via `DialogTitle`, `shadow-lg`, `bg-overlay`); no new colors/spacing.

### Why this reuses the report cleanly

- The report **copy** is fetched by `AssessmentReportResultsContent` from the **global active
  `report-content` templates** (`GET /report-content/:sectionKey`) — it is not tied to a report key.
- The **user-specific** scored styles come from `UserAssessmentStylesProvider` →
  `GET /assessments/:id/user-styles`.
- The **report key** is only needed for the PDF download.

So the modal needs `assessmentId` + `reportKey` + the user's display name; no report-generation/polling
pipeline (the page's polling exists only to generate a fresh report for the assessment owner).

## Launcher (Assessments & Results tab) — backend gap

The View Details **Assessments & Results** tab must list the selected user's assessments so the admin can
pick one and open the modal. Existing `GET /assessments` (`listAssessments`) is scoped to the
authenticated user, so a new **admin, user-scoped** list endpoint is required.

| Concern | Proposed endpoint | Notes |
| --- | --- | --- |
| List a user's assessments/results | `GET /users/:userId/assessments` (or `GET /assessments?userId=`) | Returns `[{ id, status, completedAt, reportKey }]` for the target user. Admin-only. Mirrors `AssessmentDirectoryResultRow`. |
| Report copy (existing) | `GET /report-content/:sectionKey` | Reused unchanged. |
| User scored styles (existing) | `GET /assessments/:id/user-styles` | Reused unchanged. |
| Report row by id (existing) | `GET /assessments/:id` | Includes `report_key` when a report row exists. |
| PDF download (existing) | Signed report object URL via `ASSESSMENT_REPORTS_BASE_URL` | Reused via `downloadAssessmentReport`. |

Response shape for the list should reuse the existing `AssessmentDirectoryResultRow`
(`id`, `status`, `completedAt`, `reportKey`) so the row can pass `assessmentId` + `reportKey` +
`welcomeDisplayName` straight into `AssessmentResultModal`.

### Data model

No new tables. Reuse `assessments` (owner id, status, `report_key`, `completed_at`), `report_content`
(active templates), `user_assessment_styles` / `bsp_styles`. The new endpoint is a scoped read
(`assessments WHERE user_id = :userId`) joined to the latest report row.

## Auth / deployment

- Guard the new list endpoint with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule`
  (`USER_DIRECTORY_VIEW`), enforcing corporation/company scoping so an admin only sees users they may
  view (same scoping already applied to `GET /users`).
- No IaC changes: report assets continue to be served from the existing S3/report bucket referenced by
  `ASSESSMENT_REPORTS_BASE_URL`; `GET /report-content` and `GET /assessments/:id/user-styles` are
  existing routes. Only the NestJS assessments/users controller + service gain the user-scoped list
  handler.

## Follow-up wiring (separate node)

The **Assessments & Results** tab UI (list of a user's assessments within `ViewUserDetailsContent`) is a
separate design node; once the list endpoint above lands, render the rows there and open
`AssessmentResultModal` with the row's `assessmentId` / `reportKey` and the user's display name.
