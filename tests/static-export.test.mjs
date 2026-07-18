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
});
