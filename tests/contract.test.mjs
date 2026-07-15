import assert from 'node:assert/strict';
import test from 'node:test';
import { collectUnresolved, isImplementationReady, renderBrief, validateContract } from '../scripts/contract-core.mjs';

const base = {
  schemaVersion: 1,
  project: { name: 'Example', status: 'approved', summary: 'A defined application.', owners: ['team'], targetUsers: ['operators'], successMetric: '95% task completion' },
  runtime: { kind: 'web', language: 'TypeScript', packageManager: 'npm', deploymentTarget: 'managed container' },
  data: { classification: 'internal', storesPersonalData: false, storesSecrets: true, retention: '30 days' },
  integrations: [],
  constraints: { accessibility: 'WCAG 2.2 AA', privacy: 'data-minimization', reliability: '99.9% monthly availability', paidServicesAllowed: false },
  review: { lastReviewed: '2026-07-15', reviewBy: '2026-08-15' },
};
const clone = () => structuredClone(base);

test('accepts a complete approved contract', () => assert.equal(validateContract(clone()).valid, true));
test('rejects unknown top-level keys', () => { const c = clone(); c.extra = true; assert.match(validateContract(c).errors.join('\n'), /not supported/); });
test('rejects paid integrations when paid services are disabled', () => { const c = clone(); c.integrations = [{ name: 'Vendor', purpose: 'Email', dataShared: ['email'], paid: true }]; assert.match(validateContract(c).errors.join('\n'), /paid integrations/); });
test('rejects none classification with secrets', () => { const c = clone(); c.data.classification = 'none'; assert.match(validateContract(c).errors.join('\n'), /classification cannot be none/); });
test('detects unresolved fields recursively', () => { const c = clone(); c.runtime.kind = 'undecided'; c.project.targetUsers = ['to-be-defined']; assert.deepEqual(collectUnresolved(c), ['project.targetUsers[0]', 'runtime.kind']); });
test('discovery contracts may remain unresolved but are not ready', () => { const c = clone(); c.project.status = 'discovery'; c.runtime.kind = 'undecided'; const result = isImplementationReady(c, new Date('2026-07-20T00:00:00Z')); assert.equal(result.validation.valid, true); assert.equal(result.ready, false); });
test('non-discovery contracts cannot contain placeholders', () => { const c = clone(); c.runtime.language = 'to-be-defined'; assert.match(validateContract(c).errors.join('\n'), /cannot contain unresolved/); });
test('expired review blocks readiness', () => { const result = isImplementationReady(clone(), new Date('2026-09-01T00:00:00Z')); assert.equal(result.ready, false); assert.match(result.blockers.join('\n'), /expired/); });
test('rendered brief is deterministic', () => { const c = clone(); const first = renderBrief(c); assert.equal(first, renderBrief(c)); assert.match(first, /Implementation ready:\*\* yes/); });
test('rejects invalid review ordering', () => { const c = clone(); c.review.reviewBy = '2026-01-01'; assert.match(validateContract(c).errors.join('\n'), /cannot be before/); });
