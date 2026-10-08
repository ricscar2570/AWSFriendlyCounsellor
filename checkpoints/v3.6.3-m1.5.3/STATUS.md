# AWS Friendly Counsellor — v3.6.3-m1.5.3 checkpoint

**Date:** 2026-10-08  
**Status:** LOCAL RELEASE CANDIDATE PASS / LIVE AWS M1.5 ACCEPTANCE PENDING  
**Contract:** 1.3.0

## Canonical working state

The current working candidate is `v3.6.3-m1.5.3`. It was functionally reconstructed from the last raw source baseline available to the development environment (`v3.6.1-m1.5.1`), the documented v3.6.2 A01–A13 remediation, and the independent v3.6.2 R01–R14 re-audit requirements.

The exact raw bytes of the generated v3.6.2 ZIP could not be rematerialized in the active development runtime, so this checkpoint must not be described as a byte-for-byte rebase of that ZIP. Every known A01–A13 and R01–R14 finding has an explicit implementation/test path in the local RC.

## Local acceptance evidence

- `make validate`: PASS.
- Local tests: **103 passed**.
- Live AWS tests: **8 skipped by explicit guard**; they are not counted as successes.
- Configured application/contract coverage: **92.38%** (required 90%).
- Repository M1.5 preflight: **27 PASS / 0 WARN / 0 FAIL**.
- Reconstructed A/R regression module: **24 PASS**.
- Source manifest: **186 files**, read-only verification PASS.
- Final ZIP CRC/integrity: PASS.
- Final ZIP re-extracted and `make validate` rerun: **103 passed / 8 skipped / 92.38% / manifest PASS**.
- Lambda standalone package stale-member regression: PASS.

## Security / correctness work closed locally

A01–A13: Cognito property, DynamoDB transaction serialization, first-analysis CAS, MFA collector API, owner invariant, non-production IAM scope, AWS account/role identity, canary causality, CloudTrail scope/status, normalized empty inputs, cursor bounds, workflow concurrency, shell-input handling.

R01–R14: token redaction, privileged ownership race policy, archive-vs-analysis atomic barrier, collector semantic checks, CodeDeploy permission, Contributor Insights permissions, WAF/body byte alignment, integer bounds, DynamoDB cursor validation, fresh Lambda ZIP packaging, SQLite in-memory readiness, Terraform MFA, Terraform Cognito authorizer wiring, region reconciliation.

Ownership is deliberately immutable through the generic membership API in this RC. A future owner-transfer primitive must revalidate actor authority atomically.

## Final artifacts and SHA-256

- `AWSFC_v3.6.3-m1.5.3_LOCAL-RC_COMPLETE-REPOSITORY.zip`  
  `9d1a67c4c102689ea216f6eb6b912c5b30608c6847279e531a6060d7980dee38`
- `AWSFC_v3.6.3-m1.5.3_LOCAL-RC_EVIDENCE.zip`  
  `81d140314bb1caf16f693f04b776fa38939a25fc27bf2c5cee30b71db0679bbb`
- `AWSFC_v3.6.3-m1.5.3_LAMBDA_SOURCE_LAYOUT_ARM64.zip`  
  `2076dfac53ce97cb6ee2ad4c315da767766c490ec2dc7ffb438128d8bb34c266`

The complete source archive is retained as the generated project artifact from the development session. This branch is a recovery/checkpoint marker; the pre-existing GitHub `main` branch contains legacy project material and was intentionally not overwritten.

## Exact continuation point

Do not begin production or call M1.5 accepted yet. The next gate is:

1. clean install using Python 3.12 and exact pins;
2. SAM/CloudFormation semantic lint for application and bootstrap;
3. containerized arm64 `sam build` and real Lambda-handler package exercise;
4. Terraform fmt/validate/plan for all supported generated bundles;
5. isolated AWS staging account + protected GitHub `staging` environment;
6. Cognito/TOTP/API Gateway/DynamoDB/WAF/CloudWatch/CloudTrail live proof;
7. causal CodeDeploy canary rollback drill;
8. DynamoDB PITR functional restore drill;
9. fill `docs/M1_5_ACCEPTANCE_RECORD.md` with exact commit/ref, account, region, runs and hashes;
10. external security testing before production.

**Do not merge this checkpoint branch into legacy main solely to obtain a green status.** First decide whether the GitHub repository should be migrated to the new monorepo source tree or preserved as a legacy/public portfolio surface.
