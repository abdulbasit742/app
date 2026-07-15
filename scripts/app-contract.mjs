#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fingerprint, isImplementationReady, renderBrief, validateContract } from './contract-core.mjs';

const root = process.cwd();
const contractPath = path.join(root, 'app.contract.json');
const briefPath = path.join(root, 'docs', 'PROJECT_BRIEF.md');
const reportPath = path.join(root, 'reports', 'app-contract.json');
const command = process.argv[2] || 'check';

function readContract() {
  try {
    return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    console.error(`Cannot read app.contract.json: ${error.message}`);
    process.exit(1);
  }
}

function writeReport(contract, validation, readiness, brief) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    valid: validation.valid,
    implementationReady: readiness.ready,
    errors: validation.errors,
    unresolved: validation.unresolved,
    blockers: readiness.blockers,
    contractFingerprint: fingerprint(JSON.stringify(contract)),
    briefFingerprint: fingerprint(brief),
  }, null, 2)}\n`);
}

const contract = readContract();
const validation = validateContract(contract);
const readiness = isImplementationReady(contract);
const brief = renderBrief(contract);
writeReport(contract, validation, readiness, brief);

if (command === 'render') {
  if (!validation.valid) {
    validation.errors.forEach((error) => console.error(`ERROR: ${error}`));
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(briefPath), { recursive: true });
  fs.writeFileSync(briefPath, brief);
  console.log(`Rendered ${path.relative(root, briefPath)}`);
} else if (command === 'readiness') {
  if (!readiness.ready) {
    readiness.blockers.forEach((blocker) => console.error(`BLOCKER: ${blocker}`));
    process.exit(1);
  }
  console.log('Application contract is approved and implementation-ready.');
} else if (command === 'check') {
  validation.errors.forEach((error) => console.error(`ERROR: ${error}`));
  const storedBrief = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf8') : '';
  if (storedBrief !== brief) {
    console.error('ERROR: docs/PROJECT_BRIEF.md is stale; run npm run render');
    process.exitCode = 1;
  }
  const forbidden = fs.readdirSync(root).filter((name) => /^\.env(?:\.|$)/.test(name) && name !== '.env.example');
  if (forbidden.length) {
    console.error(`ERROR: populated environment file(s) present: ${forbidden.join(', ')}`);
    process.exitCode = 1;
  }
  if (!validation.valid) process.exitCode = 1;
  if (!process.exitCode) console.log(`Contract valid; ${validation.unresolved.length} implementation decision(s) remain unresolved.`);
} else {
  console.error('Usage: node scripts/app-contract.mjs <check|render|readiness>');
  process.exit(2);
}
