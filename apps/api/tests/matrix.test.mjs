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
  ['GET', '/deviations', MANAGE],
  ['POST', `/deviations/${DEMO.projects.etl}/acknowledge`, MANAGE, { severity: 'watch' }],
  ['GET', '/audit', ['CEO', 'SUPER_ADMIN']],
  ['POST', '/auth/mfa/enroll', INTERNAL],
];

describe('health is public', () => {
  it('GET /health without credentials', async () =>
    assert.equal((await call('GET', '/health')).statusCode, 200));
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

describe('allowed roles reach every handler', () => {
  for (const [method, url, allowed, body] of endpoints()) {
    for (const role of allowed) {
      it(`${method} ${url.replace(/[0-9a-f-]{36}/g, ':id')}: ${role} is not blocked`, async () => {
        const res = await call(method, url, tokens[role], body);
        assert.ok(![401, 403].includes(res.statusCode), `got ${res.statusCode}: ${res.body}`);
      });
    }
  }
});
