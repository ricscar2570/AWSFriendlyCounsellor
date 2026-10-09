# AWS Friendly Counsellor Web — M5-A1 Read-Only AWS Discovery

This directory is a dependency-free progressive web application designed for GitHub Pages or any static host. It is not a mockup: the complete product can run without a backend; API contract 1.13.0 remains available for optional connectors.

## Modes

- **Standalone (default)**: full local-first application. Projects, analyses, FinOps, audit, backup/restore, reports and Terraform work without AWS or any backend.
- **Demo**: disposable browser-local simulation for evaluation.
- **Local**: connects to a local/test API using the backend's explicitly guarded debug-identity headers.
- **AWS connector (optional)**: Cognito Authorization Code + PKCE against the existing API when live AWS evidence is desired; tokens live in `sessionStorage`.

No AWS access key, client secret or database credential belongs in this directory.

## Run locally

From the repository root:

```bash
python -m http.server 5173 --directory app
```

Open `http://localhost:5173`. For a local API, set Settings -> Local debug and point the API URL at the running backend. The backend must include the web origin in `ALLOWED_ORIGINS`.

## GitHub Pages

The application uses hash routing, relative assets, `.nojekyll`, a web manifest and a service worker, so it can be hosted under a repository sub-path without recompilation. `web-config.js` contains public runtime defaults only; staging/production API and Cognito values can be entered in Settings or supplied by a deployment-specific generated config.

For Cognito, configure callback and sign-out URLs to the exact Pages/custom-domain URL and add the same origin to backend `ALLOWED_ORIGINS`.

## Test

```bash
make web-check
```

This checks static structure, secret hygiene, JavaScript syntax, and the browser-local demo workflow.

## M3-R functionality

This release restores the historical M2.6–M3.4 product surface: hybrid rule/Naive-Bayes advisory classification, three architecture scenarios, ADRs, optimization suggestions, gamification, explicit usage pricing, regional simulations, public Price List provenance, account-aware Pricing Calculator estimate lifecycle, Cost Explorer/CUR actual-cost reconciliation, immutable revisions, GDPR self-service workflows, and SHA-256 provenance report bundles. Live billing integrations remain feature-flagged and account-allowlisted.

## M4-LF2 local-first hardening

Standalone mode uses IndexedDB as its primary local vault with a localStorage fallback. Full state can be exported/imported as portable JSON. The embedded pricing snapshot and deterministic advisory engine work offline. Live AWS Price List, Pricing Calculator, Cost Explorer and identity/infrastructure evidence are optional connector functions, not prerequisites for using the application.


## M4-LF2 hardening additions

- backup envelopes carry SHA-256 integrity checks and optional AES-GCM/PBKDF2 encryption;
- browser persistence can be requested explicitly and the dashboard warns when backups are stale;
- bounded local recovery checkpoints are created before mutations;
- stale cross-tab writes fail with a revision conflict instead of silently overwriting newer state;
- CUR/actual-cost CSV and NDJSON files (including gzip streams where supported) are aggregated incrementally for large imports;
- the standalone advisor uses an expanded explainable AWS knowledge catalog plus bundled Naive Bayes probabilities;
- pricing snapshots expose freshness/expiry and can be updated from an explicitly requested same-origin Pages snapshot;
- local roles are clearly labelled as organizational, not a security boundary;
- local diagnostics are redacted and exported only on explicit user action;
- PWA manifest includes 192/512 icons and the UI exposes an install action.

- standalone pricing fails closed on missing rates/regions, prices explicit transfer paths, and never synthesizes private AWS discounts;
- CUR imports reject mixed/non-USD currency and rows outside the selected date window; quoted embedded CSV newlines are preserved.


## M5-A1 AWS Reality Bridge — read-only discovery

M5-A1 adds a credential-free path from a real AWS account into the local-first application. Download `tools/awsfc-discover.py`, run it locally with an existing AWS CLI profile, and import the generated JSON from **AWS Discovery**. The collector invokes read-only/list/describe AWS APIs and stores metadata only; it never asks for or writes AWS access keys, secret keys, passwords, or session tokens.

The imported bundle is schema-validated, rejects credential-like fields/material, is deduplicated, records partial-coverage errors, is persisted in the local vault, participates in backup/recovery, and is exposed through the API facade as `/api/v1/aws/discovery` for a future authenticated live connector. This milestone is intentionally evidence ingestion, not direct browser-to-AWS access.

Example:

```bash
python app/tools/awsfc-discover.py --profile my-readonly-profile --regions eu-central-1,eu-west-1 --output awsfc-discovery.json
```
