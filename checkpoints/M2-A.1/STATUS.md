# AWS Friendly Counsellor — M2-A.1 Complete Web Application checkpoint

**Date:** 2026-10-08  
**Backend baseline:** 3.6.3-m1.5.3 local RC  
**Web milestone:** M2-A.1  
**API contract:** 1.3.0  
**Status:** LOCAL MACROSTEP PASS / GITHUB PAGES LIVE PUBLICATION NEXT

## What is complete

The former `apps/web` placeholder has been replaced by a complete dependency-free PWA suitable for GitHub Pages. It exposes all current public application capabilities through the browser while preserving the AWS backend as the authoritative security and persistence boundary.

Delivered web flows:
- Cognito Authorization Code + PKCE login/logout;
- guarded local debug mode;
- explicitly-labelled browser demo mode;
- tenant create/connect;
- dashboard;
- guided Friendly Advisor;
- project CRUD/archive;
- persisted immutable analysis history;
- cost/service/implementation results;
- Terraform generation and ZIP export;
- narrative report, HTML export and print/PDF path;
- viewer/editor/admin membership administration;
- durable audit UI;
- readiness/status;
- PWA manifest/service worker;
- GitHub Pages workflow and public runtime-config renderer.

## Validation

Final validation was rerun from a fresh extraction of the complete delivery ZIP:

- `make validate`: PASS
- backend/local tests: **103 passed**
- live AWS tests: **8 skipped by explicit guard**
- configured backend coverage: **92.38%** (threshold 90%)
- M1.5 repository preflight: PASS
- web static/security check: PASS
- JavaScript syntax check: PASS
- dependency-free demo end-to-end smoke: PASS
- repository manifest: **210 files PASS**
- ZIP integrity: PASS

A Chromium executable exists in the build container, but headless DOM execution did not complete because of the container runtime/DBus boundary. No browser-interaction evidence is falsely claimed from that attempt.

## Canonical delivery artifacts

- `AWSFC_M2-A.1_COMPLETE_WEB_APPLICATION_REPOSITORY.zip`
  SHA-256: `f5ca2d2b9959954b82263ca4edaada9bb9028248afab5540a0aec3e3c2d0999d`
- `AWSFC_M2-A.1_GITHUB_PAGES_WEBAPP.zip`
  SHA-256: `590dd99315acd9f5bbcc9088afcedfcca3180dfc51ca92179b2b2437690dddb1`
- `AWSFC_M2-A.1_EVIDENCE.zip`
  SHA-256: `4e36024b239c93699fc594f738eefbddd58d2e7dae69e469745f41ca5c5d15b7`

The complete source archives are project-delivery artifacts. This GitHub branch is a recovery/checkpoint marker because the repository's existing `main` still contains legacy project/portfolio material rather than the current monorepo.

## Exact next macrostep — M2-B

1. migrate the full monorepo source tree to a dedicated GitHub development branch without overwriting legacy `main`;
2. validate the GitHub Actions Pages workflow in the real repository;
3. enable GitHub Pages from Actions;
4. configure public repository variables for API base URL and Cognito public-client values;
5. configure exact Cognito callback/logout URLs and backend CORS origin;
6. publish the site;
7. run the complete browser journey against AWS staging;
8. keep M1.5 live acceptance pending until AWS Cognito/API Gateway/DynamoDB/WAF/CloudWatch/CloudTrail/canary/PITR evidence passes.

Do not call the application production-ready merely because the static Pages UI is complete.
