# AWS Friendly Counsellor — M2-B.1 GitHub Pages live checkpoint

**Date:** 2026-10-08  
**Backend baseline:** 3.6.3-m1.5.3 local RC  
**Web milestone:** M2-B.1  
**API contract:** 1.3.0  
**Status:** STATIC WEB PUBLICATION PASS / AWS LIVE BACKEND ACCEPTANCE PENDING

## GitHub publication

Repository: `ricscar2570/AWSFriendlyCounsellor`

The existing legacy/portfolio root on `main` was preserved. The AWS Friendly Counsellor browser application is published as a complete static subtree at:

`main/app/`

GitHub Pages was already enabled in native branch/Jekyll mode. A temporary custom deploy workflow was removed after proving it could deploy, because retaining two Pages deployers would create a race on the same Pages environment.

GitHub-reported Pages environment root:

`https://ricscar2570.github.io/AWSFriendlyCounsellor/`

Application path in the deployed main tree:

`https://ricscar2570.github.io/AWSFriendlyCounsellor/app/`

The preparation container cannot perform an independent external HTTP fetch of that Pages URL. Publication evidence therefore consists of the exact repository tree plus successful GitHub Pages build/deploy evidence.

## Remote CI evidence

Final source commit:

`2b8a2a2f1a4d2d7441d904e66cf850e2e919360b`

AWS Friendly Counsellor Web CI:
- run `37759008650`
- conclusion: **SUCCESS**
- checks: required files, public-safe demo default, CSP, JavaScript syntax, service-worker asset closure, secret-like material scan.

Native GitHub Pages:
- run `37759008674`
- source SHA `2b8a2a2f1a4d2d7441d904e66cf850e2e919360b`
- build: **SUCCESS**
- deploy: **SUCCESS**
- environment root reported by GitHub: `https://ricscar2570.github.io/AWSFriendlyCounsellor/`

## Complete local release verification

The complete M2-B.1 repository artifact was extracted into a clean directory and validated again:

- `make validate`: PASS
- local/backend tests: **103 passed**
- live AWS tests: **8 skipped by explicit guard**
- configured coverage: **92.38%**
- M1.5 repository preflight: PASS
- web validation: PASS
- repository manifest: **212 files PASS**
- ZIP integrity: PASS

## Delivery artifacts

- `AWSFC_M2-B.1_COMPLETE_GITHUB_PAGES_APPLICATION_REPOSITORY.zip`
  SHA-256: `de919e8b3cf44d9387ceefef69e0365aa202808eb521cac8d024abada1cd00b7`
- `AWSFC_M2-B.1_GITHUB_PAGES_WEBAPP.zip`
  SHA-256: `709eb6759f0262165f7f88aea89ee3abfbcae689731b00120dc32cbbe434bc42`
- `AWSFC_M2-B.1_EVIDENCE.zip`
  SHA-256: `906e87bf16ca36fd8545e25247e2d6bfc9e77ad80ec9a4168003b88cad9ba304`

## Current product boundary

All current browser-facing capabilities are preserved: guided advisor, workspace/tenant flow, projects, immutable analysis history, cost/service results, implementation guide, Terraform ZIP generation, narrative report and print/PDF path, viewer/editor/admin membership management, audit, readiness, Cognito Authorization Code + PKCE, local debug mode, labelled demo mode and PWA/offline shell.

GitHub Pages stores no AWS access key, client secret or database credentials. Public defaults remain demo-safe.

## Exact next macrostep — M2-C

Connect the published application to an isolated AWS staging deployment and perform the complete real browser/API journey:

1. Python 3.12 clean environment and exact dependency pins;
2. SAM/CloudFormation semantic validation and arm64 build;
3. Terraform validation/plan for generated bundles;
4. AWS staging deployment;
5. exact Pages origin in backend CORS;
6. Cognito Hosted UI callback/logout URL for the Pages application;
7. browser sign-in + TOTP;
8. tenant/RBAC/project/analysis/audit end-to-end against DynamoDB;
9. WAF/CloudWatch/CloudTrail evidence;
10. causal CodeDeploy rollback;
11. PITR functional restore;
12. fill and sign M1.5 acceptance record.

Do not call M1.5 live-complete until these AWS gates pass.
