import { z } from 'zod';

const refreshTokenFields = {
  refreshToken: z
    .string()
    .trim()
    .min(1)
    .describe('Refresh token issued upon sign-in')
    .meta({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
};

export const RefreshTokenSchema = z.object(refreshTokenFields).strict();

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
