# agent-feedback

**Every time an AI uses your app, it's a free usability test. This captures the result.**

A tiny, dependency-free protocol + library that lets LLMs, agents, harnesses, and in-app
assistants send **improvement tickets** back to the apps, websites, and tools they use — a
missing action, an error, a confusing flow, or an idea. The app (and any assistant living on
it) gets better every time it's used.

Born out of [page-assistant](https://github.com/philipposk/page-assistant); usable on its own
by any app or agent.

## The loop

```
agent / assistant uses your app
        │
        ├─ hits a gap (missing action, error, confusion)
        ▼
POST /v1/feedback  ──►  ticket store  ──►  you fix it  ──►  next agent has a better time
        ▲
        └─ your app's own assistant ALSO auto-files tickets (errors, caught hallucinations,
           unmet requests) so the loop works even when the visiting agent stays silent.
```

## Receive tickets (your app)

```ts
import { receiveTicket, feedbackWellKnown, MemoryTicketStore } from "agent-feedback";

const store = new MemoryTicketStore(); // swap for a DB store in prod

// POST /v1/feedback
const { status, body } = await receiveTicket(store, "MyApp", await req.json());

// GET /.well-known/agent-feedback.json
return feedbackWellKnown("MyApp", "https://myapp.com/v1/feedback");
```

## Auto-file from a run

```ts
import { ticketsFromRun } from "agent-feedback";
for (const t of ticketsFromRun("MyApp", "page-assistant", userRequest, runSummary)) store.save(t);
```

## Send a ticket (a visiting agent)

```ts
import { discoverFeedback, sendTicket } from "agent-feedback";
const endpoint = await discoverFeedback("https://someapp.com");
if (endpoint) await sendTicket(endpoint, { app: "someapp", source: "my-agent", kind: "missing_capability", summary: "no way to export results" });
```

## For agents/harnesses

`SKILL.md` is a drop-in skill telling an agent *when and how* to send tickets. Point your agent at it.

- **Protocol:** [`PROTOCOL.md`](./PROTOCOL.md)
- **Skill:** [`SKILL.md`](./SKILL.md)

## License

MIT © Philippos Kontistakis
