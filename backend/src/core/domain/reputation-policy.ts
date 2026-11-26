import { ReputationTrustLevel } from '@prisma/client';

/** Starting reputation for newly created accounts; existing balances are preserved. */
export const INITIAL_REPUTATION_SCORE = 50;

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

/** Trust tier derived from the starting score using the existing threshold policy. */
export const INITIAL_REPUTATION_TRUST_LEVEL = trustLevelFor(INITIAL_REPUTATION_SCORE);
