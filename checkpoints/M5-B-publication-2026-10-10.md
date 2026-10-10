# AWS Friendly Counsellor — M5-B publication checkpoint

Date: 2026-10-10 (Europe/Rome).

## Exact interruption recovered

Repository: `ricscar2570/AWSFriendlyCounsellor`.
At resumption, `main` was `875efdd901d24a938cb3998dac0a770be540e4b2`.
M5-B Desired vs Actual and its strict-CSP correction were already implemented.
PR #10, "Stamp remediated M5-B provenance", was still open, with a successful CI run.
Its only change was `app/web-config.js:sourceSha`.

## Work completed in this continuation

- Reviewed the PR diff and its successful required browser/PWA gate.
- Merged PR #10 with the expected head SHA
  `2fa21aaeee6fc8c9db7a9f06f9559b9f4679ec54`.
- Resulting release/provenance commit:
  `15da3db1c2d0879886aba215e4362f154ed85c0d`.
- Runtime remains `M5-B`; functional source reference is now
  `875efdd901d24a938cb3998dac0a770be540e4b2`.
- No new functional feature or AWS infrastructure change was made in this continuation.

## Verification evidence

| Check | Result |
| --- | --- |
| All 10 `app/tests/*.mjs` entrypoints run locally | PASS |
| `python app/tests/collector-smoke.py` with synthetic AWS responses | PASS |
| Release CI run [38025651989](https://github.com/ricscar2570/AWSFriendlyCounsellor/actions/runs/38025651989) on `15da3db` | SUCCESS |
| Required Chromium/PWA smoke in that CI run | PASS; log explicitly records BROWSER SMOKE PASS |
| Pages build/deployment [38025651515](https://github.com/ricscar2570/AWSFriendlyCounsellor/actions/runs/38025651515) | SUCCESS |
| Live HTTP comparison against the checked-out release | 26/26 application and collector files byte-identical |

The live comparison includes tracked application assets, HTML, JavaScript, manifest,
pricing snapshot and collector. It excludes README, test files and the .nojekyll marker.
The browser smoke exercises workspace/project creation, persisted analysis, discovery
import and relationship rendering, project-scoped assessment, backup export, reload
persistence, service worker control and offline reload; it rejects application console errors.
These checks are not proof of every possible product behavior.

The additional local Chromium run was not completed: Playwright installed, but the
browser download returned invalid/truncated archives. Browser evidence comes from the
successful GitHub runner on the exact release commit, not from a claimed local run.

## Live application

https://ricscar2570.github.io/AWSFriendlyCounsellor/app/

Use the `/app/` URL. The repository-root page and older `frontend/` and `backend/`
trees are historical and are not the M5-B application entrypoint.

## Current functional boundary

M5-B compares persisted recommended scenarios with imported discovery evidence.
`AWSFCProjectId` tags establish project scope; untagged account/region evidence is
only a candidate scope. Discovery errors must remain visible and are not evidence
of resource absence. The assessment and JSON export run locally after import.

This continuation did not access an AWS account, run live AWS discovery, deploy an
AWS stack or execute remediation. Synthetic collector tests do not establish live
account correctness. Connector-side Desired-vs-Actual is not in API contract 1.13.0.

## Resume instructions

1. Fetch current `main` and compare against this checkpoint before editing.
2. The pending PR #10 and M5-B publication are finished; do not repeat them.
3. For real-account acceptance, use a fresh discovery bundle collected read-only
   with the user's existing authorized AWS profile and resource tags, then review
   coverage gaps and expected findings. No credentials should be added to the web app.
4. Preserve the existing standalone and optional AWS connector modes.
5. Record subsequent work and its verification in the repository before changing chats.
