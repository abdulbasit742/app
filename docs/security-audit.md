# Bootstrap security audit

## Controls

- The contract records data classification, personal-data handling, secret handling, integrations, paid-service policy, and review expiry.
- Unknown fields are rejected to prevent important decisions from being misspelled and silently ignored.
- A non-discovery project with unresolved placeholders is invalid.
- Paid integrations cannot be declared while paid services are disallowed.
- `npm run readiness` fails when review is stale.
- Populated `.env*` files are rejected by the repository check.
- Reports contain fingerprints and decision paths, not secret values.

## Residual risks

- The contract cannot prove that future code matches declared behavior.
- Human approval is represented by the `approved` status; there is no cryptographic signature or external approval system.
- The placeholder owner must be replaced before implementation.
- CI validates syntax and policy only; application tests begin after a runtime is selected.
