# AWS Friendly Counsellor Web — M3-R.2

This directory is a dependency-free progressive web application designed for GitHub Pages or any static host. It is not a mockup: every backend capability exposed by API contract 1.13.0 has a browser workflow.

## Modes

- **Demo**: browser-local deterministic simulation. Useful for GitHub Pages previews and offline evaluation. It is visibly labelled and does not claim AWS evidence.
- **Local**: connects to a local/test API using the backend's explicitly guarded debug-identity headers.
- **Cognito**: Authorization Code + PKCE against a Cognito Hosted UI; tokens live in `sessionStorage`, and the API remains authoritative for RBAC, tenant isolation, audit and persistence.

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

Published application: `https://ricscar2570.github.io/AWSFriendlyCounsellor/app/`.
