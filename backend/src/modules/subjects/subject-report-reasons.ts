/** Why a subject was reported (POST /subjects/:id/report). No entity imports, so DTOs can use it. */
export const SUBJECT_REPORT_REASONS = [
  'offensive',
  'not_a_subject',
  'duplicate',
  'other',
] as const;
export type SubjectReportReason = (typeof SUBJECT_REPORT_REASONS)[number];
