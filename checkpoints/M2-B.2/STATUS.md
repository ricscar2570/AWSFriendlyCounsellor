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
10. dashboard labels could imply global totals/latest values when only a page/sample was loaded.

Additional remediation:
- demo mode now exercises cursor pagination;
- dashboard marks loaded counts with + when more data exists;
- project edit fields are required client-side;
- remote Pages CI now checks JS syntax, pagination import, PKCE age bound, service-worker OAuth no-store behavior, report print sandbox, demo pagination and an independently verified Terraform ZIP.

## Local verification

Clean repository gate:
- 106 tests PASS
- 8 live-AWS tests SKIP by explicit guard
- configured coverage 92.38%
- M1.5 repository preflight 31 PASS / 0 WARN / 0 FAIL
- web structural/security check PASS
- demo smoke + 55-project pagination PASS
- standards-compliant browser Terraform ZIP PASS
- manifest: 217 files PASS
- structured JSON/TOML/YAML parsing PASS
- shell syntax PASS
- secret-like material scan PASS
- real local HTTP/CORS/pagination/analysis/IaC/narrative journey PASS

The complete delivery ZIP was then freshly extracted and the full gate passed again: 106 PASS / 8 SKIP / 92.38% / manifest PASS. The standalone web ZIP was also re-extracted; JS syntax, demo pagination and ZIP integrity passed independently.

## GitHub / Pages evidence

Pages repository: ricscar2570/AWSFriendlyCounsellor

Final M2-B.2 source commit:
`397ae60ef7e108e5832e4c6130f21cc6e2c0773b`

Web CI:
- run 37764293744
- conclusion SUCCESS

Native GitHub Pages:
- run 37764291705
- conclusion SUCCESS

Environment root reported by GitHub:
`https://ricscar2570.github.io/AWSFriendlyCounsellor/`

Application path:
`https://ricscar2570.github.io/AWSFriendlyCounsellor/app/`

## Critical lineage finding

The current hardened v3.6.x line does **not** contain every historical AWS Friendly Counsellor capability. Therefore previous wording that the Pages conversion already preserved "all" historical functionality was too strong.

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

- `AWSFC_M2-B.2_DEEP-AUDIT_COMPLETE_APPLICATION_REPOSITORY.zip`
  SHA-256: `5d10b207db4d626340f519559e43874e747ee81f8bf684fafcc427bcf8c4c137`
- `AWSFC_M2-B.2_GITHUB_PAGES_WEBAPP.zip`
  SHA-256: `706f797d3bf44867a6d52d3656ce199cd92d4b2030b1a80d8fa7e1ce8d8e2034`
- `AWSFC_M2-B.2_EVIDENCE.zip`
  SHA-256: `d16becde549e84dcfcf04f5141913cc75583b492bd1084ea8c09e50984433402`

## Exact next macrostep

**M3-R — Full Historical Functionality Reconciliation.**

The next macrostep must merge/reimplement the historical product/FinOps capabilities into this hardened M2-B.2 baseline, expose them in the web application, add migrations/contracts/tests, and again deliver the entire application. AWS staging remains blocked until that macrostep is locally and remotely green.
