# GitHub Pages Independent Data Design

## Goal

Make the `esrstk.github.io` edition update its core market and IPO data on GitHub Actions without Codex usage, a running personal computer, or a dependency on the existing `chatgpt.site` service. The current public site remains unchanged during this work.

## Scope

The static GitHub Pages edition owns these daily-updated public datasets:

- Emerging-stock company roster, company names, industries, registration dates and company websites.
- Current official market fields: transaction price, daily change, daily percentage change, previous close, bid/ask, volume and turnover.
- Last completed-week close and weekly percentage change. If Friday is closed, use the last valid trading session of that week and record that basis in the payload.
- IPO pipeline: submitted, reviewed, board-approved, contract-approved, auction and confirmed listing/trading dates.
- Upcoming auction/opening/listing events and the radar data derived from those facts.

Individual-company supplementary content such as news and extended company descriptions is not a prerequisite for the daily core-data publication. It may remain an optional direct public-source enhancement and must never block the market, radar, or IPO pages.

## Data Sources and Precedence

The update job reads official sources directly. The source order is deliberate:

1. TPEx emerging company master: `https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_R` is the complete active roster.
2. TPEx latest emerging statistics: `https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics` supplies official current trading data.
3. TPEx recent registration cross-check: POST `https://www.tpex.org.tw/www/zh-tw/company/latestEmerge` with the current Gregorian year. This is used to verify newly registered companies and their registration date; it never removes a master-record company by itself.
4. TWSE application list: `https://www.twse.com.tw/rwd/zh/company/applylisting?response=json`.
5. TPEx applicant list: `https://www.tpex.org.tw/openapi/v1/tpex_esb_applicant_companies`, with the TPEx official CSV applicant download as fallback.
6. TWSE auction and public-offering announcements for auction dates, actual offering price and confirmed trading dates.
7. TPEx daily/historical emerging-stock data for the completed-week close. The selection rule is the most recent valid trading session within the prior completed Monday-to-Friday week, not an average and not a calendar-day substitution.

Application records marked withdrawal, self-withdrawal, cancellation, termination or equivalent official status are excluded before radar and IPO datasets are built. A listing/trading date is not inferred from an auction date.

## Static Data Pipeline

A Node data builder will produce `public/data/market.json` and `public/data/tracker.json` directly from the sources above. It will also retain raw TPEx master and latest-statistics snapshots for traceability and fallback.

The builder validates every response before replacing a public data file:

- The active company master and latest-statistics sources must each contain at least 300 valid four-digit codes.
- The recent-registration response must contain the expected table structure; failure only disables its cross-check and does not erase the master roster.
- The IPO list must contain a non-empty TWSE source and a non-empty TPEx source or its existing successful snapshot.
- A failed source leaves the last successful relevant JSON file unchanged. No empty payload is published.

The dashboard fetch order becomes local static data first (`/data/market.json` and `/data/tracker.json`). It must not call `chatgpt.site` for core rows. Static data therefore remains visible even if the previous hosted service is unavailable.

## Scheduled Publication

GitHub Actions runs once each Taiwan trading weekday at approximately 15:10 Asia/Taipei (07:10 UTC), plus `workflow_dispatch` for an owner-initiated run.

Each run performs:

1. Fetch and validate the official sources.
2. Build the static core JSON files.
3. Run the static export tests and production build.
4. Publish the generated `out` directory to GitHub Pages only when build validation succeeds.

GitHub Actions cron scheduling is best effort and can start a few minutes late. It does not run on a Taiwan holiday merely because it is a weekday; the resulting official date is preserved and the data builder will not invent a trading session. The manual GitHub Actions button remains the recovery path for an urgent rerun.

## User Experience and Boundaries

- Preserve the existing visual layout and all current sortable market, radar and IPO columns.
- Keep the existing public-site disclaimer and neutral descriptive wording unchanged.
- Display the official data timestamp, not a fabricated browser refresh time.
- Mark unavailable price information as `無可用報價`; do not substitute zero.
- Do not alter the current `chatgpt.site` deployment or its data behavior.

## Acceptance Criteria

1. The GitHub Pages build succeeds with no `DATA_API_BASE` or `NEXT_PUBLIC_DATA_API_BASE` value set.
2. The generated market payload contains at least 300 active companies and includes companies present in the TPEx recent-registration data where they are active in the master roster.
3. The generated tracker payload includes listed and OTC applications, excludes terminated applications, and distinguishes auction dates from confirmed trading dates.
4. The site serves core market, radar and IPO content with the old `chatgpt.site` URL unavailable.
5. A failed official fetch preserves the prior successful JSON and fails publication rather than deploying empty or partial core data.
6. The scheduled GitHub workflow runs at the stated post-close window and can be launched manually.
