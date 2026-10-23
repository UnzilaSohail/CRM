// API integration tests against the compiled app and a real Prisma client on in-process Postgres.
// Covers the role x endpoint matrix, auth, customers, portal isolation and deviation acknowledgement.
import 'reflect-metadata';
import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { DEMO, demoEmail, seedDemo } from '@crm/db';
import { createTestPrisma } from '@crm/db/testing';

// The shell may export NODE_ENV=production, which (correctly) demands a real AUTH_SECRET.
process.env.NODE_ENV = 'test';

const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app');
const { signSession, authSecret } = require('../dist/auth/token');
const { totp } = require('../dist/auth/totp');

const NOW = new Date('2026-10-22T08:00:00Z');
const ROLES = ['CEO', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CUSTOMER'];
const INTERNAL = ROLES.filter((r) => r !== 'CUSTOMER');
const MANAGE = ['CEO', 'PROJECT_MANAGER'];
const LEADS = ['CEO', 'PROJECT_MANAGER', 'TEAM_LEAD']; // create and assign tasks
const WORKERS = [...LEADS, 'EMPLOYEE']; // move tasks, check in and out

let app;
let db;
let archiveTarget;
const tokens = {};

const call = (method, url, token, payload) =>
  app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload });
const json = (res) => JSON.parse(res.body);
const login = (email, password = DEMO.password, code) =>
  app.inject({ method: 'POST', url: '/auth/login', payload: { email, password, code } });

before(async () => {
  mock.timers.enable({ apis: ['Date'], now: NOW });
  db = await createTestPrisma();
  await seedDemo(db.prisma);
  app = await createApp({ prisma: db.prisma });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  for (const role of ROLES) {
    const res = await login(demoEmail(role));
    assert.equal(res.statusCode, 200, `login as ${role}: ${res.body}`);
    tokens[role] = json(res).token;
  }
  const created = await call('POST', '/customers', tokens.CEO, { name: 'Archive Target Ltd' });
  assert.equal(created.statusCode, 201, created.body);
  archiveTarget = json(created).id;
});

after(async () => {
  await app.close();
  await db.close();
  mock.timers.reset();
});

// [method, url, roles that may reach the handler, body]. Everyone else gets 403, anonymous gets 401.
const endpoints = () => [
  ['GET', '/auth/me', ROLES],
  ['GET', '/customers', ['CEO', 'SUPER_ADMIN', 'PROJECT_MANAGER']],
  ['GET', `/customers/${DEMO.customers.meezan}`, ['CEO', 'SUPER_ADMIN', 'PROJECT_MANAGER']],
  ['POST', '/customers', ['CEO'], { name: 'Matrix Probe Industries' }],
  ['PATCH', `/customers/${archiveTarget}`, ['CEO'], { industry: 'Testing' }],
  ['POST', `/customers/${archiveTarget}/archive`, ['CEO']],
  ['GET', '/projects', INTERNAL],
  ['GET', `/projects/${DEMO.projects.coreApi}`, INTERNAL],
  ['GET', '/portal/projects', ['CUSTOMER']],
  ['GET', `/portal/projects/${DEMO.projects.coreApi}`, ['CUSTOMER']],
  ['GET', '/tasks', INTERNAL],
  ['GET', `/tasks/${DEMO.tasks.rotateKeys}`, INTERNAL],
  ['POST', '/tasks', LEADS, { projectId: DEMO.projects.coreApi, title: 'Matrix probe task' }],
  ['PATCH', `/tasks/${DEMO.tasks.loadTest}`, WORKERS, { title: 'Load test the token service' }],
  ['POST', `/tasks/${DEMO.tasks.loadTest}/assignees`, LEADS, { userId: DEMO.users.EMPLOYEE }],
  ['DELETE', `/tasks/${DEMO.tasks.loadTest}/assignees/${DEMO.users.EMPLOYEE}`, LEADS],
  ['GET', '/attendance/today', WORKERS],
  ['POST', '/attendance/check-in', WORKERS],
  ['POST', '/attendance/check-out', WORKERS],
  ['POST', '/time-entries', WORKERS, { taskId: DEMO.tasks.rotateKeys, minutes: 5 }],
  ['GET', '/time-entries', WORKERS],
  ['GET', '/deviations', MANAGE],
  ['POST', `/deviations/${DEMO.projects.etl}/acknowledge`, MANAGE, { severity: 'watch' }],
  ['GET', '/audit', ['CEO', 'SUPER_ADMIN']],
  ['POST', '/auth/mfa/enroll', INTERNAL],
  ['POST', '/auth/mfa/confirm', INTERNAL, { enrollmentToken: 'not-a-real-token', code: '000000' }],
];

// Allowed roles are expected to get past the guard, but these answer 401 by design for bad input.
const REACH_EXEMPT = new Set(['POST /auth/mfa/confirm']);

// Route table straight from the controllers' decorators, so a new endpoint cannot ship untested.
const { AppModule } = require('../dist/app.module');
const { RequestMethod } = require('@nestjs/common');
const segment = (s) =>
  s.startsWith(':') || /^[0-9a-f-]{36}$/.test(s) || s === 'undefined' ? ':p' : s;
const routeKey = (method, path) =>
  `${method} /${path.split('/').filter(Boolean).map(segment).join('/')}`;

function declaredRoutes() {
  const routes = [];
  for (const Controller of Reflect.getMetadata('controllers', AppModule)) {
    const base = Reflect.getMetadata('path', Controller) ?? '/';
    for (const name of Object.getOwnPropertyNames(Controller.prototype)) {
      const handler = Controller.prototype[name];
      const verb =
        typeof handler === 'function' ? Reflect.getMetadata('method', handler) : undefined;
      if (verb === undefined) continue;
      const path = `${base}/${Reflect.getMetadata('path', handler) ?? ''}`;
      const isPublic = Boolean(
        Reflect.getMetadata('public', handler) ?? Reflect.getMetadata('public', Controller),
      );
      routes.push({ key: routeKey(RequestMethod[verb], path), isPublic });
    }
  }
  return routes;
}

describe('health is public', () => {
  it('GET /health without credentials', async () =>
    assert.equal((await call('GET', '/health')).statusCode, 200));
});

describe('route coverage', () => {
  const declared = declaredRoutes();
  const covered = new Set(endpoints().map(([method, url]) => routeKey(method, url)));

  it('finds the routes (guards the guard)', () => {
    assert.ok(declared.length >= 25, `only ${declared.length} routes found`);
  });

  it('every protected route has a row in the authorization matrix', () => {
    const missing = declared.filter((r) => !r.isPublic && !covered.has(r.key)).map((r) => r.key);
    assert.deepEqual(missing, [], `add these to endpoints(): ${missing.join(', ')}`);
  });

  it('every matrix row is a real route (no typos)', () => {
    const real = new Set(declared.map((r) => r.key));
    const unknown = [...covered].filter((k) => !real.has(k));
    assert.deepEqual(unknown, []);
  });

  it('public routes are exactly health and login', () => {
    const open = declared.filter((r) => r.isPublic).map((r) => r.key);
    assert.deepEqual(open.sort(), ['GET /health', 'POST /auth/login']);
  });
});

describe('authorization matrix', () => {
  for (const [method, url, allowed, body] of endpoints()) {
    it(`${method} ${url.replace(/[0-9a-f-]{36}/g, ':id')}: anonymous is 401`, async () =>
      assert.equal((await call(method, url, null, body)).statusCode, 401));
    it(`${method} ${url.replace(/[0-9a-f-]{36}/g, ':id')}: garbage token is 401`, async () =>
      assert.equal((await call(method, url, 'not.a-token', body)).statusCode, 401));
    for (const role of ROLES.filter((r) => !allowed.includes(r))) {
      it(`${method} ${url.replace(/[0-9a-f-]{36}/g, ':id')}: ${role} is 403`, async () =>
        assert.equal((await call(method, url, tokens[role], body)).statusCode, 403));
    }
  }
  // Allowed roles are checked in the behaviour suites below (a status check here would be order-dependent).
});

describe('authentication', () => {
  it('rejects a wrong password and an unknown email with the same message', async () => {
    const wrong = await login(demoEmail('CEO'), 'nope');
    const unknown = await login('ghost@example.com', 'nope');
    assert.equal(wrong.statusCode, 401);
    assert.equal(unknown.statusCode, 401);
    assert.equal(json(wrong).message, json(unknown).message);
  });

  it('rejects malformed login bodies', async () => {
    assert.equal(
      (await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'x' } }))
        .statusCode,
      400,
    );
  });

  it('email matching is case-insensitive', async () => {
    assert.equal((await login(demoEmail('CEO').toUpperCase())).statusCode, 200);
  });

  it('/auth/me returns the session claims', async () => {
    const me = json(await call('GET', '/auth/me', tokens.CEO));
    assert.deepEqual(me, { id: DEMO.users.CEO, tenantId: DEMO.tenant, role: 'CEO' });
  });

  it('expired and tampered tokens are 401', async () => {
    const claims = { sub: DEMO.users.CEO, tid: DEMO.tenant, role: 'CEO' };
    const expired = signSession(claims, authSecret(), 60, NOW.getTime() - 3_600_000);
    const res = await call('GET', '/auth/me', expired);
    assert.equal(res.statusCode, 401);
    assert.match(json(res).message, /expired/);
    const [body, sig] = tokens.CEO.split('.');
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url')),
        role: 'CEO',
        sub: DEMO.users.CUSTOMER,
      }),
    ).toString('base64url');
    assert.equal((await call('GET', '/auth/me', `${forged}.${sig}`)).statusCode, 401);
  });

  it('throttles repeated failures (429) and the successful login is still recorded', async () => {
    let last;
    for (let i = 0; i < 6; i++) last = await login(demoEmail('EMPLOYEE'), 'wrong-password');
    assert.equal(last.statusCode, 429);
    const audit = json(await call('GET', '/audit', tokens.CEO));
    assert.ok(audit.some((a) => a.action === 'auth.login' && a.actorId === DEMO.users.CEO));
  });
});

describe('MFA (TOTP)', () => {
  it('enrol, confirm, then login requires a code', async () => {
    const email = demoEmail('TEAM_LEAD');
    const token = tokens.TEAM_LEAD;
    const start = json(await call('POST', '/auth/mfa/enroll', token));
    assert.match(start.otpauthUri, /^otpauth:\/\/totp\//);

    const bad = await call('POST', '/auth/mfa/confirm', token, {
      enrollmentToken: start.enrollmentToken,
      code: '000000',
    });
    assert.equal(bad.statusCode, 401);

    const ok = await call('POST', '/auth/mfa/confirm', token, {
      enrollmentToken: start.enrollmentToken,
      code: totp(start.secret, NOW.getTime()),
    });
    assert.equal(ok.statusCode, 200, ok.body);

    const noCode = await login(email);
    assert.equal(noCode.statusCode, 401);
    assert.equal(json(noCode).mfaRequired, true);

    const wrongCode = await login(email, DEMO.password, '000000');
    assert.equal(wrongCode.statusCode, 401);

    const withCode = await login(email, DEMO.password, totp(start.secret, NOW.getTime()));
    assert.equal(withCode.statusCode, 200, withCode.body);
  });

  it("another user cannot confirm with someone else's enrollment token", async () => {
    const start = json(await call('POST', '/auth/mfa/enroll', tokens.EMPLOYEE));
    const res = await call('POST', '/auth/mfa/confirm', tokens.PROJECT_MANAGER, {
      enrollmentToken: start.enrollmentToken,
      code: totp(start.secret, NOW.getTime()),
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('customers', () => {
  it('lists seeded customers for a manager, with filters', async () => {
    const all = json(await call('GET', '/customers', tokens.PROJECT_MANAGER));
    assert.ok(all.items.some((c) => c.name === 'Meezan Bank'));
    const retail = json(await call('GET', '/customers?industry=retail', tokens.CEO));
    assert.deepEqual(
      retail.items.map((c) => c.name),
      ['Amber Retail'],
    );
    const search = json(await call('GET', '/customers?q=meez', tokens.CEO));
    assert.deepEqual(
      search.items.map((c) => c.name),
      ['Meezan Bank'],
    );
  });

  it('paginates with a cursor', async () => {
    const page1 = json(await call('GET', '/customers?limit=1', tokens.CEO));
    assert.equal(page1.items.length, 1);
    assert.ok(page1.nextCursor);
    const page2 = json(
      await call('GET', `/customers?limit=1&cursor=${page1.nextCursor}`, tokens.CEO),
    );
    assert.notEqual(page2.items[0].id, page1.items[0].id);
  });

  it('validates input', async () => {
    assert.equal((await call('POST', '/customers', tokens.CEO, { name: 'x' })).statusCode, 400);
    assert.equal((await call('GET', '/customers?limit=9999', tokens.CEO)).statusCode, 400);
    assert.equal(
      (await call('PATCH', `/customers/${archiveTarget}`, tokens.CEO, {})).statusCode,
      400,
    );
  });

  it('flags near-duplicate names (409) unless forced', async () => {
    const dup = await call('POST', '/customers', tokens.CEO, { name: 'Meezan  Bank!' });
    assert.equal(dup.statusCode, 409);
    assert.equal(json(dup).duplicates[0].name, 'Meezan Bank');
    const forced = await call('POST', '/customers?force=true', tokens.CEO, {
      name: 'Meezan  Bank!',
    });
    assert.equal(forced.statusCode, 201);
  });

  it('updates a customer and re-derives the search key', async () => {
    const res = await call('PATCH', `/customers/${archiveTarget}`, tokens.CEO, {
      name: 'Renamed Target Ltd',
    });
    assert.equal(res.statusCode, 200);
    assert.equal(json(res).nameKey, 'renamed target ltd');
  });

  it('archives instead of deleting, and hides archived customers by default', async () => {
    assert.equal(
      (await call('POST', `/customers/${archiveTarget}/archive`, tokens.CEO)).statusCode,
      200,
    );
    const list = json(await call('GET', '/customers?q=renamed', tokens.CEO));
    assert.equal(list.items.length, 0);
    const archived = json(await call('GET', '/customers?status=ARCHIVED&q=renamed', tokens.CEO));
    assert.equal(archived.items.length, 1);
  });

  it("never exposes another tenant's customers, even by id", async () => {
    const foreign = await db.prisma.customer.create({
      data: { tenantId: DEMO.otherTenant, name: 'Foreign Co', nameKey: 'foreign co' },
    });
    const list = json(await call('GET', '/customers?limit=100', tokens.CEO));
    assert.ok(!list.items.some((c) => c.name === 'Foreign Co'));
    assert.equal((await call('GET', `/customers/${foreign.id}`, tokens.CEO)).statusCode, 404);
    assert.equal(
      (await call('PATCH', `/customers/${foreign.id}`, tokens.CEO, { industry: 'x' })).statusCode,
      404,
    );
  });

  it('audits changes', async () => {
    const audit = json(await call('GET', '/audit', tokens.SUPER_ADMIN));
    const actions = audit.map((a) => a.action);
    for (const a of ['customer.create', 'customer.update', 'customer.archive'])
      assert.ok(actions.includes(a), a);
  });
});

describe('projects (internal)', () => {
  it('lists projects with planned vs actual from the database', async () => {
    const list = json(await call('GET', '/projects', tokens.EMPLOYEE));
    const core = list.find((p) => p.name === 'Core API migration');
    assert.equal(core.customer, 'Meezan Bank');
    assert.ok(core.planned > core.actual);
    assert.equal(core.timeZone, 'Asia/Karachi');
  });

  it('returns milestones including the unpublished one', async () => {
    const p = json(await call('GET', `/projects/${DEMO.projects.coreApi}`, tokens.CEO));
    assert.equal(p.milestones.length, 4);
    assert.ok(p.milestones.some((m) => m.clientVisible === false));
  });

  it('400 for a non-uuid id, 404 for an unknown one', async () => {
    assert.equal((await call('GET', '/projects/nope', tokens.CEO)).statusCode, 400);
    assert.equal(
      (await call('GET', '/projects/99999999-9999-4999-8999-999999999999', tokens.CEO)).statusCode,
      404,
    );
  });
});

describe('client portal isolation', () => {
  it('exposes only allow-listed fields and published milestones', async () => {
    const res = await call('GET', `/portal/projects/${DEMO.projects.coreApi}`, tokens.CUSTOMER);
    assert.equal(res.statusCode, 200);
    const p = json(res);
    assert.deepEqual(Object.keys(p).sort(), ['due', 'id', 'milestones', 'name', 'progress']);
    assert.equal(p.milestones.length, 3);
    for (const m of p.milestones) assert.deepEqual(Object.keys(m).sort(), ['name', 'status']);
    for (const leak of [
      'Settlement endpoints',
      'customerId',
      'tenantId',
      'hourlyCost',
      'baselineVersion',
    ]) {
      assert.ok(!res.body.includes(leak), `leaked ${leak}`);
    }
  });

  it('shows a customer only their own projects', async () => {
    const list = json(await call('GET', '/portal/projects', tokens.CUSTOMER));
    assert.deepEqual(
      list.map((p) => p.name),
      ['Core API migration'],
    );
    assert.equal(
      (await call('GET', `/portal/projects/${DEMO.projects.etl}`, tokens.CUSTOMER)).statusCode,
      404,
    );
  });

  it('blocks customers from every internal endpoint', async () => {
    for (const url of ['/projects', '/customers', '/deviations', '/audit']) {
      assert.equal((await call('GET', url, tokens.CUSTOMER)).statusCode, 403, url);
    }
  });

  it('blocks internal roles from the portal', async () => {
    for (const role of INTERNAL)
      assert.equal((await call('GET', '/portal/projects', tokens[role])).statusCode, 403, role);
  });
});

describe('deviation acknowledgement', () => {
  const ack = (token, body, id = DEMO.projects.etl) =>
    call('POST', `/deviations/${id}/acknowledge`, token, body);

  it('lists active deviations for managers, worst first', async () => {
    const list = json(await call('GET', '/deviations', tokens.PROJECT_MANAGER));
    assert.ok(list.length >= 1);
    assert.equal(list[0].project, 'ETL data pipeline');
    assert.equal(list[0].severity, 'watch');
    assert.equal(list[0].acknowledged, false);
  });

  it('rejects a severity that does not match the current deviation', async () => {
    assert.equal((await ack(tokens.CEO, { severity: 'critical', cause: 'x' })).statusCode, 400);
  });

  it('404 for an unknown project', async () => {
    assert.equal(
      (await ack(tokens.CEO, { severity: 'watch' }, '99999999-9999-4999-8999-999999999999'))
        .statusCode,
      404,
    );
  });

  it('a watch deviation can be acknowledged without a cause, once', async () => {
    const first = await ack(tokens.PROJECT_MANAGER, { severity: 'watch' });
    assert.equal(first.statusCode, 201, first.body);
    assert.equal((await ack(tokens.CEO, { severity: 'watch' })).statusCode, 409);
    const list = json(await call('GET', '/deviations', tokens.CEO));
    assert.equal(list.find((d) => d.project === 'ETL data pipeline').acknowledged, true);
  });

  it('UAT: planned 80 vs actual 40 style breach is critical and needs a cause', async () => {
    await db.prisma.milestone.updateMany({
      where: { projectId: DEMO.projects.etl, name: 'Transforms' },
      data: { percentComplete: 0 },
    });
    await db.prisma.milestone.updateMany({
      where: { projectId: DEMO.projects.etl, name: 'Ingestion' },
      data: { percentComplete: 20 },
    });
    const list = json(await call('GET', '/deviations', tokens.CEO));
    const etl = list.find((d) => d.project === 'ETL data pipeline');
    assert.equal(etl.severity, 'critical');
    assert.ok(etl.negativeDeviation >= 50);
    assert.equal(etl.acknowledged, false, 'a new severity opens a new alert');

    assert.equal((await ack(tokens.CEO, { severity: 'critical', cause: '' })).statusCode, 400);
    const ok = await ack(tokens.CEO, {
      severity: 'critical',
      cause: 'Vendor delay; recovery plan agreed',
    });
    assert.equal(ok.statusCode, 201, ok.body);
  });

  it('writes audit records and an acknowledged alert row', async () => {
    const audit = json(await call('GET', '/audit', tokens.CEO));
    const acks = audit.filter((a) => a.action === 'deviation.acknowledge');
    assert.equal(acks.length, 2);
    assert.ok(
      acks.some((a) => a.diff?.severity === 'critical' && /Vendor delay/.test(a.diff.cause)),
    );
    const alerts = await db.prisma.alert.findMany({ where: { projectId: DEMO.projects.etl } });
    assert.equal(alerts.length, 2);
    assert.ok(alerts.every((a) => a.state === 'ACKNOWLEDGED' && a.acknowledgedBy));
  });
});

describe('tasks', () => {
  const T = DEMO.tasks;
  const titles = (res) => json(res).items.map((t) => t.title);
  const FAKE_ID = '99999999-9999-4999-8999-999999999999';
  let flow; // a task created by the manager and walked through its life cycle

  it('managers see every task, assignees included', async () => {
    const res = await call('GET', '/tasks', tokens.CEO);
    assert.equal(res.statusCode, 200);
    assert.equal(json(res).items.length, 4);
    const rotate = json(res).items.find((t) => t.id === T.rotateKeys);
    assert.deepEqual(
      rotate.assignees.map((a) => a.name),
      ['Zara Ahmed'],
    );
    assert.equal(rotate.dueDate, '2026-10-30');
  });

  it('an employee sees only the tasks assigned to them', async () => {
    const res = await call('GET', '/tasks', tokens.EMPLOYEE);
    assert.deepEqual(titles(res).sort(), ['Backfill ingestion jobs', 'Rotate API signing keys']);
    assert.equal(
      (await call('GET', `/tasks/${T.settlementSpec}`, tokens.EMPLOYEE)).statusCode,
      404,
    );
    assert.equal((await call('GET', `/tasks/${T.rotateKeys}`, tokens.EMPLOYEE)).statusCode, 200);
    // asking for someone else's tasks does not widen the scope
    const other = await call('GET', `/tasks?assigneeId=${DEMO.users.TEAM_LEAD}`, tokens.EMPLOYEE);
    assert.equal(json(other).items.length, 0);
  });

  it('filters by project, status and assignee', async () => {
    const byProject = await call('GET', `/tasks?projectId=${DEMO.projects.etl}`, tokens.CEO);
    assert.deepEqual(titles(byProject), ['Backfill ingestion jobs']);
    const byStatus = await call('GET', '/tasks?status=IN_PROGRESS', tokens.CEO);
    assert.deepEqual(titles(byStatus), ['Rotate API signing keys']);
    const byUser = await call('GET', `/tasks?assigneeId=${DEMO.users.TEAM_LEAD}`, tokens.CEO);
    assert.deepEqual(titles(byUser), ['Write settlement endpoint spec']);
  });

  it('orders by due date and paginates with a cursor', async () => {
    const page1 = json(await call('GET', '/tasks?limit=2', tokens.CEO));
    assert.deepEqual(
      page1.items.map((t) => t.dueDate),
      ['2026-10-28', '2026-10-30'],
    );
    assert.ok(page1.nextCursor);
    const page2 = json(await call('GET', `/tasks?limit=2&cursor=${page1.nextCursor}`, tokens.CEO));
    assert.deepEqual(
      page2.items.map((t) => t.dueDate),
      ['2026-11-05', '2026-11-12'],
    );
    assert.equal(page2.nextCursor, null);
  });

  it('validates query and ids', async () => {
    for (const url of ['/tasks?limit=9999', '/tasks?status=NOPE', '/tasks?projectId=x', '/tasks/x'])
      assert.equal((await call('GET', url, tokens.CEO)).statusCode, 400, url);
    assert.equal((await call('GET', `/tasks/${FAKE_ID}`, tokens.CEO)).statusCode, 404);
  });

  it('never exposes cost, email or credentials through assignees', async () => {
    const res = await call('GET', '/tasks', tokens.PROJECT_MANAGER);
    for (const leak of ['hourlyCost', 'email', 'passwordHash', 'mfaSecret', 'role'])
      assert.ok(!res.body.includes(leak), `leaked ${leak}`);
  });

  it('a manager creates a task; validation and scope are enforced', async () => {
    const ok = await call('POST', '/tasks', tokens.PROJECT_MANAGER, {
      projectId: DEMO.projects.coreApi,
      title: 'Document the settlement flow',
      dueDate: '2026-11-20',
    });
    assert.equal(ok.statusCode, 201, ok.body);
    flow = json(ok);
    assert.equal(flow.status, 'OPEN');
    assert.deepEqual(flow.assignees, []);

    const bad = (payload) => call('POST', '/tasks', tokens.CEO, payload);
    const base = { projectId: DEMO.projects.coreApi, title: 'Valid title' };
    assert.equal((await bad({ ...base, title: 'x' })).statusCode, 400);
    assert.equal((await bad({ ...base, dueDate: '2026-02-30' })).statusCode, 400);
    assert.equal((await bad({ ...base, projectId: FAKE_ID })).statusCode, 404);

    // a milestone that belongs to a different project is rejected
    const etlMilestone = await db.prisma.milestone.findFirst({
      where: { projectId: DEMO.projects.etl },
    });
    assert.equal((await bad({ ...base, milestoneId: etlMilestone.id })).statusCode, 400);
  });

  it('cannot create a task in another tenant, even with a valid project id', async () => {
    const customer = await db.prisma.customer.create({
      data: { tenantId: DEMO.otherTenant, name: 'Foreign Tasks Co', nameKey: 'foreign tasks co' },
    });
    const project = await db.prisma.project.create({
      data: {
        tenantId: DEMO.otherTenant,
        customerId: customer.id,
        name: 'Foreign project',
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-02-01T00:00:00Z'),
      },
    });
    const res = await call('POST', '/tasks', tokens.CEO, {
      projectId: project.id,
      title: 'Sneaky',
    });
    assert.equal(res.statusCode, 404);
  });

  it('an employee works only their own tasks, and cannot complete them', async () => {
    const assign = await call('POST', `/tasks/${flow.id}/assignees`, tokens.TEAM_LEAD, {
      userId: DEMO.users.EMPLOYEE,
    });
    assert.equal(assign.statusCode, 201, assign.body);

    const patch = (token, payload, id = flow.id) => call('PATCH', `/tasks/${id}`, token, payload);
    assert.equal((await patch(tokens.EMPLOYEE, { status: 'IN_PROGRESS' })).statusCode, 200);
    assert.equal((await patch(tokens.EMPLOYEE, { status: 'DONE' })).statusCode, 403);
    assert.equal((await patch(tokens.EMPLOYEE, { status: 'CANCELLED' })).statusCode, 403);
    assert.equal((await patch(tokens.EMPLOYEE, { title: 'Renamed by employee' })).statusCode, 403);
    // not theirs: the task does not even exist for them
    assert.equal(
      (await patch(tokens.EMPLOYEE, { status: 'IN_PROGRESS' }, T.settlementSpec)).statusCode,
      404,
    );
  });

  it('follows the status life cycle and rejects impossible moves', async () => {
    const patch = (token, payload) => call('PATCH', `/tasks/${flow.id}`, token, payload);
    assert.equal((await patch(tokens.TEAM_LEAD, { status: 'DONE' })).statusCode, 200);
    assert.equal((await patch(tokens.PROJECT_MANAGER, { status: 'OPEN' })).statusCode, 400);
    assert.equal(
      (await patch(tokens.PROJECT_MANAGER, { status: 'DONE' })).statusCode,
      200,
      'same status is a no-op',
    );
    assert.equal((await patch(tokens.PROJECT_MANAGER, { status: 'IN_PROGRESS' })).statusCode, 200);
    assert.equal((await patch(tokens.CEO, { status: 'CANCELLED' })).statusCode, 200);
    assert.equal((await patch(tokens.CEO, { status: 'DONE' })).statusCode, 400);
    assert.equal((await patch(tokens.CEO, {})).statusCode, 400);
    assert.equal((await patch(tokens.CEO, { dueDate: '2026-13-01' })).statusCode, 400);
  });

  it('clears and sets a due date', async () => {
    const cleared = await call('PATCH', `/tasks/${flow.id}`, tokens.CEO, { dueDate: null });
    assert.equal(json(cleared).dueDate, null);
    const set = await call('PATCH', `/tasks/${flow.id}`, tokens.CEO, { dueDate: '2026-12-01' });
    assert.equal(json(set).dueDate, '2026-12-01');
  });

  it('assigns and unassigns people; customers and strangers cannot be assigned', async () => {
    const url = `/tasks/${T.loadTest}/assignees`;
    const added = await call('POST', url, tokens.PROJECT_MANAGER, { userId: DEMO.users.TEAM_LEAD });
    assert.equal(added.statusCode, 201);
    assert.deepEqual(
      json(added).assignees.map((a) => a.name),
      ['Hamza Tariq'],
    );
    // assigning twice does not duplicate
    const again = await call('POST', url, tokens.PROJECT_MANAGER, { userId: DEMO.users.TEAM_LEAD });
    assert.equal(json(again).assignees.length, 1);

    assert.equal(
      (await call('POST', url, tokens.CEO, { userId: DEMO.users.CUSTOMER })).statusCode,
      400,
    );
    assert.equal((await call('POST', url, tokens.CEO, { userId: FAKE_ID })).statusCode, 400);
    assert.equal((await call('POST', url, tokens.CEO, { userId: 'nope' })).statusCode, 400);

    const removed = await call('DELETE', `${url}/${DEMO.users.TEAM_LEAD}`, tokens.PROJECT_MANAGER);
    assert.equal(removed.statusCode, 200);
    assert.deepEqual(json(removed).assignees, []);
    assert.equal(
      (await call('DELETE', `${url}/${DEMO.users.TEAM_LEAD}`, tokens.PROJECT_MANAGER)).statusCode,
      404,
    );
  });

  it('employees cannot create or assign tasks', async () => {
    const create = await call('POST', '/tasks', tokens.EMPLOYEE, {
      projectId: DEMO.projects.coreApi,
      title: 'Employee made task',
    });
    assert.equal(create.statusCode, 403);
    const assign = await call('POST', `/tasks/${T.rotateKeys}/assignees`, tokens.EMPLOYEE, {
      userId: DEMO.users.EMPLOYEE,
    });
    assert.equal(assign.statusCode, 403);
  });

  it('audits every change', async () => {
    const actions = json(await call('GET', '/audit', tokens.CEO)).map((a) => a.action);
    for (const a of ['task.create', 'task.status', 'task.update', 'task.assign', 'task.unassign'])
      assert.ok(actions.includes(a), a);
  });
});

describe('attendance', () => {
  const today = (token) => call('GET', '/attendance/today', token);

  it('starts the day with nothing recorded, in the tenant time zone', async () => {
    const res = json(await today(tokens.EMPLOYEE));
    assert.deepEqual(res, { day: '2026-10-22', checkIn: null, checkOut: null });
  });

  it('cannot check out before checking in', async () => {
    assert.equal((await call('POST', '/attendance/check-out', tokens.EMPLOYEE)).statusCode, 409);
  });

  it('checks in once, then out once', async () => {
    const inRes = await call('POST', '/attendance/check-in', tokens.EMPLOYEE);
    assert.equal(inRes.statusCode, 201, inRes.body);
    assert.equal(json(inRes).checkIn, NOW.toISOString());
    assert.equal(json(inRes).checkOut, null);

    assert.equal((await call('POST', '/attendance/check-in', tokens.EMPLOYEE)).statusCode, 409);
    assert.equal(json(await today(tokens.EMPLOYEE)).checkIn, NOW.toISOString());

    const out = await call('POST', '/attendance/check-out', tokens.EMPLOYEE);
    assert.equal(out.statusCode, 200, out.body);
    assert.equal(json(out).checkOut, NOW.toISOString());
    assert.equal((await call('POST', '/attendance/check-out', tokens.EMPLOYEE)).statusCode, 409);
  });

  it('keeps each person separate', async () => {
    assert.equal(json(await today(tokens.PROJECT_MANAGER)).checkIn, null);
    assert.equal(
      (await call('POST', '/attendance/check-in', tokens.PROJECT_MANAGER)).statusCode,
      201,
    );
  });

  it('a new calendar day in the tenant time zone allows a new check-in', async () => {
    // 20:00 UTC is already 01:00 the next day in Asia/Karachi
    const later = new Date('2026-10-22T20:00:00Z');
    mock.timers.setTime(later.getTime());
    try {
      // the 12 hour jump outlives the morning session, so sign a fresh one
      const claims = { sub: DEMO.users.EMPLOYEE, tid: DEMO.tenant, role: 'EMPLOYEE' };
      const fresh = signSession(claims, authSecret(), 3600, later.getTime());
      assert.equal(json(await today(fresh)).day, '2026-10-23');
      assert.equal((await call('POST', '/attendance/check-in', fresh)).statusCode, 201);
    } finally {
      mock.timers.setTime(NOW.getTime());
    }
  });

  it('audits check-in and check-out', async () => {
    const actions = json(await call('GET', '/audit', tokens.CEO)).map((a) => a.action);
    assert.ok(actions.includes('attendance.check_in'));
    assert.ok(actions.includes('attendance.check_out'));
  });
});

describe('time entries', () => {
  const T = DEMO.tasks;
  const log = (token, payload) => call('POST', '/time-entries', token, payload);
  const mine = (token, query = '') => call('GET', `/time-entries${query}`, token);

  it('an employee logs time on a task assigned to them', async () => {
    const res = await log(tokens.EMPLOYEE, {
      taskId: T.rotateKeys,
      minutes: 90,
      note: 'Key rotation script',
    });
    assert.equal(res.statusCode, 201, res.body);
    const entry = json(res);
    assert.equal(entry.day, '2026-10-22', 'defaults to today in the tenant time zone');
    assert.equal(entry.minutes, 90);
    assert.equal(entry.userId, DEMO.users.EMPLOYEE);
  });

  it('lists only my entries, with a total', async () => {
    const res = json(await mine(tokens.EMPLOYEE));
    assert.equal(res.items.length, 1);
    assert.equal(res.totalMinutes, 90);
    assert.equal(res.to, '2026-10-22');
    assert.equal(res.from, '2026-09-22');
    assert.equal(json(await mine(tokens.PROJECT_MANAGER)).items.length, 0);
  });

  it('cannot log time on a task that is not assigned to you (404)', async () => {
    assert.equal(
      (await log(tokens.EMPLOYEE, { taskId: T.settlementSpec, minutes: 30 })).statusCode,
      404,
    );
    assert.equal((await log(tokens.EMPLOYEE, { taskId: T.loadTest, minutes: 30 })).statusCode, 404);
  });

  it('validates minutes, dates and ids', async () => {
    const bad = (payload) =>
      log(tokens.EMPLOYEE, { taskId: T.rotateKeys, minutes: 30, ...payload });
    for (const payload of [
      { minutes: 0 },
      { minutes: -5 },
      { minutes: 1.5 },
      { minutes: 1441 },
      { minutes: '30' },
      { day: '2026-02-30' },
      { note: 'x'.repeat(501) },
      { taskId: 'nope' },
    ])
      assert.equal((await bad(payload)).statusCode, 400, JSON.stringify(payload));
  });

  it('rejects a future day but accepts earlier days', async () => {
    const future = await log(tokens.EMPLOYEE, {
      taskId: T.rotateKeys,
      minutes: 30,
      day: '2026-10-23',
    });
    assert.equal(future.statusCode, 400);
    const past = await log(tokens.EMPLOYEE, {
      taskId: T.rotateKeys,
      minutes: 45,
      day: '2026-10-20',
    });
    assert.equal(past.statusCode, 201, past.body);
    const range = json(await mine(tokens.EMPLOYEE, '?from=2026-10-21&to=2026-10-22'));
    assert.equal(range.items.length, 1, 'the 20th is outside the range');
  });

  it('caps a day at 24 hours', async () => {
    // 90 minutes already logged today
    const over = await log(tokens.EMPLOYEE, { taskId: T.rotateKeys, minutes: 1351 });
    assert.equal(over.statusCode, 409);
    const exact = await log(tokens.EMPLOYEE, { taskId: T.rotateKeys, minutes: 1350 });
    assert.equal(exact.statusCode, 201, exact.body);
    assert.equal(
      (await log(tokens.EMPLOYEE, { taskId: T.rotateKeys, minutes: 1 })).statusCode,
      409,
    );
  });

  it('cannot log time on a cancelled task', async () => {
    await db.prisma.task.update({ where: { id: T.backfill }, data: { status: 'CANCELLED' } });
    assert.equal((await log(tokens.EMPLOYEE, { taskId: T.backfill, minutes: 10 })).statusCode, 400);
    await db.prisma.task.update({ where: { id: T.backfill }, data: { status: 'OPEN' } });
  });

  it('employees cannot read a colleague; leads and managers can', async () => {
    const other = `?userId=${DEMO.users.EMPLOYEE}`;
    assert.equal((await mine(tokens.EMPLOYEE, `?userId=${DEMO.users.CEO}`)).statusCode, 403);
    assert.equal(
      (await mine(tokens.EMPLOYEE, other)).statusCode,
      200,
      'asking for yourself is fine',
    );
    for (const role of ['TEAM_LEAD', 'PROJECT_MANAGER', 'CEO']) {
      const res = await mine(tokens[role], other);
      assert.equal(res.statusCode, 200, role);
      assert.ok(json(res).items.length >= 1);
    }
  });

  it("never shows another tenant's time, and never exposes cost", async () => {
    const foreign = await db.prisma.user.create({
      data: {
        tenantId: DEMO.otherTenant,
        email: 'foreign.worker@other.test',
        name: 'Foreign Worker',
        role: 'EMPLOYEE',
      },
    });
    const res = await mine(tokens.CEO, `?userId=${foreign.id}`);
    assert.deepEqual(json(res).items, []);
    const own = await mine(tokens.CEO);
    for (const leak of ['hourlyCost', 'passwordHash', 'email'])
      assert.ok(!own.body.includes(leak), `leaked ${leak}`);
  });

  it('rejects a reversed range', async () => {
    assert.equal((await mine(tokens.EMPLOYEE, '?from=2026-10-22&to=2026-10-01')).statusCode, 400);
  });

  it('audits time logging', async () => {
    const actions = json(await call('GET', '/audit', tokens.CEO)).map((a) => a.action);
    assert.ok(actions.includes('time.log'));
  });
});

describe('allowed roles reach every handler', () => {
  for (const [method, url, allowed, body] of endpoints()) {
    for (const role of allowed) {
      if (REACH_EXEMPT.has(`${method} ${url}`)) continue;
      it(`${method} ${url.replace(/[0-9a-f-]{36}/g, ':id')}: ${role} is not blocked`, async () => {
        const res = await call(method, url, tokens[role], body);
        assert.ok(![401, 403].includes(res.statusCode), `got ${res.statusCode}: ${res.body}`);
      });
    }
  }
});
