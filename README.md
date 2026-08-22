# Emerging Stock Radar

Independent GitHub Pages edition of the Taiwan emerging-stock market dashboard. Its core market, progress-radar and IPO schedule data are generated inside this repository; it does not rely on the existing `chatgpt.site` website.

## Data And Update Rules

`npm run build:data` reads the official TPEx/TWSE sources, validates the responses, and writes the static JSON files used by the site:

- TPEx emerging-company master and latest statistics for the active roster and post-market quotation data.
- TPEx recent-registration feed as a supplement and cross-check; it never removes companies from the master roster.
- TWSE and TPEx listing-application feeds, TWSE auction notices and public-offering notices for IPO stages.
- TPEx daily reports for the previous complete trading week's final valid weighted-average transaction price. If Friday has no trading, the final available trading day that week is used as `上週基準均價`.

Withdrawn, self-withdrawn, cancelled and terminated applications are excluded. Auction, allotment and opening dates are never treated as a stock listing/trading date unless a direct official listing/trading date is available.

## GitHub Pages Publishing

The repository must be named `esrstk.github.io` under the `esrstk` GitHub user or organization. GitHub Actions builds the static `out` directory and publishes it to GitHub Pages.

The scheduled build runs at 16:10 and 17:40 Taiwan time on weekdays (`10 8 * * 1-5` and `40 9 * * 1-5` UTC), plus a final Saturday 10:00 Taiwan time reconciliation (`0 2 * * 6` UTC). GitHub's scheduled workflows can occasionally start a little late; this does not change the data rules. You can run the same update manually from GitHub: **Actions** → **Deploy GitHub Pages** → **Run workflow**.

The build validates the official responses before it writes the static files. If a source is incomplete or a build fails, deployment stops and the previously published GitHub Pages version remains available rather than being replaced by an empty dataset.

## Release Check

Before publishing a change locally, run:

```powershell
npm test
npm run build
```

Then check `public/data/market.json` has an active market roster, `public/data/tracker.json` has non-empty stage counts, and the generated `out/market/`, `out/radar/`, and `out/ipo/` routes exist. In GitHub, inspect the completed Actions run before opening the deployment URL.
