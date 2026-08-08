import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GitHub Pages build uses a static export", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /output:\s*["']export["']/);
  assert.match(config, /trailingSlash:\s*true/);
});

test("dashboard uses the configured public data API", async () => {
  const dashboard = await readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /NEXT_PUBLIC_DATA_API_BASE/);
  assert.doesNotMatch(dashboard, /fetch\(`\/api\//);
  assert.doesNotMatch(dashboard, /Yahoo 技術線圖|正在取得 Yahoo 股市行情|>Yahoo</);
});

test("GitHub Pages workflow deploys the static output", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /path:\s*out/);
  assert.match(workflow, /cron:\s*["']\*\/15 0-8 \* \* 1-5["']/);
});

test("scheduled build publishes independent official TPEx data feeds", async () => {
  const [pkg, script] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/refresh-official-market.mjs", import.meta.url), "utf8")
  ]);
  assert.match(pkg, /refresh:official/);
  assert.match(pkg, /refresh:official.*refresh:data.*next build/);
  assert.match(script, /tpex_esb_latest_statistics/);
  assert.match(script, /mopsfin_t187ap03_R/);
  assert.match(script, /tpex-quotes\.json/);
  assert.match(script, /tpex-companies\.json/);
  assert.match(script, /SecuritiesCompanyCode/);
});

test("snapshot refresh removes provider names from public status text", async () => {
  const script = await readFile(new URL("../scripts/refresh-snapshots.mjs", import.meta.url), "utf8");
  assert.match(script, /sanitizePublicText/);
  assert.match(script, /replace\(\/Yahoo\/gi, "第三方行情"\)/);
});
