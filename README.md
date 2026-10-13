# qone-enrollment-portal

> enrollment bounded context: web UI (remote)

Part of the **Qampus (Quorum One)** distributed system — team `quorum-one`, Grupo 1.
Governance and documentation live in [`qone-docs`](https://github.com/code-corhuila/qone-docs).

## Purpose

The web portal of the **enrollment** domain (course norm 5.4, Annex H): the academic record
and the pensum, the enrollment of a section through the `enroll-student` saga, the weekly
schedule, the verifiable certificates and the roster a professor reads. It is a Module
Federation **remote** named `enrollment` that exposes `./App` (and `./mocks` for synthetic
data); `qone-front` mounts it at `/enrollment/*`. The portal owns only its screens: the HTTP
client and the session come from the shell and the portal never knows the gateway URL or the
token (norm 5.4.1, verified on the built bundle by `scripts/check-isolation.sh`).

Specification: `07-api/contracts/openapi/qone-enrollment-api.yaml` (EN-01..EN-14) and
`qone-workflow.yaml` (WF-01..WF-03), `06-data/models.md` (schema `enrollment`), ADR-008 (the
saga), ADR-007 and ADR-009 in `qone-docs`. Stories: `code-corhuila/qone-docs#42` (HU-ENR-001),
`#44` (HU-ENR-002), `#45` (HU-CER-001), `#48` (HU-WEB-002).

## How to run it

Requirements: Node 22 LTS (or 24), npm, and the shell (`qone-front`) running at `VITE_SHELL_URL`.

```bash
cp .env.example .env        # VITE_SHELL_URL only; .env is ignored by git
npm ci
npm run dev                 # http://localhost:5003 (standalone) - or open /enrollment in the shell
```

Checks (`ci.yml` runs the same on every pull request):
```bash
npm run typecheck           # TypeScript strict
npm test                    # Vitest + Testing Library + MSW; contract tests against the synced YAML
npm run build               # remoteEntry.js and assets in dist/
npm run check:isolation     # no gateway URL, no token handling, no raw fetch in dist/
```

`npm run contracts:sync [ref]` refreshes the contract copies in `contracts/openapi/` from `qone-docs`.

## Dependencies

- `qone-front` at `VITE_SHELL_URL`: `shell/apiClient`, `shell/session` and the mount point `/enrollment/*`.
- `qone-enrollment-api`, `qone-workflow` and `qone-catalog-api` behind the gateway; with the shell's `VITE_USE_MOCKS=true` the fixtures answer.

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `qone-docs`.
