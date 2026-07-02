/**
 * When true, `POST/PUT` question-response bulk and assessment completion are skipped
 * (UI still runs). `GET /questions`, list/resume, and `POST /assessments` still run.
 * Set `VITE_SKIP_ASSESSMENT_PERSISTENCE=true` in env for local UI-only review.
 * Default: persist (writes enabled).
 */
export const SKIP_ASSESSMENT_PERSISTENCE_APIS =
	(import.meta.env.VITE_SKIP_ASSESSMENT_PERSISTENCE as string | undefined) ===
	"true";

/**
 * After a 409 on bulk create, the client refetches option ids and retries.
 * This caps those refetch/retry cycles so a persistent conflict cannot loop forever.
 */
export const ASSESSMENT_BULK_PERSIST_409_MAX_RETRIES = 3;
