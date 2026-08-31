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

test("official source recovers after the three redirects that exhausted the old retry budget", async () => {
  let attempts = 0;
  const delays = [];
  const warnings = [];
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts <= 3) return { ok: false, status: 307 };
    return { ok: true, json: async () => ({ source: "official" }) };
  };

  const value = await fetchJson(fetchImpl, "https://example.test/auction", {}, {
    waitImpl: async milliseconds => delays.push(milliseconds),
    log: { warn: message => warnings.push(message) }
  });

  assert.deepEqual(value, { source: "official" });
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [3000, 6000, 12000]);
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /auction.*307.*1\/5/);
});

test("official source respects Retry-After and releases the failed response before retrying", async () => {
  let attempts = 0;
  const events = [];
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts === 1) return {
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "20" }),
      body: { cancel: async () => events.push("released") }
    };
    events.push("retried");
    return { ok: true, json: async () => ({ source: "official" }) };
  };

  await fetchJson(fetchImpl, "https://example.test/busy", {}, {
    waitImpl: async milliseconds => events.push(milliseconds),
    log: { warn() {} }
  });

  assert.deepEqual(events, ["released", 20000, "retried"]);
});

test("official source still fails after its retry budget instead of returning partial data", async () => {
  let attempts = 0;
  const delays = [];
  await assert.rejects(() => fetchJson(async () => {
    attempts += 1;
    return { ok: false, status: 307 };
  }, "https://example.test/unavailable", {}, {
    waitImpl: async milliseconds => delays.push(milliseconds),
    log: { warn() {} }
  }), /unavailable.*HTTP 307/);

  assert.equal(attempts, 5);
  assert.deepEqual(delays, [3000, 6000, 12000, 24000]);
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
