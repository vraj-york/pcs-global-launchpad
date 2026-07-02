import type { Prisma } from '@prisma/client';
import type { AssessmentInviteLifecycleStatus } from './invite-management.constants';
import type { inviteListUserSelect } from './invite-management-list.constants';

export type InviteListUserRow = Prisma.AppUserGetPayload<{
  select: typeof inviteListUserSelect;
}>;

export type AssessmentInviteListItem = {
  cognitoSub: string;
  name: string;
  email: string | null;
  inviteeType: string;
  status: AssessmentInviteLifecycleStatus;
  progressPercent: number;
  invitedOn: string | null;
  lastActivity: string | null;
  assessmentId: string | null;
  completedAt: string | null;
  reportKey: string | null;
};

export type AssessmentInviteListSummary = {
  totalAssessments: number;
  completedAssessments: number;
  completionRatePercent: number;
};

export type AssessmentInviteListData = {
  items: AssessmentInviteListItem[];
  summary: AssessmentInviteListSummary;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
