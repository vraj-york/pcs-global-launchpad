/**
 * Phone number validation: allows international format with optional + prefix,
 * digits, spaces, hyphens, parentheses. Must contain at least this many digits.
 */
export const PHONE_REGEX = /^[+]?[\d\s\-()]+$/;
export const PHONE_MIN_DIGITS = 10;
