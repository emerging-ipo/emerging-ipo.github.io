import assert from "node:assert/strict";
import test from "node:test";

import { fetchJson } from "../lib/static-data-builder.mjs";

test("official source retries transient HTTP 520 responses before succeeding", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts < 3) return { ok: false, status: 520 };
    return { ok: true, json: async () => ({ source: "official" }) };
  };

  const value = await fetchJson(fetchImpl, "https://example.test/source", {}, { attempts: 3, delayMs: 0 });

  assert.deepEqual(value, { source: "official" });
  assert.equal(attempts, 3);
});

test("official source retries a temporary HTTP 307 redirect response", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts === 1) return { ok: false, status: 307 };
    return { ok: true, json: async () => ({ source: "official" }) };
  };

  const value = await fetchJson(fetchImpl, "https://example.test/redirect", {}, { attempts: 3, delayMs: 0 });

  assert.deepEqual(value, { source: "official" });
  assert.equal(attempts, 2);
});

test("official source retries a terminated response body before succeeding", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts < 4) return { ok: true, json: async () => { throw new Error("terminated"); } };
    return { ok: true, json: async () => ({ source: "official" }) };
  };

  const value = await fetchJson(fetchImpl, "https://example.test/terminated", {}, { attempts: 5, delayMs: 0 });

  assert.deepEqual(value, { source: "official" });
  assert.equal(attempts, 4);
});

test("official source does not retry a permanent HTTP 404 response", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    return { ok: false, status: 404 };
  };

  await assert.rejects(
    () => fetchJson(fetchImpl, "https://example.test/missing", {}, { attempts: 3, delayMs: 0 }),
    /HTTP 404/
  );
  assert.equal(attempts, 1);
});
