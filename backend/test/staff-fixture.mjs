import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import tsNode from 'ts-node';
tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
export const load = createRequire(import.meta.url);
const { StaffProvisioningService } = load(
  '../src/modules/auth/services/staff-provisioning.service.ts',
);
const { AuthService } = load('../src/modules/auth/services/auth.service.ts');

function matches(row, where) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return condition.some((entry) => matches(row, entry));
    if (key === 'AND') return condition.every((entry) => matches(row, entry));
    if (!condition || typeof condition !== 'object' || condition instanceof Date)
      return row[key] === condition;
    if ('in' in condition) return condition.in.includes(row[key]);
    if ('gt' in condition) return row[key] > condition.gt;
    if ('equals' in condition)
      return condition.mode === 'insensitive'
        ? String(row[key] ?? '').toLowerCase() === String(condition.equals).toLowerCase()
        : row[key] === condition.equals;
    throw new Error(`Unhandled fixture filter: ${key}`);
  });
}

export function staffFixture({ mailAccepted = true } = {}) {
  const state = { users: [], wallets: [], invitations: [], refreshTokens: [] };
  const emails = [];
  function client(store) {
    const updateMany = (collection, { where, data }) => {
      const rows = collection.filter((row) => matches(row, where));
      for (const row of rows) Object.assign(row, data);
      return { count: rows.length };
    };
    return {
      $queryRaw: async () => [{ locked: 1 }],
      user: {
        findFirst: async ({ where }) => store.users.find((row) => matches(row, where)) ?? null,
        create: async ({ data }) => {
          const row = { id: `user-${store.users.length + 1}`, createdAt: new Date(), ...data };
          store.users.push(row);
          return row;
        },
        update: async ({ where, data }) => {
          const row = store.users.find((entry) => matches(entry, where));
          if (!row) throw new Error('User not found');
          Object.assign(row, data);
          return row;
        },
        updateMany: async (query) => updateMany(store.users, query),
      },
      wallet: {
        create: async ({ data }) => {
          store.wallets.push(data);
          return data;
        },
      },
      staffInvitation: {
        findFirst: async ({ where }) =>
          store.invitations.find((row) => matches(row, where)) ?? null,
        create: async ({ data }) => {
          const row = { id: `invite-${store.invitations.length + 1}`, ...data };
          store.invitations.push(row);
          return row;
        },
        updateMany: async (query) => updateMany(store.invitations, query),
      },
      refreshToken: {
        create: async ({ data }) => {
          store.refreshTokens.push(data);
          return data;
        },
        updateMany: async (query) => updateMany(store.refreshTokens, query),
      },
    };
  }
  const prisma = client(state);
  let queue = Promise.resolve();
  prisma.$transaction = (run) => {
    const result = queue.then(async () => {
      const pending = structuredClone(state);
      const value = await run(client(pending));
      Object.assign(state, pending);
      return value;
    });
    queue = result.catch(() => {});
    return result;
  };
  const config = {
    get: (key) => ({ FRONTEND_URL: 'https://nexus.test', SMTP_USER: 'sender@example.test' })[key],
  };
  const mail = {
    sendEmail: async (message) => {
      emails.push(message);
      return mailAccepted;
    },
  };
  const provision = new StaffProvisioningService(prisma, mail, config);
  const shared = new AuthService(
    prisma,
    config,
    { sign: () => 'test-token' },
    { set: async () => {} },
    mail,
  );
  shared.transporter = {
    sendMail: async (message) => {
      emails.push(message);
      return { accepted: [message.to] };
    },
  };
  return { state, prisma, emails, provision, shared, mail, config };
}

export const staffInput = {
  fullName: 'Nguyễn Quang Huy',
  email: 'personal@example.test',
  phoneNumber: '0901234567',
  department: 'Support',
};
export const initialPassword = (message) => message.text.match(/Mật khẩu ban đầu: (\S+)/)[1];
