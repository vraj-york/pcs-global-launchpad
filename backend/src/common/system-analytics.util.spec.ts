import {
  APP_USER_INVITE_PENDING_EXPIRY_MS,
  APP_USER_STATUS,
} from '../user/constants/app-user.constants';
import {
  appendEntityStatusTimeFilter,
  buildAssessmentAnalyticsScope,
  buildCompanyAnalyticsScope,
  buildCorporationAnalyticsScope,
  buildExpiredUserWhere,
  buildPendingUserWhere,
  buildUserAnalyticsScope,
} from './system-analytics.util';

describe('system-analytics.util', () => {
  const corporationId = '550e8400-e29b-41d4-a716-446655440000';
  const companyId = '550e8400-e29b-41d4-a716-446655440001';

  it('buildCorporationAnalyticsScope scopes by corporationId', () => {
    expect(buildCorporationAnalyticsScope({ corporationId })).toEqual({
      id: corporationId,
    });
  });

  it('buildCorporationAnalyticsScope scopes by companyId and optional corporationId', () => {
    expect(
      buildCorporationAnalyticsScope({ companyId, corporationId }),
    ).toEqual({
      companies: {
        some: {
          id: companyId,
          deletedAt: null,
          corporationId,
        },
      },
    });
  });

  it('buildCompanyAnalyticsScope applies corporation and company filters', () => {
    expect(buildCompanyAnalyticsScope({ corporationId, companyId })).toEqual({
      deletedAt: null,
      corporationId,
      id: companyId,
    });
  });

  it('buildUserAnalyticsScope matches corporation-linked and company-access users', () => {
    expect(buildUserAnalyticsScope({ corporationId })).toEqual({
      OR: [
        { corporationId },
        {
          companyAccess: {
            some: {
              company: {
                deletedAt: null,
                corporationId,
              },
            },
          },
        },
      ],
    });
  });

  it('buildAssessmentAnalyticsScope is empty without scope filters', () => {
    expect(buildAssessmentAnalyticsScope({})).toEqual({});
  });

  it('buildAssessmentAnalyticsScope scopes assessments via non-deleted users', () => {
    expect(buildAssessmentAnalyticsScope({ corporationId })).toEqual({
      user: {
        AND: [
          {
            OR: [
              { corporationId },
              {
                companyAccess: {
                  some: {
                    company: {
                      deletedAt: null,
                      corporationId,
                    },
                  },
                },
              },
            ],
          },
          { deletedAt: null },
        ],
      },
    });
  });

  it('appendEntityStatusTimeFilter uses createdAt for active/incomplete statuses', () => {
    const timeStart = new Date('2026-01-01T00:00:00.000Z');
    const where: {
      createdAt?: { gte: Date };
      suspendedClosedOn?: { gte: Date };
    } = {};
    appendEntityStatusTimeFilter(where, timeStart, true);
    expect(where.createdAt).toEqual({ gte: timeStart });
    expect(where.suspendedClosedOn).toBeUndefined();
  });

  it('appendEntityStatusTimeFilter uses suspendedClosedOn for suspended/closed statuses', () => {
    const timeStart = new Date('2026-01-01T00:00:00.000Z');
    const where: {
      createdAt?: { gte: Date };
      suspendedClosedOn?: { gte: Date };
    } = {};
    appendEntityStatusTimeFilter(where, timeStart, false);
    expect(where.suspendedClosedOn).toEqual({ gte: timeStart });
    expect(where.createdAt).toBeUndefined();
  });

  it('buildPendingUserWhere excludes runtime-expired invites', () => {
    const where = buildPendingUserWhere({}, null);
    expect(where).toEqual({
      AND: [
        {},
        {
          deletedAt: null,
          status: { equals: APP_USER_STATUS.PENDING, mode: 'insensitive' },
          OR: [
            { invitationSentAt: null },
            {
              invitationSentAt: {
                gte: new Date(Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS),
              },
            },
          ],
        },
      ],
    });
  });

  it('buildExpiredUserWhere applies invite expiry window when timeStart is set', () => {
    const timeStart = new Date('2026-06-03T00:00:00.000Z');
    const where = buildExpiredUserWhere({}, timeStart);
    const invitationSentAt = (
      (where.AND as Array<{ invitationSentAt?: unknown }>)[1] as {
        invitationSentAt: { not: null; lt: Date; gte: Date };
      }
    ).invitationSentAt;

    expect(invitationSentAt.not).toBeNull();
    expect(invitationSentAt.gte.getTime()).toBe(
      timeStart.getTime() - APP_USER_INVITE_PENDING_EXPIRY_MS,
    );
  });
});
