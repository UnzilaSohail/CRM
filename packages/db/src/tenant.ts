import type { Prisma, PrismaClient } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

/**
 * Run `fn` inside a transaction scoped to one tenant. Row-Level Security policies read
 * `app.tenant_id`, so a query that forgets its tenant filter still cannot cross tenants.
 * `SET LOCAL ROLE` drops superuser rights (dev and test connect as the owner); in production the
 * connection already is the unprivileged `crm_app` role and the statement changes nothing.
 */
export async function withTenant<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE crm_app');
    await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

export interface LoginUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  passwordHash: string | null;
  mfaSecret: string | null;
  customerId: string | null;
}

/**
 * Find a user by email before any tenant context exists. Row-Level Security exposes only the row
 * whose email matches `app.auth_email`, so this cannot be used to browse other users.
 */
export async function findUserForLogin(
  prisma: PrismaClient,
  email: string,
): Promise<LoginUser | null> {
  const key = email.trim().toLowerCase();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE crm_app');
    await tx.$queryRaw`SELECT set_config('app.auth_email', ${key}, true)`;
    const user = await tx.user.findFirst({
      where: { email: { equals: key, mode: 'insensitive' } },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        active: true,
        passwordHash: true,
        mfaSecret: true,
        customerId: true,
      },
    });
    return user && user.active ? user : null;
  });
}
