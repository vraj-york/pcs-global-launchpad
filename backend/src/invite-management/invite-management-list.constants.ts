import { AssessmentStatus, Prisma } from '@prisma/client';

export const IN_PROGRESS_ASSESSMENT_STATUSES: AssessmentStatus[] = [
  AssessmentStatus.in_progress,
  AssessmentStatus.completed,
  AssessmentStatus.scored,
];

export const inviteListUserSelect = {
  cognitoSub: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  invitationSentAt: true,
  createdAt: true,
  lastSeenAt: true,
  assessments: {
    orderBy: { startedAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      assessmentReport: { select: { report: true } },
      _count: { select: { questionResponses: true } },
      questionResponses: {
        orderBy: { updatedAt: 'desc' as const },
        take: 1,
        select: { updatedAt: true },
      },
    },
  },
} satisfies Prisma.AppUserSelect;
