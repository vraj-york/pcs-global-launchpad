import type { AssessmentListDisplayStatus } from './assessment.constants';

export type AssessmentListItem = {
  uuid: string;
  /** Per-user display name (e.g. "Assessment 1"). */
  assessmentName: string;
  startedAt: string;
  completedAt: string | null;
  status: AssessmentListDisplayStatus;
  reportKey: string | null;
};

export type AssessmentListResult = {
  items: AssessmentListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
