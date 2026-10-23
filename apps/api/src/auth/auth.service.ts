import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  findUserForLogin,
  hashPassword,
  verifyPassword,
  withTenant,
  type PrismaClient,
} from '@crm/db';
import type { Role } from '@crm/types';
import { PRISMA } from '../data/data.module';
import { AuditService } from '../modules/audit/audit.service';
import { LoginThrottle } from './login-throttle';
import { authSecret, signData, signSession, verifyData } from './token';
import { generateSecret, otpauthUri, verifyTotp } from './totp';

export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ENROLLMENT_TTL_SECONDS = 10 * 60;

let dummyHash: Promise<string> | undefined;

@Injectable()
export class AuthService {
  private readonly secret = authSecret();
  /** 5 failures per account+IP, and a looser 30 per IP so one noisy client cannot lock out everyone. */
  private readonly byAccount = new LoginThrottle(5);
  private readonly byIp = new LoginThrottle(30);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  async login(input: { email: string; password: string; code?: string }, ip: string) {
    const email = input.email.trim().toLowerCase();
    const account = `${email}|${ip}`;
    if (this.byAccount.isBlocked(account) || this.byIp.isBlocked(ip)) {
      throw new HttpException('Too many attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await findUserForLogin(this.prisma, email);
    // Always spend one hash verification so unknown emails cost the same as wrong passwords.
    dummyHash ??= hashPassword('not-a-real-password');
    const passwordOk = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await dummyHash),
    );
    if (!user || !passwordOk) return this.fail(account, ip, 'Invalid credentials');

    if (user.mfaSecret) {
      if (!input.code) {
        throw new UnauthorizedException({
          message: 'Verification code required',
          mfaRequired: true,
        });
      }
      if (!verifyTotp(user.mfaSecret, input.code)) {
        return this.fail(account, ip, 'Invalid verification code');
      }
    }

    this.byAccount.reset(account);
    await withTenant(this.prisma, user.tenantId, (tx) =>
      this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'auth.login',
        entityType: 'User',
        entityId: user.id,
      }),
    );
    const role = user.role as Role;
    return {
      token: signSession(
        { sub: user.id, tid: user.tenantId, role },
        this.secret,
        SESSION_TTL_SECONDS,
      ),
      expiresInSeconds: SESSION_TTL_SECONDS,
      user: { id: user.id, name: user.name, role, tenantId: user.tenantId },
    };
  }

  private fail(account: string, ip: string, message: string): never {
    this.byAccount.recordFailure(account);
    this.byIp.recordFailure(ip);
    throw new UnauthorizedException(message);
  }

  /** Step 1: hand out a secret plus a signed token carrying it; nothing is stored until step 2. */
  async startMfaEnrollment(userId: string, tenantId: string) {
    const user = await withTenant(this.prisma, tenantId, (tx) =>
      tx.user.findUniqueOrThrow({ where: { id: userId } }),
    );
    const secret = generateSecret();
    return {
      secret,
      otpauthUri: otpauthUri(secret, user.email),
      enrollmentToken: signData({ sub: userId, secret }, this.secret, ENROLLMENT_TTL_SECONDS),
    };
  }

  /** Step 2: the user proves their authenticator works before the secret is saved. */
  async confirmMfaEnrollment(
    userId: string,
    tenantId: string,
    input: { enrollmentToken: string; code: string },
  ) {
    const parsed = verifyData<{ sub: string; secret: string }>(input.enrollmentToken, this.secret);
    if (!parsed.ok || parsed.data.sub !== userId) {
      throw new UnauthorizedException('Enrollment expired, start again');
    }
    if (!verifyTotp(parsed.data.secret, input.code)) {
      throw new UnauthorizedException('Invalid verification code');
    }
    await withTenant(this.prisma, tenantId, async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { mfaSecret: parsed.data.secret } });
      await this.audit.record(tx, {
        tenantId,
        actorId: userId,
        action: 'auth.mfa.enroll',
        entityType: 'User',
        entityId: userId,
      });
    });
    return { enabled: true };
  }
}
