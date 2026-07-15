# app — Application Bootstrap Contract

This repository intentionally does not choose a framework or invent a product. It provides a small, dependency-free contract that must describe the application, users, runtime, data boundary, integrations, non-functional constraints, and review window before implementation begins.

## Current status

The committed contract is in **discovery**. It is structurally valid, but deliberately not implementation-ready because the product and runtime decisions are still unresolved.

## Commands

Requires Node.js 20 or newer.

```bash
npm ci --ignore-scripts
npm test
npm run check
npm run render
npm run readiness
```

- `npm run check` validates `app.contract.json`, verifies the generated brief, rejects populated environment files, and writes `reports/app-contract.json`.
- `npm run render` regenerates `docs/PROJECT_BRIEF.md` deterministically.
- `npm run readiness` fails until the project is approved, all placeholders are resolved, and the review date is current.
- `npm run ci` runs tests plus the contract check.

## Bootstrap workflow

1. Replace every `to-be-defined`, `undecided`, and placeholder owner in `app.contract.json`.
2. Record only integrations that are actually planned, including data shared and whether they are paid.
3. Set `project.status` to `approved` only after the product owner accepts the brief.
4. Run `npm run render && npm run readiness`.
5. Select a stack and add application code in a separate reviewed change.

The contract is not a substitute for architecture or threat modeling. It is the gate that prevents those decisions from being silently invented.
