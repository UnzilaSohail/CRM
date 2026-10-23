import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { withTenant, type Prisma, type PrismaClient, type Tx } from '@crm/db';
import { EMPLOYEE_TASK_STATUSES, canTransitionTask, rolesWith, type TaskStatus } from '@crm/types';
import { assigneeInput, taskInput, taskListQuery, taskPatchInput } from '@crm/validators';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { AuditService } from '../audit/audit.service';
import { isoDay } from '../kpi/metrics';

const READ = rolesWith('tasks:read');
const WRITE = rolesWith('tasks:write');
/** Creating and assigning tasks is a lead/manager job; employees only move their own tasks. */
const MANAGE = WRITE.filter((r) => r !== 'EMPLOYEE');

const include = {
  assignments: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof include }>;

/** Public shape. Assignees expose id and name only: never cost, email or role. */
const present = (t: TaskRow) => ({
  id: t.id,
  projectId: t.projectId,
  milestoneId: t.milestoneId,
  title: t.title,
  status: t.status,
  dueDate: t.dueDate ? isoDay(t.dueDate) : null,
  clientVisible: t.clientVisible,
  assignees: t.assignments.map((a) => a.user).sort((a, b) => a.name.localeCompare(b.name)),
});

@Controller('tasks')
export class TasksController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  /** Employees only ever see tasks assigned to them; everyone else sees the whole tenant. */
  private scope(user: AuthUser): Prisma.TaskWhereInput {
    return user.role === 'EMPLOYEE' ? { assignments: { some: { userId: user.id } } } : {};
  }

  private async load(tx: Tx, user: AuthUser, id: string): Promise<TaskRow> {
    const task = await tx.task.findFirst({ where: { id, ...this.scope(user) }, include });
    if (!task) throw new NotFoundException();
    return task;
  }

  @Roles(...READ)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const parsed = taskListQuery.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { projectId, status, assigneeId, cursor, limit } = parsed.data;

    const where: Prisma.TaskWhereInput = {
      AND: [
        this.scope(user),
        {
          ...(projectId ? { projectId } : {}),
          ...(status ? { status } : {}),
          ...(assigneeId ? { assignments: { some: { userId: assigneeId } } } : {}),
        },
      ],
    };
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const rows = await tx.task.findMany({
        where,
        include,
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const items = rows.slice(0, limit).map(present);
      return { items, nextCursor: rows.length > limit ? items[items.length - 1]!.id : null };
    });
  }

  @Roles(...READ)
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return withTenant(this.prisma, user.tenantId, async (tx) =>
      present(await this.load(tx, user, id)),
    );
  }

  @Roles(...MANAGE)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = taskInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { projectId, milestoneId, title, dueDate } = parsed.data;

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      if (!(await tx.project.findUnique({ where: { id: projectId } })))
        throw new NotFoundException('Project not found');
      if (milestoneId) await this.assertMilestoneInProject(tx, milestoneId, projectId);
      const created = await tx.task.create({
        data: {
          tenantId: user.tenantId,
          projectId,
          milestoneId: milestoneId ?? null,
          title,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00Z`) : null,
        },
        include,
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'task.create',
        entityType: 'Task',
        entityId: created.id,
        diff: { title, projectId },
      });
      return present(created);
    });
  }

  @Roles(...WRITE)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = taskPatchInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { title, status, dueDate, milestoneId } = parsed.data;

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const task = await this.load(tx, user, id);

      if (user.role === 'EMPLOYEE') {
        if (title !== undefined || dueDate !== undefined || milestoneId !== undefined)
          throw new ForbiddenException('Employees can only change the status of their tasks');
        if (status && !EMPLOYEE_TASK_STATUSES.includes(status))
          throw new ForbiddenException('Completing or cancelling a task needs a lead or manager');
      }
      if (status && !canTransitionTask(task.status as TaskStatus, status))
        throw new BadRequestException(`Cannot move a task from ${task.status} to ${status}`);
      if (milestoneId) await this.assertMilestoneInProject(tx, milestoneId, task.projectId);

      const updated = await tx.task.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(dueDate !== undefined
            ? { dueDate: dueDate ? new Date(`${dueDate}T00:00:00Z`) : null }
            : {}),
          ...(milestoneId !== undefined ? { milestoneId } : {}),
        },
        include,
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: status && status !== task.status ? 'task.status' : 'task.update',
        entityType: 'Task',
        entityId: id,
        diff: { ...parsed.data, ...(status ? { from: task.status } : {}) },
      });
      return present(updated);
    });
  }

  @Roles(...MANAGE)
  @Post(':id/assignees')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = assigneeInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { userId } = parsed.data;

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      await this.load(tx, user, id);
      // Customers are portal-only and can never work on internal tasks.
      const assignee = await tx.user.findFirst({
        where: { id: userId, active: true, role: { not: 'CUSTOMER' } },
      });
      if (!assignee) throw new BadRequestException('Assignee must be an active internal user');

      await tx.assignment.upsert({
        where: { taskId_userId: { taskId: id, userId } },
        update: {},
        create: { tenantId: user.tenantId, taskId: id, userId },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'task.assign',
        entityType: 'Task',
        entityId: id,
        diff: { userId },
      });
      return present(await this.load(tx, user, id));
    });
  }

  @Roles(...MANAGE)
  @HttpCode(200)
  @Delete(':id/assignees/:userId')
  unassign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      await this.load(tx, user, id);
      const { count } = await tx.assignment.deleteMany({ where: { taskId: id, userId } });
      if (count === 0) throw new NotFoundException('User is not assigned to this task');
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'task.unassign',
        entityType: 'Task',
        entityId: id,
        diff: { userId },
      });
      return present(await this.load(tx, user, id));
    });
  }

  private async assertMilestoneInProject(tx: Tx, milestoneId: string, projectId: string) {
    const m = await tx.milestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!m) throw new BadRequestException('Milestone does not belong to this project');
  }
}
