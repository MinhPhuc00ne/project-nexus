export type ReviewDeleteValidation = 'reasonRequired' | 'pointsInvalid' | null;

export function validateStaffReviewDeletion(
  reason: string,
  pointsToDeduct: number,
  reputationScore: number,
): ReviewDeleteValidation {
  if (reason.trim().length < 5) return 'reasonRequired';
  if (!Number.isInteger(pointsToDeduct) || pointsToDeduct < 1 || pointsToDeduct > reputationScore) {
    return 'pointsInvalid';
  }
  return null;
}
