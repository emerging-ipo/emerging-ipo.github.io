import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildStaticData } from "../lib/static-data-builder.mjs";

const certificateBundle = fileURLToPath(new URL("../certs/twca-tpex-ca.pem", import.meta.url));
const bootstrapFlag = "ESRSTK_DATA_CA_READY";

if (process.env[bootstrapFlag] === "1") {
  await buildStaticData();
} else {
  const nodeOptions = process.env.NODE_OPTIONS || "";
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
    env: {
      ...process.env,
      [bootstrapFlag]: "1",
      NODE_OPTIONS: nodeOptions.includes("--use-system-ca") ? nodeOptions : `${nodeOptions} --use-system-ca`.trim(),
      NODE_EXTRA_CA_CERTS: certificateBundle,
      CURL_CA_BUNDLE: certificateBundle
    },
    stdio: "inherit"
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", exitCode => resolve(exitCode ?? 1));
  });
  process.exitCode = code;
}
