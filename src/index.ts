// agent-feedback — a tiny, universal protocol for letting LLMs, agents, harnesses, and
// in-app assistants send "tickets" back to an app describing what they hit while using it:
// a missing action, an error, a confusing flow, or an idea. Those tickets are how the app
// (and any assistant living on it) improves every time it is used.
//
// Dependency-free. Runs in the browser, Node, Deno, or behind any datastore.

export type TicketKind =
  | "missing_capability"
  | "error"
  | "hallucination_caught"
  | "confusion"
  | "suggestion"
  | "success"
  | "other";

export interface Ticket {
  /** Which app/site/tool this is about. */
  app: string;
  /** Who is reporting: an agent name, "page-assistant", a harness id, a human handle. */
  source: string;
  kind: TicketKind;
  /** One-line headline. Required. */
  summary: string;
  detail?: string;
  context?: { url?: string; path?: string; capability?: string; request?: string };
  severity?: "low" | "med" | "high";
  createdAt?: string;
}

export interface TicketStore {
  save(t: Ticket): Promise<void> | void;
  list(limit?: number): Promise<Ticket[]> | Ticket[];
}

const KINDS: TicketKind[] = ["missing_capability", "error", "hallucination_caught", "confusion", "suggestion", "success", "other"];

/** In-memory store (default / tests). */
export class MemoryTicketStore implements TicketStore {
  private t: Ticket[] = [];
  save(x: Ticket) {
    this.t.push({ ...x, createdAt: x.createdAt ?? new Date().toISOString() });
  }
  list(limit = 100) {
    return this.t.slice(-limit).reverse();
  }
}

/** Validate + clamp an untrusted ticket payload coming over the wire. */
export function normalizeTicket(body: unknown): Ticket | { error: string } {
  if (!body || typeof body !== "object") return { error: "ticket must be an object" };
  const b = body as Record<string, unknown>;
  if (typeof b.summary !== "string" || !b.summary.trim()) return { error: "summary is required" };
  return {
    app: String(b.app ?? "unknown"),
    source: String(b.source ?? "anonymous"),
    kind: KINDS.includes(b.kind as TicketKind) ? (b.kind as TicketKind) : "other",
    summary: b.summary.slice(0, 300),
    detail: typeof b.detail === "string" ? b.detail.slice(0, 4000) : undefined,
    context: (b.context as Ticket["context"]) ?? undefined,
    severity: (["low", "med", "high"].includes(b.severity as string) ? b.severity : "med") as Ticket["severity"],
    createdAt: new Date().toISOString(),
  };
}

/** A minimal, framework-agnostic summary of one assistant/agent run. */
export interface RunSummary {
  invocations?: Array<{ name: string; ok: boolean; error?: string; args?: unknown }>;
  /** True if a grounding validator overrode invented model output. */
  corrected?: boolean;
  /** True if something was staged for confirmation. */
  staged?: boolean;
}

/**
 * Auto-derive tickets from a run, so the loop self-improves even when the caller doesn't
 * bother to file feedback: errors → error tickets, caught hallucinations → a ticket,
 * nothing-could-be-done → a missing_capability ticket.
 */
export function ticketsFromRun(app: string, source: string, request: string, run: RunSummary): Ticket[] {
  const out: Ticket[] = [];
  for (const inv of run.invocations ?? []) {
    if (!inv.ok)
      out.push({
        app,
        source,
        kind: inv.error === "unknown capability" ? "missing_capability" : "error",
        summary: `${inv.name} failed: ${inv.error ?? "unknown error"}`,
        detail: inv.args ? `args: ${JSON.stringify(inv.args)}` : undefined,
        context: { capability: inv.name, request },
        severity: "high",
      });
  }
  if (run.corrected)
    out.push({ app, source, kind: "hallucination_caught", summary: "Model invented a value; validator overrode it.", context: { request }, severity: "med" });
  if (!(run.invocations ?? []).length && !run.staged)
    out.push({ app, source, kind: "missing_capability", summary: "No action matched the request.", detail: request.slice(0, 300), context: { request }, severity: "low" });
  return out;
}

/** The /.well-known/agent-feedback.json discovery document an app should serve. */
export function feedbackWellKnown(app: string, feedbackEndpoint: string) {
  return {
    schemaVersion: "1.0",
    app,
    feedbackEndpoint,
    method: "POST",
    please:
      "If you used this app or its assistant and hit anything missing, broken, confusing, or worth improving, POST a ticket here so it gets better.",
    ticketSchema: {
      summary: "string (required, one line)",
      kind: KINDS.join(" | "),
      detail: "string (optional)",
      severity: "low | med | high",
      source: "your agent/harness name",
      context: "{ url?, path?, capability?, request? }",
    },
  };
}

/** Receiver helper: validate + store a posted ticket. Returns a JSON-able result + status. */
export async function receiveTicket(store: TicketStore, app: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const t = normalizeTicket({ app, ...(body as object) });
  if ("error" in t) return { status: 400, body: t };
  await store.save(t);
  return { status: 200, body: { ok: true } };
}

/** Client helper: send a ticket to an app's feedback endpoint. */
export async function sendTicket(feedbackEndpoint: string, ticket: Ticket): Promise<boolean> {
  try {
    const res = await fetch(feedbackEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(ticket) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Client helper: discover an app's feedback endpoint from its well-known doc. */
export async function discoverFeedback(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/.well-known/agent-feedback.json`);
    if (!res.ok) return null;
    return (await res.json()).feedbackEndpoint ?? null;
  } catch {
    return null;
  }
}
