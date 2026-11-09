import { ReputationTrustLevel } from '@prisma/client';

/**
 * Classifies reputation consistently with BUSINESS_RULES.md without a 100-point ceiling.
 * @param score Current reputation balance.
 * @returns The documented trust tier.
 */
export function trustLevelFor(score: number): ReputationTrustLevel {
  if (score >= 120) return 'EXCELLENT';
  if (score >= 100) return 'GOOD';
  if (score >= 80) return 'STANDARD';
  if (score >= 40) return 'PROBATION';
  return 'SUSPENDED';
}
