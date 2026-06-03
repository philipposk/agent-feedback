import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketsFromRun, normalizeTicket, MemoryTicketStore, receiveTicket, feedbackWellKnown } from "../dist/index.js";

test("auto-tickets from a failed run", () => {
  const t = ticketsFromRun("App", "agent", "do x", { invocations: [{ name: "x", ok: false, error: "unknown capability" }] });
  assert.equal(t[0].kind, "missing_capability");
});

test("receiveTicket validates and stores", async () => {
  const store = new MemoryTicketStore();
  const bad = await receiveTicket(store, "App", {});
  assert.equal(bad.status, 400);
  const ok = await receiveTicket(store, "App", { summary: "add CSV export", kind: "suggestion" });
  assert.equal(ok.status, 200);
  assert.equal(store.list()[0].app, "App");
  assert.equal(store.list()[0].kind, "suggestion");
});

test("well-known doc shape", () => {
  const wk = feedbackWellKnown("App", "https://x/v1/feedback");
  assert.equal(wk.schemaVersion, "1.0");
  assert.equal(wk.feedbackEndpoint, "https://x/v1/feedback");
});

test("normalize clamps unknown kind to other", () => {
  const t = normalizeTicket({ summary: "hi", kind: "weird" });
  assert.equal(t.kind, "other");
});
