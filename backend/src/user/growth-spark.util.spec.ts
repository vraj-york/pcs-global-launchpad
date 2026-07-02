import {
  resolveDominantMindState,
  resolveSparkDateFromInstant,
  substituteGrowthSparkTemplate,
} from './growth-spark.util';

describe('growth-spark.util', () => {
  describe('resolveSparkDateFromInstant', () => {
    it('formats YYYY-MM-DD in the user timezone using en-US locale parts', () => {
      const instant = new Date('2026-06-15T23:30:00.000Z');
      expect(resolveSparkDateFromInstant(instant, 'America/New_York')).toBe(
        '2026-06-15',
      );
    });

    it('falls back to UTC when the timezone is invalid', () => {
      const instant = new Date('2026-06-15T12:00:00.000Z');
      expect(resolveSparkDateFromInstant(instant, 'Not/A_Timezone')).toBe(
        '2026-06-15',
      );
    });
  });

  describe('resolveDominantMindState', () => {
    it('returns Control when red is highest', () => {
      expect(
        resolveDominantMindState({ cred: 200, cgreen: 100, cgrey: 50 }),
      ).toBe('Control');
    });

    it('returns Affiliate when green is highest', () => {
      expect(
        resolveDominantMindState({ cred: 100, cgreen: 200, cgrey: 50 }),
      ).toBe('Affiliate');
    });

    it('returns Retreat when gray is highest', () => {
      expect(
        resolveDominantMindState({ cred: 50, cgreen: 100, cgrey: 200 }),
      ).toBe('Retreat');
    });
  });

  describe('substituteGrowthSparkTemplate', () => {
    it('replaces firstName and teamContext placeholders', () => {
      const body = substituteGrowthSparkTemplate(
        '{{firstName}}, remember {{teamContext}}.',
        'Alex',
      );
      expect(body).toBe('Alex, remember some people on your team.');
    });
  });
});
