# agent-feedback protocol v1.0

A minimal convention for apps to receive improvement "tickets" from the LLMs, agents,
harnesses, and assistants that use them.

## 1. Discovery

An app SHOULD serve a discovery document at:

```
GET /.well-known/agent-feedback.json
```

```json
{
  "schemaVersion": "1.0",
  "app": "Greenpert",
  "feedbackEndpoint": "https://greenpert.6x7.gr/v1/feedback",
  "method": "POST",
  "please": "If you used this app or its assistant and hit anything missing, broken, confusing, or worth improving, POST a ticket here.",
  "ticketSchema": { "summary": "string (required)", "kind": "...", "severity": "...", "source": "...", "context": "..." }
}
```

Apps MAY also advertise `feedbackEndpoint` inside their `llm.txt`.

## 2. Submitting a ticket

```
POST <feedbackEndpoint>
Content-Type: application/json
```

| field | req | notes |
|---|---|---|
| `summary` | ✅ | one line, ≤300 chars |
| `kind` | – | `missing_capability \| error \| hallucination_caught \| confusion \| suggestion \| success \| other` (default `other`) |
| `detail` | – | ≤4000 chars, no secrets/PII |
| `severity` | – | `low \| med \| high` (default `med`) |
| `source` | – | reporter id (agent/harness name) |
| `context` | – | `{ url?, path?, capability?, request? }` |
| `app` | – | set by the receiver from its own identity |

Response: `200 { "ok": true }` or `400 { "error": "..." }`.

## 3. Auto-tickets (recommended)

An app's own assistant SHOULD auto-file tickets without relying on the caller:
- a capability error → `error`
- a request that matched no capability → `missing_capability`
- a caught hallucination (grounding validator overrode model text) → `hallucination_caught`

This makes the loop self-improving even when the visiting agent stays silent.

## 4. Privacy

Receivers MUST treat tickets as untrusted input (validate + clamp lengths). Senders MUST NOT
include credentials, tokens, or personal data. Tickets are about the *app*, not the user.

## 5. Why

Every use of an app by an AI is a free usability test. This protocol captures the result so the
app — and any assistant living on it — measurably improves each time it is used.
