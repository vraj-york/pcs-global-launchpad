import { randomInt } from 'crypto';

/**
 * Builds a temporary password that satisfies typical Cognito rules: at least one upper,
 * lower, digit, and symbol, minimum length 12, then shuffles characters so the pattern is
 * not predictable.
 */
export function generateCognitoCompliantTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const sym = '!@#$%';
  const pick = (set: string) => set.charAt(randomInt(set.length));
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(sym) + pick(lower);
  const all = upper + lower + digits;
  while (pwd.length < 12) {
    pwd += pick(all);
  }
  return pwd
    .split('')
    .sort(() => randomInt(3) - 1)
    .join('');
}
