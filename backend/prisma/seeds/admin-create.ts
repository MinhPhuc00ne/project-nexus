/**
 * Creates the first administrator, interactively or from the environment.
 *
 * The previous seed shipped a fixed `Admin@123456`, which means every
 * deployment that forgot to change it published its own administrator
 * credentials. Nothing here has a default password: the password is typed at the
 * prompt, or passed in the environment for an unattended install, and it has to
 * clear a strength check either way.
 *
 * Usage:
 *   npm run admin:create
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_FULL_NAME=... npm run admin:create
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as bcrypt from 'bcrypt';
import { PrismaClient, ReputationTrustLevel, Role, WalletType } from '@prisma/client';
import { createSeedClient, describeTarget } from './client';

const MIN_PASSWORD_LENGTH = 12;
const BCRYPT_ROUNDS = 10;

/** Why a password was rejected, or null when it is acceptable. */
export function describePasswordWeakness(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[a-z]/.test(password)) return 'password must contain a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'password must contain an uppercase letter';
  if (!/[0-9]/.test(password)) return 'password must contain a digit';
  if (!/[^A-Za-z0-9]/.test(password)) return 'password must contain a symbol';
  return null;
}

/** Whether a string is shaped like an email address. */
export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface AdminInput {
  email: string;
  password: string;
  fullName: string;
}

async function collectInput(): Promise<AdminInput> {
  const fromEnv = {
    email: process.env.ADMIN_EMAIL?.trim(),
    password: process.env.ADMIN_PASSWORD,
    fullName: process.env.ADMIN_FULL_NAME?.trim(),
  };

  if (fromEnv.email && fromEnv.password) {
    return {
      email: fromEnv.email,
      password: fromEnv.password,
      fullName: fromEnv.fullName || 'Platform Administrator',
    };
  }

  if (!stdin.isTTY) {
    throw new Error(
      'No terminal to prompt on. Provide ADMIN_EMAIL and ADMIN_PASSWORD in the environment.',
    );
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await rl.question('Administrator email: ')).trim();
    const fullName = (await rl.question('Full name: ')).trim() || 'Platform Administrator';
    const password = await rl.question(
      `Password (min ${MIN_PASSWORD_LENGTH} chars, upper, lower, digit, symbol): `,
    );
    const confirm = await rl.question('Confirm password: ');
    if (password !== confirm) throw new Error('passwords do not match');
    return { email, password, fullName };
  } finally {
    rl.close();
  }
}

/**
 * Creates an administrator account and its wallet.
 *
 * @param prisma - A connected client.
 * @param input - The account to create.
 * @returns The new account's id and email.
 * @throws Error when the input is invalid or the email is taken.
 */
export async function createAdministrator(
  prisma: PrismaClient,
  input: AdminInput,
): Promise<{ id: string; email: string }> {
  if (!isEmailLike(input.email)) throw new Error(`"${input.email}" is not a valid email address`);
  const weakness = describePasswordWeakness(input.password);
  if (weakness) throw new Error(weakness);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true },
  });
  if (existing) {
    throw new Error(
      `${input.email} already exists (role ${existing.role}); use a different address`,
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: Role.ADMIN,
        // Created by an operator with database access, so there is nothing left
        // to verify by email.
        isVerified: true,
        reputationScore: 100,
        trustLevel: ReputationTrustLevel.EXCELLENT,
      },
      select: { id: true, email: true },
    });
    await tx.wallet.create({
      data: { userId: admin.id, type: WalletType.USER_WALLET, balance: 0, lockedBalance: 0 },
    });
    return admin;
  });
}

async function main(): Promise<void> {
  const prisma = createSeedClient();
  console.log(`Target database: ${describeTarget()}`);
  try {
    const input = await collectInput();
    const admin = await createAdministrator(prisma, input);
    console.log(`Administrator created: ${admin.email}`);
    console.log('The password was not stored anywhere but the password hash.');
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].includes('admin-create')) {
  main().catch((error: unknown) => {
    console.error(
      `Could not create administrator: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  });
}
