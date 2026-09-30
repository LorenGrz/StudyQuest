/**
 * GET /admin/community-subjects?tab=… (W3):
 *  - `new`: community subjects created in the last 7 days.
 *  - `reported`: any status but merged, with ≥ 1 report.
 *  - `private`: still `visibility='private'` with ≥ 2 enrolled users (stuck
 *    below the auto-promotion threshold or waiting on a manual publish).
 */
export const ADMIN_COMMUNITY_SUBJECT_TABS = [
  'new',
  'reported',
  'private',
] as const;
export type AdminCommunitySubjectTab =
  (typeof ADMIN_COMMUNITY_SUBJECT_TABS)[number];
