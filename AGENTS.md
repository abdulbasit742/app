# AGENTS.md

## Scope

These instructions apply to the entire `abdulbasit742/app` repository.

The repository is a framework-neutral application bootstrap contract. No product stack is approved yet.

## Source of truth

- `app.contract.json`: human-edited product/runtime/data decision record
- `docs/PROJECT_BRIEF.md`: generated summary; never edit manually
- `scripts/contract-core.mjs`: validation/readiness rules
- `tests/contract.test.mjs`: regression contract

## Working rules

1. Do not add an application framework, database, deployment service, paid integration, or production dependency while `npm run readiness` fails.
2. Resolve product decisions in `app.contract.json`, then run `npm run render`.
3. Keep validation deterministic and dependency-free.
4. Never put secret values in the contract, report, README, generated brief, tests, or environment example.
5. Add runtime-specific instructions only after the contract is approved.

## Verification

```bash
npm ci --ignore-scripts
npm test
npm run check
```

`npm run readiness` is expected to fail while the project remains in discovery.
