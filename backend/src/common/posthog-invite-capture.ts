import { PostHog } from 'posthog-node';

/** Matches frontend identify `distinct_id` (Cognito `sub`). */
export const POSTHOG_USER_INVITE_EMAIL_SENT_EVENT = 'user_invite_email_sent';

let client: PostHog | undefined;

function clientFor(apiKey: string, host: string): PostHog {
  if (!client) {
    client = new PostHog(apiKey, { host });
  }
  return client;
}

type MinimalConfig = {
  get(key: string): string | undefined;
};

/**
 * Fire-and-forget server-side capture when an invite email was accepted by SES.
 * Requires POSTHOG_API_KEY (same project key as `posthog-js`). POSTHOG_HOST defaults to US ingest.
 */
export function captureUserInviteEmailSent(
  config: MinimalConfig,
  distinctId: string,
  properties: {
    invite_source: 'users_invite' | 'key_contact_invite';
    invite_type?: string;
  },
): void {
  const apiKey = config.get('POSTHOG_API_KEY')?.trim();
  if (!apiKey || !distinctId?.trim()) {
    return;
  }
  const host = config.get('POSTHOG_HOST')?.trim() || 'https://us.i.posthog.com';
  try {
    const ph = clientFor(apiKey, host);
    ph.capture({
      distinctId: distinctId.trim(),
      event: POSTHOG_USER_INVITE_EMAIL_SENT_EVENT,
      properties,
    });
  } catch {
    // Never fail invite flow on analytics
  }
}
