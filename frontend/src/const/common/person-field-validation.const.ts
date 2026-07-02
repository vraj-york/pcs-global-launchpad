export const PERSON_FIELD_MAX_LENGTH = 50;

/** Must contain at least one Unicode letter. */
export const US_PERSON_NAME_HAS_LETTER = /\p{L}/u;

/**
 * US person name format: letters with optional space, apostrophe, hyphen, or period.
 * Leading/trailing ' or - are allowed (e.g. -John, John-). At least one letter is
 * enforced separately via US_PERSON_NAME_HAS_LETTER.
 */
export const US_PERSON_NAME_REGEX = /^[\p{L} '\-.]+$/u;

/** Must contain at least one Unicode letter or digit. */
export const US_JOB_ROLE_HAS_ALNUM = /[\p{L}\p{N}]/u;

/**
 * US job role format: letters/digits with optional punctuation (comma, period, apostrophe,
 * hyphen, ampersand, slash, parentheses). Leading/trailing ' or - are allowed.
 * At least one letter or digit is enforced separately via US_JOB_ROLE_HAS_ALNUM.
 */
export const US_JOB_ROLE_REGEX = /^[\p{L}\p{N} ,.'&()/-]+$/u;

export const PERSON_FIELD_VALIDATION_MESSAGES = {
	invalidPersonName: (fieldName: string) =>
		`${fieldName} contains invalid characters.`,
	invalidJobRole: (fieldName: string) =>
		`${fieldName} contains invalid characters.`,
} as const;
