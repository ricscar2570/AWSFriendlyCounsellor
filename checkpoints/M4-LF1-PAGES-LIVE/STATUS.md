# AWS Friendly Counsellor — M4-LF1 GitHub Pages LIVE checkpoint

**Date:** 2026-10-08  
**Release:** 3.18.0-m4lf1 / M4-LF1  
**API contract:** 1.13.0  
**Status:** LOCAL-FIRST STANDALONE PASS / GITHUB PAGES LIVE / AWS CONNECTOR OPTIONAL

## Published product

Public application:

`https://ricscar2570.github.io/AWSFriendlyCounsellor/app/`

M4-LF1 is local-first by default:
- `webVersion = M4-LF1`
- `authMode = standalone`
- no backend is required for the normal product workflow;
- AWS connectivity is optional and reserved for live AWS semantics.

## Byte-exact publication proof

The exact verified standalone web archive was transported to GitHub as 15 base64 chunks. Every chunk Git blob SHA matched the locally computed expected Git blob SHA.

The one-shot publisher reconstructed the archive and verified:
- base64 SHA-256: `107cd81d5ac0550cef1de9ffc1a277b74529e396a6e233cbbc77d59c67e65a5c`
- ZIP SHA-256: `f949fc627d3edb1468f406dcb9cbec6327da4cf23b04ab89edd7ec5a17852e9f`
- ZIP integrity: PASS
- JavaScript ES-module syntax: PASS
- demo compatibility smoke: PASS
- standalone full smoke: PASS
- standalone zero-network dispatch smoke: PASS
- Terraform browser ZIP: PASS

Publisher workflow:
- run `37800552249`
- conclusion **SUCCESS**

Exact app-tree publication commit:
`05360d65259918d4985ce93833b563744c99eaa8`

Provenance stamp commit:
`1281ef3d264f49ba43fe872ee646248d32961528`

Web CI:
- run `37800662866`
- conclusion **SUCCESS**

## Final clean main and Pages proof

Temporary transfer chunks and the one-shot publishing workflow were removed after successful publication. The application tree was not altered by that cleanup.

Final public `main`:
`c0f85575ec5dea49b7dbd85124acd31cdfce1ee6`

Final native GitHub Pages deployment:
- run `37800790437`
- conclusion **SUCCESS**
- source `c0f85575ec5dea49b7dbd85124acd31cdfce1ee6`

The public tree contains `app/js/standalone.js` and `app/js/vault.js`; `app/web-config.js` declares `M4-LF1`, default `standalone`, and records the exact app-tree source SHA.

The generic external-fetch facility used during development cannot independently retrieve github.io, so GitHub's own build/deploy success is the authoritative remote publication evidence recorded here.

## Complete release validation before publication

The complete application delivery archive was re-extracted and validated:
- **116 tests PASS**
- **8 live-AWS tests SKIP** by explicit guard
- Python coverage **92.53%**
- M1.5 repository preflight **31 PASS / 0 WARN / 0 FAIL**
- source manifest **252 files PASS**
- supply-chain evidence current
- standalone structural/security check PASS
- backup/restore PASS
- custom pricing snapshot changes pricing result PASS
- zero-network standalone proof: `fetchCalls = 0`

## Delivery artifacts

- `AWSFC_M4-LF1_LOCAL_FIRST_STANDALONE_COMPLETE_APPLICATION.zip`  
  SHA-256: `22282dcddf5c4cbc5c5b3e79ba6c55a68e02fe08b266504544bf880a5bfb8945`
- `AWSFC_M4-LF1_GITHUB_PAGES_STANDALONE_WEBAPP.zip`  
  SHA-256: `f949fc627d3edb1468f406dcb9cbec6327da4cf23b04ab89edd7ec5a17852e9f`
- `AWSFC_M4-LF1_EVIDENCE.zip`  
  SHA-256: `3f2c7e7c0b609a2543f54ded4878dff9e45c43192885d40a69280eabab478c20`

## Product boundary

Standalone is the complete default product path. It does not claim that browser-local audit is CloudTrail, that manual/CUR imports are Cost Explorer calls, or that local persistence is DynamoDB PITR. Those live-cloud semantics remain available only through the optional AWS connector and require a separately accepted AWS staging/live gate.
