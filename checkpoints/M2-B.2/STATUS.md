# AWS Friendly Counsellor — M2-B.2 deep-audit checkpoint

**Date:** 2026-10-08  
**Hardened backend baseline:** 3.6.3-m1.5.3  
**Web milestone:** M2-B.2  
**API contract:** 1.3.0  
**Status:** CURRENT LINE PASS / HISTORICAL FUNCTION-PRESERVATION RECONCILIATION REQUIRED BEFORE AWS STAGING

## Why M2-B.2 exists

A differential audit of M2-B.1 found defects that the previous green gate did not detect. All confirmed defects in the current v3.6.x + Pages line were remediated and regression-protected.

Closed defects:
1. malformed Terraform ZIP download;
2. local browser mode blocked by CSP/backend CORS mismatch;
3. first-page-only project/analysis/membership/audit lists;
4. unnecessary repeated /me/tenant/health calls consuming rate-limit budget;
5. sandbox-blocked report Print/PDF;
6. optional tenant slug submitted as an invalid blank string;
7. incomplete PKCE callback error/expiry lifecycle;
8. service-worker caching of OAuth query-bearing navigations;
9. pagination runtime used queryParams() without importing it;
10. dashboard labels could imply global totals/latest values when only a page/sample was loaded;
11. remote module-import regression discovered during synchronization and closed before final freeze.

Additional remediation:
- demo mode now exercises cursor pagination;
- dashboard marks loaded counts with + when more data exists;
- project edit fields are required client-side;
- browser modules are parsed explicitly as ES modules in the remote CI;
- remote Pages CI verifies pagination/import, PKCE age bound, service-worker OAuth no-store behavior, report print sandbox, demo pagination and a standards-compliant Terraform ZIP.

## Local verification

Final clean repository gate:
- **106 tests PASS**
- **8 live-AWS tests SKIP by explicit guard**
- configured coverage **92.38%**
- M1.5 repository preflight **31 PASS / 0 WARN / 0 FAIL**
- web structural/security check PASS
- demo smoke + 55-project pagination PASS
- standards-compliant browser Terraform ZIP PASS
- manifest **218 files PASS**
- structured JSON/TOML/YAML parsing PASS
- shell syntax PASS
- secret-like material scan PASS

The complete delivery ZIP was freshly extracted and the full `make validate` gate passed again with **106 PASS / 8 SKIP / 92.38% / manifest PASS**.

## GitHub / Pages evidence

Pages repository: `ricscar2570/AWSFriendlyCounsellor`

Final remote CI source commit:
`c35939470006323e9dc903fc4e26344d35543837`

Web CI:
- run `37764761732`
- conclusion **SUCCESS**

Native GitHub Pages:
- run `37764760122`
- conclusion **SUCCESS**

Environment root reported by GitHub:
`https://ricscar2570.github.io/AWSFriendlyCounsellor/`

Application path:
`https://ricscar2570.github.io/AWSFriendlyCounsellor/app/`

The preparation environment could not independently fetch the Pages URL through its generic web-fetch layer, and local Chromium cannot complete headless DOM execution in the container because its DBus runtime is absent. Neither limitation is reported as a browser PASS.

## Critical lineage finding

The current hardened v3.6.x line does **not** contain every historical AWS Friendly Counsellor capability. Previous wording that the Pages conversion had already preserved all historical functionality was therefore too strong.

Before AWS staging, the hardened line must reconcile at least:
- legacy ML-assisted classification/service recommendation;
- cost simulation/optimization visualizations;
- interactive charts;
- gamification/badges/leaderboard-style feedback where still part of the product;
- GDPR data access/export/deletion flows;
- M2.6 scenarios Essential / Balanced / Resilient, ADR, provenance-rich reports and usage-quantity planning;
- M3.1 AWS Price List GetProducts dynamic public pricing and provenance;
- M3.2 tier/transfer/account-aware pricing;
- M3.3 persisted Pricing Calculator estimates, revisions, expiry and reconciliation;
- M3.4 Cost Explorer/CUR actual-cost snapshots and forecast-vs-actual reconciliation.

These features must be recovered from historical sources or equivalently reimplemented against the hardened Cognito/RBAC/tenant/audit model. They must not be silently discarded.

## Delivery hashes

- `AWSFC_M2-B.2_COMPLETE_DEEP_AUDIT_REMEDIATED_REPOSITORY.zip`  
  SHA-256: `129e416491fca847a1935b6e4f40c8a85f24e79c2851597d75efc3c790a7b9ab`
- `AWSFC_M2-B.2_GITHUB_PAGES_WEBAPP.zip`  
  SHA-256: `a3533034fe2197baefb4527a9202ff72f53b0cecaa6fa0dbc5bb8b265fe03875`
- `AWSFC_M2-B.2_EVIDENCE.zip`  
  SHA-256: `4afa1f9479148ae945a9f0171cf1bd9b3871fda897a3df8478d0170bba99e31b`

## Exact next macrostep

**M3-R — Full Historical Functionality Reconciliation.**

The next macrostep must recover or equivalently reimplement the historical product/FinOps capabilities into this hardened M2-B.2 baseline, expose them in the web application, add additive migrations/contracts/tests, and again deliver the entire application. AWS staging remains blocked until that macrostep is locally and remotely green.
