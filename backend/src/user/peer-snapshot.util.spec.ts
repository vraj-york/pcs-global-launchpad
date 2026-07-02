import { describe, expect, it } from '@jest/globals';
import { truncateToFirstStatement } from './peer-snapshot.util';

describe('peer-snapshot.util', () => {
  describe('truncateToFirstStatement', () => {
    it('returns null for blank values', () => {
      expect(truncateToFirstStatement(null)).toBeNull();
      expect(truncateToFirstStatement('   ')).toBeNull();
    });

    it('keeps a single-sentence description unchanged', () => {
      expect(
        truncateToFirstStatement(
          'You are a Humanitarian — someone who leads with heart.',
        ),
      ).toBe('You are a Humanitarian — someone who leads with heart.');
    });

    it('truncates after the first sentence terminator', () => {
      expect(
        truncateToFirstStatement(
          'You are a Pioneer. You move quickly and value autonomy.',
        ),
      ).toBe('You are a Pioneer.');
    });

    it('returns the full string when no sentence terminator is present', () => {
      expect(truncateToFirstStatement('You are a Humanitarian')).toBe(
        'You are a Humanitarian',
      );
    });
  });
});
