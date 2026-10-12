## User story

<!-- The story this change serves, as an issue of the documentation repository -->
code-corhuila/qone-docs#NN

## What changes and why

<!-- A few lines. Link the contract (qone-enrollment-api.yaml), the schema or the ADR this follows. -->

## How it was tested

<!-- Tests written before the code (ADR-009) and the result of ci.yml -->
- [ ] Core tests (no React): model, api paths and keys
- [ ] Component tests: the four states of every view, forms (label, field error, disabled button)
- [ ] Integration tests against MSW with fixtures equal to the 06-data seed
- [ ] Contract test: fixtures validate against `qone-enrollment-api.yaml`
- [ ] `ci.yml` green, including `check:isolation`

## Promotion trail

<!-- Only for pull requests to qa or main: every re-applied commit with its "(cherry picked from commit <sha>)" line (norm 10). -->

## Checklist

- [ ] No secret in the diff; `.env.example` lists every variable read
- [ ] No gateway URL, no `fetch` to the API, no token handling: everything through `shell/apiClient` (norm 5.4.1)
- [ ] Types copied from the contract, including `Page<T>` with `data` and `meta`
- [ ] Every creation sends an `Idempotency-Key` per intention and reuses it on retry (norm 5.4.2)
- [ ] Under 400 lines of change, excluding tests and generated files (norm 9.2)
- [ ] One story per branch; targets `develop`
