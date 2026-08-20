# GitHub Pages Independent Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `esrstk.github.io` with market, radar and IPO data built directly from official sources on GitHub Actions, without requiring Codex or the existing hosted data API.

**Architecture:** A Node static-data builder fetches and validates TPEx/TWSE sources, calculates current market and completed-week fields, and writes the existing public JSON shapes. The exported dashboard reads local JSON first. GitHub Actions builds and deploys only a validated artifact after the Taiwan market closes.

**Tech Stack:** Next.js static export, Node.js 22 native `fetch`, GitHub Actions, TPEx/TWSE JSON and CSV feeds, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-20-github-pages-independent-data-design.md`

## Global Constraints

- Preserve the existing layout, sorts, neutral wording, disclaimer pages and URL paths.
- Do not modify or deploy the current `chatgpt.site` website.
- Core public data must work without `DATA_API_BASE` or `NEXT_PUBLIC_DATA_API_BASE`.
- Never replace a successful JSON data file with an empty or invalid source response.
- TPEx master is the active roster authority; recent-registration data is a cross-check and supplement only.
- Exclude withdrawn, self-withdrawn, cancelled and terminated IPO applications.
- Do not turn auction dates into listing/trading dates.

---

### Task 1: Extract Testable Official Data Normalizers

**Files:**
- Create: `lib/official-static-data.mjs`
- Test: `tests/official-static-data.test.mjs`
- Reference: `scripts/refresh-official-market.mjs`, `../../site/lib/tracker.mjs`, `../../site/lib/tpex-weekly-baseline.mjs`

**Interfaces:**
- Consumes raw TPEx company/quote arrays, TPEx recent-registration table, TWSE application/auction/offering arrays, TPEx applicant rows and weekly daily-report payloads.
- Produces `mergeRecentRegistrations(masterRows, recentRows)`, `buildMarketPayload(input)`, `buildTrackerPayload(input)`, `selectWeeklyBaselines(reports, lastWeekEnd)`, and `isTerminatedApplication(note)`.

- [ ] **Step 1: Write failing source-rule tests**

```js
test("recent registrations supplement but never remove the master roster", () => {
  const rows = mergeRecentRegistrations(
    [{ SecuritiesCompanyCode: "7943", CompanyAbbreviation: "鴻璟科技" }],
    [{ code: "7944", name: "睿禾金碳", listedDate: "2026-08-19" }]
  );
  assert.deepEqual(rows.map(row => row.code), ["7943", "7944"]);
});

test("withdrawn applications are absent and auction never becomes listing date", () => {
  const payload = buildTrackerPayload(fixtureInput);
  assert.equal(payload.radar.some(row => row.code === "9999"), false);
  assert.equal(payload.radar.find(row => row.code === "8888").listingDate, "");
});
```

- [ ] **Step 2: Run `node --test tests/official-static-data.test.mjs` and confirm it fails because the module does not exist.**
- [ ] **Step 3: Implement the pure functions.** Reuse the existing industry mapping and TPEx date conversion; keep all network calls out of this module.
- [ ] **Step 4: Run `node --test tests/official-static-data.test.mjs` and confirm all source-rule tests pass.**
- [ ] **Step 5: Commit only after the user explicitly authorizes a commit.**

### Task 2: Build Direct Official Static Data

**Files:**
- Create: `scripts/build-static-data.mjs`
- Modify: `package.json`
- Modify: `public/data/market.json`, `public/data/tracker.json`, `public/data/tpex-companies.json`, `public/data/tpex-quotes.json`
- Test: `tests/build-static-data.test.mjs`

**Interfaces:**
- Consumes Task 1 normalizers and direct official fetches.
- Produces validated market and tracker payloads plus raw TPEx snapshots, written atomically.

- [ ] **Step 1: Write failing builder tests.**

```js
test("builder refuses a short roster and preserves the prior market file", async () => {
  await assert.rejects(() => writeValidatedJson(target, [{ SecuritiesCompanyCode: "1234" }], { minRows: 300 }));
  assert.equal(await readFile(target, "utf8"), priorText);
});

test("recent-registration endpoint posts the current Gregorian year", () => {
  const request = createRecentRegistrationRequest(2026);
  assert.equal(request.url, "https://www.tpex.org.tw/www/zh-tw/company/latestEmerge");
  assert.equal(request.body, "date=2026");
});
```

- [ ] **Step 2: Run `node --test tests/build-static-data.test.mjs` and confirm it fails.**
- [ ] **Step 3: Implement direct fetches for the TPEx master, TPEx latest statistics, TPEx recent registration POST endpoint, TWSE applications, TPEx applicants with official CSV fallback, TWSE auction and public-offering feeds.**
- [ ] **Step 4: Reuse TPEx daily-report logic to calculate the last valid trading session in the prior completed week. Write each output to a temporary file, validate row counts and payload shape, then rename it into place.**
- [ ] **Step 5: Replace the old `refresh:data` build path so `npm run build` invokes `npm run build:data` before `next build`.**
- [ ] **Step 6: Run `node --test tests/build-static-data.test.mjs` and `npm run build:data`; require at least 300 active market rows plus non-empty submitted IPO data before continuing.**
- [ ] **Step 7: Commit only after the user explicitly authorizes a commit.**

### Task 3: Make Core Dashboard Pages Static-First

**Files:**
- Modify: `app/Dashboard.tsx`
- Modify: `tests/static-export.test.mjs`

**Interfaces:**
- Consumes `/data/market.json` and `/data/tracker.json` from Task 2.
- Produces existing market, radar and IPO screens without an external core-data API.

- [ ] **Step 1: Write a failing static-source test.**

```js
test("core dashboard data loads from same-origin static files", async () => {
  const dashboard = await readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /fetch\("\/data\/market\.json"/);
  assert.match(dashboard, /fetch\("\/data\/tracker\.json"/);
  assert.doesNotMatch(dashboard, /chatgpt\.site|NEXT_PUBLIC_DATA_API_BASE/);
});
```

- [ ] **Step 2: Run `node --test tests/static-export.test.mjs` and confirm it fails.**
- [ ] **Step 3: Replace the core fetch helper with same-origin static reads. The Update button reloads static JSON and displays its official data timestamp; it must not promise an unsupported intraday refresh.**
- [ ] **Step 4: Keep company profile enrichment optional. A failed enhancement must show the known basic market row, not block the overlay or the core tables.**
- [ ] **Step 5: Run tests and `npm run build` after clearing both data-API environment variables.**
- [ ] **Step 6: Commit only after the user explicitly authorizes a commit.**

### Task 4: Publish Once Per Trading Weekday

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`
- Modify: `tests/static-export.test.mjs`

**Interfaces:**
- Consumes the static build from Tasks 2-3.
- Produces a post-close GitHub Pages deployment and a manual recovery action.

- [ ] **Step 1: Add a failing workflow test.**

```js
assert.match(workflow, /cron:\s*["']10 7 \* \* 1-5["']/);
assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /DATA_API_BASE|NEXT_PUBLIC_DATA_API_BASE|chatgpt\.site/);
assert.match(workflow, /npm run build/);
```

- [ ] **Step 2: Run `node --test tests/static-export.test.mjs` and confirm it fails.**
- [ ] **Step 3: Replace the fifteen-minute schedule with `10 7 * * 1-5` (15:10 Taiwan time), retain `workflow_dispatch`, and remove the hosted data API environment block.**
- [ ] **Step 4: Document GitHub schedule delay behavior, failure preservation, manual rerun, and that owner-controlled GitHub settings still govern Pages publication.**
- [ ] **Step 5: Run `npm test` and `npm run build`; confirm market, radar and IPO static output exists.**
- [ ] **Step 6: Commit only after the user explicitly authorizes a commit.**

### Task 5: Verify the Export Before Any Publication

**Files:**
- Modify: `tests/static-export.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes built `out` routes and the JSON outputs of Tasks 2-4.
- Produces a repeatable local release check while leaving the existing public site untouched.

- [ ] **Step 1: Add a test that reads `out/market/index.html`, `out/radar/index.html`, and `out/ipo/index.html` after build and verifies the core route content is present.**
- [ ] **Step 2: Run the test before a build to confirm it correctly fails when the export is missing.**
- [ ] **Step 3: Run `npm run build` then `npm test`; confirm the test passes and public data files contain no empty core arrays.**
- [ ] **Step 4: Record exact manual verification steps in the README: inspect a workflow run, open the deployment URL, check `market.json` active-row count and `tracker.json` stage counts.**
- [ ] **Step 5: Commit only after the user explicitly authorizes a commit.**

## Plan Self-Review

- Spec coverage: Tasks 1-2 cover official sources, roster authority, recent-registration cross-check, weekly-close rules, IPO stage rules, withdrawal filtering and no-empty-output safeguards. Task 3 removes core hosted-service dependence. Task 4 adds post-close publication. Task 5 makes the release check reproducible.
- Placeholder scan: no deferred or undefined work items remain.
- Interface consistency: all public payloads retain the current `market.json` and `tracker.json` contract used by the dashboard.

## Execution Handoff

The plan is intentionally executed inline in this isolated workspace. The data builder, dashboard and workflow change together, so implementation will proceed in task order with a verification gate after each task. Git commit, push and GitHub Pages publication will only happen after separate explicit user authorization.
