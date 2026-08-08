import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const sources = [
  {
    url: "https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics",
    output: "tpex-quotes.json",
    minimumRows: 300
  },
  {
    url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_R",
    output: "tpex-companies.json",
    minimumRows: 300
  }
];

const outputDir = path.resolve("public/data");
await mkdir(outputDir, { recursive: true });

for (const source of sources) {
  const response = await fetch(source.url, {
    headers: { Accept: "application/json", "User-Agent": "Emerging-Stock-Radar/1.0" },
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error(`${source.output} HTTP ${response.status}`);

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length < source.minimumRows) {
    throw new Error(`${source.output} has only ${Array.isArray(rows) ? rows.length : 0} rows`);
  }
  const validRows = rows.filter(row => /^\d{4}$/.test(String(row?.SecuritiesCompanyCode || "").trim()));
  if (validRows.length < source.minimumRows) {
    throw new Error(`${source.output} has only ${validRows.length} valid company codes`);
  }

  const destination = path.join(outputDir, source.output);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(validRows)}\n`, "utf8");
  await rename(temporary, destination);
  console.log(`Saved ${validRows.length} official rows to ${destination}`);
}
