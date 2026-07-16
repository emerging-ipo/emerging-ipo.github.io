import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiBase = (process.env.DATA_API_BASE || "https://tw-emerging-radar.chiayu333.chatgpt.site").replace(/\/$/, "");
const outputDir = path.resolve("public/data");

await mkdir(outputDir, { recursive: true });

for (const name of ["market", "tracker"]) {
  const response = await fetch(`${apiBase}/api/${name}?refresh=1`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error(`${name} snapshot HTTP ${response.status}`);
  const payload = await response.json();
  await writeFile(path.join(outputDir, `${name}.json`), `${JSON.stringify(payload)}\n`, "utf8");
}
