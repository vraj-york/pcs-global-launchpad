/**
 * Maps stored `app_key_contacts.contact_type` keys to display labels.
 * API filters pass the same key string as stored in the DB (e.g. `exec_sponsor`).
 */

/** Snake_case keys → display labels (used to build the resolver lookup). */
const DB_KEY_TO_LABEL: Readonly<Record<string, string>> = {
  exec_sponsor: 'Executive Sponsor',
  budget_owner: 'Budget Owner',
  primary_contact: 'Primary Contact',
  implementation_lead: 'Implementation Lead',
  project_manager: 'Project Manager',
  technical_it_lead: 'Technical / IT Lead',
  platform_administrator: 'Platform Administrator',
  hr_program_owner: 'HR / Program Owner',
  training_coordinator: 'Training Coordinator',
  finance_billing_contact: 'Finance / Billing Contact',
  legal_compliance_contact: 'Legal / Compliance Contact',
  power_user_champion: 'Power User / Champion',
  behavioural_assessment_administrator: 'Behavioral Assessment Administrator',
  team_leader_manager: 'Team Leader / Manager',
  culture_leadership_program_owner: 'Culture / Leadership Program Owner',
  hr_talent_development_owner: 'HR / Talent Development Owner',
};

function snakeToCamelCase(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Lowercase lookup: snake_case and camelCase → label */
const CONTACT_TYPE_LABEL_LOOKUP: Record<string, string> = (() => {
  const lookup: Record<string, string> = {};
  const add = (key: string, label: string) => {
    lookup[key.trim().toLowerCase()] = label;
  };
  for (const [snakeKey, label] of Object.entries(DB_KEY_TO_LABEL)) {
    add(snakeKey, label);
    add(snakeToCamelCase(snakeKey), label);
  }
  return lookup;
})();

/**
 * Resolve a stored `contact_type` key to its UI label. Matches snake_case,
 * camelCase (e.g. executiveSponsor) case-insensitively.
 * Unknown values are returned trimmed as-is so legacy or free-form rows still display.
 */
export function resolveAppKeyContactTypeLabel(
  dbKey: string | null | undefined,
): string | null {
  if (dbKey == null) {
    return null;
  }
  const trimmed = dbKey.trim();
  if (trimmed === '') {
    return null;
  }
  const mapped = CONTACT_TYPE_LABEL_LOOKUP[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  return trimmed;
}
