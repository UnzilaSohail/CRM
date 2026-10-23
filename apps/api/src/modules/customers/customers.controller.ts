import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@crm/db';
import { rolesWith } from '@crm/types';
import { customerInput, customerListQuery, customerPatchInput } from '@crm/validators';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { AuditService } from '../audit/audit.service';

const READ = rolesWith('customers:read');
const WRITE = rolesWith('customers:write');

/** Lower-case, collapse whitespace and strip punctuation so near-identical names collide. */
export const nameKeyOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

@Controller('customers')
export class CustomersController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  @Roles(...READ)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const parsed = customerListQuery.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { q, industry, country, status, cursor, limit } = parsed.data;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(status ? { status } : { status: { not: 'ARCHIVED' } }),
      ...(industry ? { industry: { equals: industry, mode: 'insensitive' } } : {}),
      ...(country ? { country: { equals: country, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { nameKey: { contains: nameKeyOf(q) } },
            ],
          }
        : {}),
    };

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const rows = await tx.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const items = rows.slice(0, limit);
      return { items, nextCursor: rows.length > limit ? items[items.length - 1]!.id : null };
    });
  }

  @Roles(...READ)
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const c = await tx.customer.findFirst({
        where: { id, deletedAt: null },
        include: { contacts: true },
      });
      if (!c) throw new NotFoundException();
      return c;
    });
  }

  /**
   * Creates a customer. Names similar to an existing customer (trigram similarity) return 409 with the
   * candidates, so the caller can merge or retry with ?force=true.
   */
  @Roles(...WRITE)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown, @Query('force') force?: string) {
    const parsed = customerInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const nameKey = nameKeyOf(parsed.data.name);

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      if (force !== 'true') {
        const similar = await tx.$queryRaw<{ id: string; name: string; score: number }[]>`
          SELECT "id", "name", similarity("nameKey", ${nameKey})::float8 AS score
          FROM "Customer"
          WHERE "deletedAt" IS NULL AND similarity("nameKey", ${nameKey}) >= 0.6
          ORDER BY score DESC LIMIT 5`;
        if (similar.length > 0) {
          throw new ConflictException({
            message: 'Possible duplicate customer',
            duplicates: similar,
          });
        }
      }
      const created = await tx.customer.create({
        data: { ...parsed.data, tenantId: user.tenantId, nameKey, ownerId: user.id },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'customer.create',
        entityType: 'Customer',
        entityId: created.id,
        diff: { name: created.name },
      });
      return created;
    });
  }

  @Roles(...WRITE)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = customerPatchInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException();
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(parsed.data.name ? { nameKey: nameKeyOf(parsed.data.name) } : {}),
        },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'customer.update',
        entityType: 'Customer',
        entityId: id,
        diff: parsed.data,
      });
      return updated;
    });
  }

  /** Customers are archived, never deleted, so history and audit stay intact. */
  @Roles(...WRITE)
  @HttpCode(200)
  @Post(':id/archive')
  archive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException();
      const updated = await tx.customer.update({ where: { id }, data: { status: 'ARCHIVED' } });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'customer.archive',
        entityType: 'Customer',
        entityId: id,
      });
      return updated;
    });
  }
}
