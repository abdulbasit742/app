import crypto from 'node:crypto';

const TOP_LEVEL_KEYS = ['schemaVersion', 'project', 'runtime', 'data', 'integrations', 'constraints', 'review'];
const PLACEHOLDERS = new Set(['undecided', 'to-be-defined', 'tbd', 'unknown', 'repository-owner']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(['discovery', 'approved', 'building', 'maintained', 'retired']);
const RUNTIME_KINDS = new Set(['undecided', 'web', 'api', 'desktop', 'mobile', 'cli', 'library', 'worker', 'data-pipeline']);
const DATA_CLASSES = new Set(['none', 'public', 'internal', 'confidential', 'restricted']);

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireKeys(value, required, path, errors) {
  if (!plainObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  for (const key of required) if (!(key in value)) errors.push(`${path}.${key} is required`);
}

function unknownKeys(value, allowed, path, errors) {
  if (!plainObject(value)) return;
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${path}.${key} is not supported`);
}

function nonEmptyString(value, path, errors, max = 240) {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${path} must be a non-empty string`);
  else if (value.length > max) errors.push(`${path} must be ${max} characters or fewer`);
}

function validDate(value, path, errors) {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    errors.push(`${path} must be a valid YYYY-MM-DD date`);
  }
}

export function collectUnresolved(contract, path = '') {
  const unresolved = [];
  if (Array.isArray(contract)) {
    contract.forEach((value, index) => unresolved.push(...collectUnresolved(value, `${path}[${index}]`)));
  } else if (plainObject(contract)) {
    for (const [key, value] of Object.entries(contract)) unresolved.push(...collectUnresolved(value, path ? `${path}.${key}` : key));
  } else if (typeof contract === 'string' && PLACEHOLDERS.has(contract.trim().toLowerCase())) {
    unresolved.push(path);
  }
  return unresolved;
}

export function validateContract(contract) {
  const errors = [];
  if (!plainObject(contract)) return { valid: false, errors: ['contract must be an object'], unresolved: [] };
  requireKeys(contract, TOP_LEVEL_KEYS, 'contract', errors);
  unknownKeys(contract, TOP_LEVEL_KEYS, 'contract', errors);
  if (contract.schemaVersion !== 1) errors.push('schemaVersion must equal 1');

  requireKeys(contract.project, ['name', 'status', 'summary', 'owners', 'targetUsers', 'successMetric'], 'project', errors);
  unknownKeys(contract.project, ['name', 'status', 'summary', 'owners', 'targetUsers', 'successMetric'], 'project', errors);
  nonEmptyString(contract.project?.name, 'project.name', errors, 80);
  nonEmptyString(contract.project?.summary, 'project.summary', errors, 500);
  nonEmptyString(contract.project?.successMetric, 'project.successMetric', errors, 240);
  if (!STATUSES.has(contract.project?.status)) errors.push('project.status is invalid');
  for (const [field, value] of [['owners', contract.project?.owners], ['targetUsers', contract.project?.targetUsers]]) {
    if (!Array.isArray(value) || value.length === 0 || value.length > 20) errors.push(`project.${field} must contain 1 to 20 entries`);
    else value.forEach((item, index) => nonEmptyString(item, `project.${field}[${index}]`, errors, 120));
  }

  requireKeys(contract.runtime, ['kind', 'language', 'packageManager', 'deploymentTarget'], 'runtime', errors);
  unknownKeys(contract.runtime, ['kind', 'language', 'packageManager', 'deploymentTarget'], 'runtime', errors);
  if (!RUNTIME_KINDS.has(contract.runtime?.kind)) errors.push('runtime.kind is invalid');
  nonEmptyString(contract.runtime?.language, 'runtime.language', errors, 80);
  nonEmptyString(contract.runtime?.packageManager, 'runtime.packageManager', errors, 80);
  nonEmptyString(contract.runtime?.deploymentTarget, 'runtime.deploymentTarget', errors, 160);

  requireKeys(contract.data, ['classification', 'storesPersonalData', 'storesSecrets', 'retention'], 'data', errors);
  unknownKeys(contract.data, ['classification', 'storesPersonalData', 'storesSecrets', 'retention'], 'data', errors);
  if (!DATA_CLASSES.has(contract.data?.classification)) errors.push('data.classification is invalid');
  if (typeof contract.data?.storesPersonalData !== 'boolean') errors.push('data.storesPersonalData must be boolean');
  if (typeof contract.data?.storesSecrets !== 'boolean') errors.push('data.storesSecrets must be boolean');
  nonEmptyString(contract.data?.retention, 'data.retention', errors, 160);
  if (contract.data?.classification === 'none' && (contract.data?.storesPersonalData || contract.data?.storesSecrets)) {
    errors.push('data.classification cannot be none when personal data or secrets are stored');
  }

  if (!Array.isArray(contract.integrations) || contract.integrations.length > 30) errors.push('integrations must be an array with at most 30 entries');
  else contract.integrations.forEach((entry, index) => {
    requireKeys(entry, ['name', 'purpose', 'dataShared', 'paid'], `integrations[${index}]`, errors);
    unknownKeys(entry, ['name', 'purpose', 'dataShared', 'paid'], `integrations[${index}]`, errors);
    nonEmptyString(entry?.name, `integrations[${index}].name`, errors, 100);
    nonEmptyString(entry?.purpose, `integrations[${index}].purpose`, errors, 240);
    if (!Array.isArray(entry?.dataShared) || entry.dataShared.length > 20) errors.push(`integrations[${index}].dataShared must be an array`);
    if (typeof entry?.paid !== 'boolean') errors.push(`integrations[${index}].paid must be boolean`);
  });

  requireKeys(contract.constraints, ['accessibility', 'privacy', 'reliability', 'paidServicesAllowed'], 'constraints', errors);
  unknownKeys(contract.constraints, ['accessibility', 'privacy', 'reliability', 'paidServicesAllowed'], 'constraints', errors);
  nonEmptyString(contract.constraints?.accessibility, 'constraints.accessibility', errors, 120);
  nonEmptyString(contract.constraints?.privacy, 'constraints.privacy', errors, 120);
  nonEmptyString(contract.constraints?.reliability, 'constraints.reliability', errors, 160);
  if (typeof contract.constraints?.paidServicesAllowed !== 'boolean') errors.push('constraints.paidServicesAllowed must be boolean');
  if (Array.isArray(contract.integrations) && contract.integrations.some((item) => item?.paid === true) && contract.constraints?.paidServicesAllowed !== true) {
    errors.push('paid integrations require constraints.paidServicesAllowed=true');
  }

  requireKeys(contract.review, ['lastReviewed', 'reviewBy'], 'review', errors);
  unknownKeys(contract.review, ['lastReviewed', 'reviewBy'], 'review', errors);
  validDate(contract.review?.lastReviewed, 'review.lastReviewed', errors);
  validDate(contract.review?.reviewBy, 'review.reviewBy', errors);
  if (ISO_DATE.test(contract.review?.lastReviewed ?? '') && ISO_DATE.test(contract.review?.reviewBy ?? '') && contract.review.reviewBy < contract.review.lastReviewed) {
    errors.push('review.reviewBy cannot be before review.lastReviewed');
  }

  const unresolved = collectUnresolved(contract);
  if (contract.project?.status !== 'discovery' && unresolved.length) errors.push('non-discovery projects cannot contain unresolved decisions');
  return { valid: errors.length === 0, errors, unresolved };
}

export function isImplementationReady(contract, today = new Date()) {
  const validation = validateContract(contract);
  const reviewBy = Date.parse(`${contract?.review?.reviewBy ?? ''}T23:59:59Z`);
  const reviewExpired = Number.isFinite(reviewBy) && reviewBy < today.getTime();
  const ready = validation.valid && contract.project.status === 'approved' && validation.unresolved.length === 0 && !reviewExpired;
  const blockers = [...validation.errors];
  if (contract?.project?.status !== 'approved') blockers.push('project.status must be approved');
  blockers.push(...validation.unresolved.map((item) => `${item} is unresolved`));
  if (reviewExpired) blockers.push('review.reviewBy has expired');
  return { ready, blockers: [...new Set(blockers)], validation };
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function renderBrief(contract) {
  const readiness = isImplementationReady(contract, new Date(`${contract.review.lastReviewed}T12:00:00Z`));
  const integrationRows = contract.integrations.length
    ? contract.integrations.map((item) => `| ${escapeCell(item.name)} | ${escapeCell(item.purpose)} | ${escapeCell(item.dataShared.join(', ') || 'none')} | ${item.paid ? 'yes' : 'no'} |`).join('\n')
    : '| None declared | — | — | no |';
  const unresolved = readiness.validation.unresolved.length ? readiness.validation.unresolved.map((item) => `- \`${item}\``).join('\n') : '- None';
  return `# Project Brief\n\nGenerated from \`app.contract.json\`. Do not edit this file manually.\n\n## Product\n\n- **Name:** ${contract.project.name}\n- **Status:** ${contract.project.status}\n- **Summary:** ${contract.project.summary}\n- **Owners:** ${contract.project.owners.join(', ')}\n- **Target users:** ${contract.project.targetUsers.join(', ')}\n- **Success metric:** ${contract.project.successMetric}\n\n## Runtime\n\n- **Kind:** ${contract.runtime.kind}\n- **Language:** ${contract.runtime.language}\n- **Package manager:** ${contract.runtime.packageManager}\n- **Deployment target:** ${contract.runtime.deploymentTarget}\n\n## Data and trust boundary\n\n- **Classification:** ${contract.data.classification}\n- **Stores personal data:** ${contract.data.storesPersonalData ? 'yes' : 'no'}\n- **Stores secrets:** ${contract.data.storesSecrets ? 'yes' : 'no'}\n- **Retention:** ${contract.data.retention}\n\n## Integrations\n\n| Name | Purpose | Data shared | Paid |\n|---|---|---|---:|\n${integrationRows}\n\n## Non-functional constraints\n\n- **Accessibility:** ${contract.constraints.accessibility}\n- **Privacy:** ${contract.constraints.privacy}\n- **Reliability:** ${contract.constraints.reliability}\n- **Paid services allowed:** ${contract.constraints.paidServicesAllowed ? 'yes' : 'no'}\n\n## Unresolved decisions\n\n${unresolved}\n\n## Review\n\n- **Last reviewed:** ${contract.review.lastReviewed}\n- **Review by:** ${contract.review.reviewBy}\n- **Implementation ready:** ${readiness.ready ? 'yes' : 'no'}\n`;
}

export function fingerprint(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}
