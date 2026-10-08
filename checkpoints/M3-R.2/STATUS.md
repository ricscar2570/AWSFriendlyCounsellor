# AWS Friendly Counsellor — M3-R.2 full historical reconciliation checkpoint

**Date:** 2026-10-08  
**Application release:** 3.17.1-m3r / M3-R.2  
**API contract:** 1.13.0  
**Status:** FULL HISTORICAL RECONCILIATION LOCAL PASS / GITHUB PAGES PUBLISHED / AWS LIVE STAGING ACCEPTANCE PENDING

## Reconciliation scope

M3-R.2 reconciles the hardened 3.6.3-m1.5.3 security/tenant/audit baseline with the historical M2.6 through M3.4 / v3.12.0 through v3.16.0 product and FinOps capabilities.

Reconciled capabilities include:
- hybrid rule/Naive-Bayes advisory classification and AWS service recommendations;
- Essential / Balanced / Resilient scenarios;
- ADR and provenance-rich reports;
- explicit usage-quantity cost planning;
- cost optimization and interactive visualization data;
- gamification badges and leaderboard feedback;
- GDPR data access/export/delete flows;
- AWS Price List GetProducts pricing with SKU/rate provenance and fallback/circuit breaker;
- tier-aware, transfer-aware and account-aware pricing;
- persisted Pricing Calculator estimates with append-only revisions, refresh/expiry and reconciliation;
- Cost Explorer GetCostAndUsage snapshots;
- CUR 2.0 import using canonical import-cur plus compatibility alias;
- forecast-vs-actual reconciliation, thresholds and alerts;
- actual-cost append-only revisions/audit paths.

## Clean local gate

The complete delivery archive was re-extracted into a clean directory and validated again:
- **116 tests PASS**
- **8 live-AWS tests SKIP** by explicit environment guard
- total configured coverage **92.53%**
- M1.5 repository preflight **31 PASS / 0 WARN / 0 FAIL**
- web structural/security check PASS
- browser ES-module syntax checks PASS
- demo baseline smoke PASS
- demo 55-project pagination PASS
- M3-R demo pricing/estimate/actual/CUR/badge smoke PASS
- standards-compliant Terraform ZIP PASS under independent unzip verification
- manifest **247 files PASS**

## GitHub Pages publication

Repository: `ricscar2570/AWSFriendlyCounsellor`

Audited M3-R.2 web payload source commit:
`9955f9382548638431f2a039f3749122a0cb9d67`

Provenance-config commit:
`47e388abae3f2f18af79c9dbcc9e169c95df73e1`

Cleaned public main:
`d9a1eabe280ec2859de4ed8dfe7a09ba7ebf858c`

Web CI:
- run `37783644827`
- conclusion **SUCCESS**

GitHub Pages:
- run `37783645278`
- conclusion **SUCCESS**
- source: provenance-config commit

A final Pages run is also triggered by the cleanup-only main commit; this cleanup deletes only temporary sync transport files and does not alter `app/`.

Published application path:
`https://ricscar2570.github.io/AWSFriendlyCounsellor/app/`

The generic external-fetch layer used by the development environment cannot fetch the github.io URL, so no independent HTTP/browser-render success is claimed beyond GitHub's own Pages deployment evidence.

## Delivery artifacts

- `AWSFC_M3-R.2_FULL_HISTORICAL_RECONCILIATION_COMPLETE_APPLICATION.zip`
  SHA-256: `bca57326ad14ae532314459f1019e413402762393396441e7c797b3d90cc5024`
- `AWSFC_M3-R.2_GITHUB_PAGES_WEBAPP.zip`
  SHA-256: `6729829f7acf9286ef5656729a13c13ad2c3665c5e58ab1db7bb1d906a0bd81e`
- `AWSFC_M3-R.2_EVIDENCE.zip`
  SHA-256: `f1faa5500d2e7a90fd77a4e6c1d2738556468be7a6d71906a00ce678dd58fb0d`

## Remaining acceptance boundary

M3-R.2 restores the functionality locally and in the static web product, but it does not convert simulated/local evidence into AWS-live evidence.

The next macrostep is **AWS Staging Integration & Live Acceptance**:
1. Python 3.12 clean install and exact pins;
2. SAM/CloudFormation semantic validation + arm64 build;
3. Terraform validate/plan;
4. isolated staging AWS account via OIDC;
5. Pages CORS + Cognito callback/logout;
6. Cognito sign-in/TOTP and API Gateway authorizer proof;
7. tenant/RBAC/project/analysis/FinOps journeys against DynamoDB;
8. live Price List / Pricing Calculator where supported;
9. Cost Explorer and CUR evidence with authorized test data;
10. WAF/CloudWatch/CloudTrail;
11. causal CodeDeploy rollback;
12. PITR functional restore;
13. complete M1.5/live acceptance record.

Do not call production-ready or AWS-live-complete before those gates pass.
