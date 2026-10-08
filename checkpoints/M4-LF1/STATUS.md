# AWS Friendly Counsellor — M4-LF1 Local-First Standalone checkpoint

**Date:** 2026-10-08  
**Application release:** 3.18.0-m4lf1 / M4-LF1  
**API contract:** 1.13.0  
**Status:** STANDALONE PRODUCT PASS / OPTIONAL AWS CONNECTOR LIVE ACCEPTANCE PENDING

## Product architecture

M4-LF1 makes Standalone the default runtime. The browser application no longer requires an AWS backend, a cloud account, Cognito, API Gateway or DynamoDB in order to use the product.

Standalone provides:
- local workspace and team model;
- Advisor/classification/recommendations;
- Essential/Balanced/Resilient scenarios and ADR;
- project persistence and immutable analysis versions;
- pricing snapshot engine and importable pricing catalogs;
- explicit-usage cost planning and regional scenarios;
- local estimate revisions and reconciliation;
- manual actual-cost snapshots and CUR import;
- forecast-vs-actual;
- Terraform and narrative/report generation;
- audit, badges/leaderboard and privacy workflows;
- IndexedDB-first vault with localStorage fallback;
- complete backup, restore and reset.

The AWS path remains an optional connector for live AWS semantics. The standalone runtime never fabricates Cost Explorer, CloudTrail, WAF, Cognito, CodeDeploy or PITR evidence.

## Zero-network proof

The standalone-dispatch smoke replaces `fetch()` with a failing stub, then executes health, workspace creation, Advisor and backup through the real API dispatcher.

Result: **fetchCalls = 0**.

## Complete release validation

The complete delivery ZIP was extracted into a clean directory and `make validate` was rerun.

Results:
- **116 tests PASS**
- **8 live-AWS tests SKIP** by explicit guard
- Python coverage **92.53%**
- M1.5 repository preflight **31 PASS / 0 WARN / 0 FAIL**
- standalone structural/security check PASS
- JavaScript ES-module syntax PASS
- demo/M3-R compatibility smoke PASS
- standalone full smoke PASS
- zero-network smoke PASS
- Terraform browser ZIP independently verified PASS
- source manifest **252 files PASS**
- supply-chain evidence current

The standalone web ZIP was also extracted independently:
- standalone smoke PASS
- zero-network smoke PASS
- Terraform ZIP PASS
- static HTTP proof: app shell, standalone engine, vault, runtime config and manifest all returned HTTP 200.

## Delivery artifacts

- `AWSFC_M4-LF1_LOCAL_FIRST_STANDALONE_COMPLETE_APPLICATION.zip`  
  SHA-256: `22282dcddf5c4cbc5c5b3e79ba6c55a68e02fe08b266504544bf880a5bfb8945`
- `AWSFC_M4-LF1_GITHUB_PAGES_STANDALONE_WEBAPP.zip`  
  SHA-256: `f949fc627d3edb1468f406dcb9cbec6327da4cf23b04ab89edd7ec5a17852e9f`
- `AWSFC_M4-LF1_EVIDENCE.zip`  
  SHA-256: `3f2c7e7c0b609a2543f54ded4878dff9e45c43192885d40a69280eabab478c20`

## GitHub publication boundary

The public Pages repository still serves the proven M3-R.2 application. An attempted M4-LF1 binary transport through the repository connector was detected as truncated before publication; the incomplete transport files were removed in commit:

`c06eafc72b61cd0b2f08e03f4074eab2ead26f7b`

No incomplete M4-LF1 web tree was published and no M3-R.2 application files were overwritten.

M4-LF1 should be published to Pages only from the byte-exact standalone web ZIP above (or from the complete M4-LF1 repository), then its Pages/CI run should be verified.

## Next gate

M4-LF1 itself is usable without AWS. The next work is not required to use the standalone product.

Optional next gates:
1. publish the byte-exact M4-LF1 static app to GitHub Pages;
2. real-browser IndexedDB/PWA lifecycle evidence;
3. optional AWS connector staging proof for live Cognito/Cost Explorer/CUR/WAF/CloudTrail/rollback/PITR semantics.
