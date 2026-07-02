/** Purpose value stored on {@link SecurityOtpToken} rows for Settings → Enable 2FA. */
export const SECURITY_OTP_PURPOSE_MFA_ENABLE = 'mfa_enable';

/** Purpose value stored on {@link SecurityOtpToken} rows for Settings → Disable 2FA. */
export const SECURITY_OTP_PURPOSE_MFA_DISABLE = 'mfa_disable';

/** Purpose value stored on {@link SecurityOtpToken} rows for Privacy & Data → Download My Data. */
export const SECURITY_OTP_PURPOSE_DATA_DOWNLOAD = 'data_download';

/** Fixed MFA method for this product (Cognito EMAIL_OTP). */
export const MFA_METHOD_EMAIL = 'email' as const;

export type MfaMethod = typeof MFA_METHOD_EMAIL;

/** Cognito login verification codes expire in 3 minutes; MFA OTP uses the same window. */
export const VERIFICATION_CODE_VALID_MINUTES = 3;

/** Alias for OTP token TTL (matches verification email copy). */
export const MFA_OTP_EXPIRY_MINUTES = VERIFICATION_CODE_VALID_MINUTES;

/** Max MFA enable/disable OTP emails per user per hour (send + resend). */
export const MFA_OTP_RESEND_MAX_PER_HOUR = 5;

/** Consecutive cleanup failures before error-level logging. */
export const CLEANUP_FAILURE_ALERT_THRESHOLD = 3;
