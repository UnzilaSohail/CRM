// Authorization matrix: every role x every endpoint. Runs against the compiled app (pnpm build first).
import 'reflect-metadata';
import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { AppModule } = require('../dist/app.module');

const ROLES = ['CEO', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CUSTOMER'];
const INTERNAL = ROLES.filter((r) => r !== 'CUSTOMER');
const MANAGEMENT = ['CEO', 'SUPER_ADMIN', 'PROJECT_MANAGER'];

/** [method, url, roles allowed to reach the handler, body]. Everyone else must get 403; no role must get 401. */
const endpoints = [
  ['GET', '/projects', INTERNAL],
  ['GET', '/projects/p1', INTERNAL],
  ['GET', '/portal/projects', ['CUSTOMER']],
  ['GET', '/portal/projects/p1', ['CUSTOMER']],
  ['GET', '/deviations', MANAGEMENT],
  ['POST', '/deviations/p3/acknowledge', MANAGEMENT, { severity: 'watch' }],
  ['GET', '/audit', ['CEO', 'SUPER_ADMIN']],
];

let app;
before(async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-22T08:00:00Z') });
  app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
after(async () => {
  await app.close();
  mock.timers.reset();
});

const call = (method, url, role, payload) =>
  app.inject({ method, url, headers: role ? { 'x-demo-role': role } : {}, payload });

describe('health is public', () => {
  it('GET /health without credentials', async () =>
    assert.equal((await call('GET', '/health')).statusCode, 200));
});

describe('authorization matrix', () => {
  for (const [method, url, allowed, body] of endpoints) {
    it(`${method} ${url}: anonymous gets 401`, async () =>
      assert.equal((await call(method, url, null, body)).statusCode, 401));
    it(`${method} ${url}: unknown role gets 401`, async () =>
      assert.equal((await call(method, url, 'HACKER', body)).statusCode, 401));
    for (const role of ROLES.filter((r) => !allowed.includes(r))) {
      it(`${method} ${url}: ${role} is forbidden`, async () =>
        assert.equal((await call(method, url, role, body)).statusCode, 403));
    }
    for (const role of allowed) {
      it(`${method} ${url}: ${role} is allowed`, async () => {
        const res = await call(method, url, role, body);
        assert.ok(
          res.statusCode >= 200 && res.statusCode < 300,
          `got ${res.statusCode}: ${res.body}`,
        );
      });
    }
  }
});

describe('client portal never leaks internal data', () => {
  it('exposes only the allow-listed fields and published milestones', async () => {
    const res = await call('GET', '/portal/projects/p1', 'CUSTOMER');
    const json = JSON.parse(res.body);
    assert.deepEqual(Object.keys(json).sort(), ['due', 'id', 'milestones', 'name', 'progress']);
    assert.ok(!res.body.includes('internalNotes'));
    assert.ok(!res.body.includes('manager'));
    assert.ok(!res.body.includes('Settlement endpoints'), 'unpublished milestone leaked');
    for (const m of json.milestones) assert.deepEqual(Object.keys(m).sort(), ['name', 'status']);
  });
});

describe('deviation acknowledgement', () => {
  it('rejects a critical acknowledgement without a cause', async () => {
    const res = await call('POST', '/deviations/p3/acknowledge', 'CEO', {
      severity: 'critical',
      cause: '',
    });
    assert.equal(res.statusCode, 400);
  });
  it('rejects a severity that does not match the current deviation', async () => {
    const res = await call('POST', '/deviations/p3/acknowledge', 'CEO', {
      severity: 'critical',
      cause: 'x',
    });
    assert.equal(res.statusCode, 400);
  });
  it('404s for an unknown project', async () => {
    assert.equal(
      (await call('POST', '/deviations/nope/acknowledge', 'CEO', { severity: 'watch' })).statusCode,
      404,
    );
  });
  it('writes an audit record for each acknowledgement', async () => {
    const audit = JSON.parse((await call('GET', '/audit', 'CEO')).body);
    const rec = audit.find((a) => a.action === 'deviation.acknowledge');
    assert.ok(rec, 'no audit record');
    assert.equal(rec.entityId, 'p3');
    assert.ok(MANAGEMENT.includes(rec.actorRole), `unexpected actor ${rec.actorRole}`);
  });
});
