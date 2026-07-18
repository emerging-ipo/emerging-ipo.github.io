import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiBase = (process.env.DATA_API_BASE || "https://tw-emerging-radar.chiayu333.chatgpt.site").replace(/\/$/, "");
const outputDir = path.resolve("public/data");
const publicTextKeys = new Set(["note", "priceNote", "priceError", "error", "message"]);

function sanitizePublicText(value, key = "") {
  if (Array.isArray(value)) return value.map(item => sanitizePublicText(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizePublicText(childValue, childKey)])
    );
  }
  if (typeof value === "string" && publicTextKeys.has(key)) {
    return value.replace(/Yahoo/gi, "第三方行情");
  }
  return value;
}

await mkdir(outputDir, { recursive: true });

for (const name of ["market", "tracker"]) {
  const response = await fetch(`${apiBase}/api/${name}?refresh=1`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error(`${name} snapshot HTTP ${response.status}`);
  const payload = sanitizePublicText(await response.json());
  await writeFile(path.join(outputDir, `${name}.json`), `${JSON.stringify(payload)}\n`, "utf8");
}
