---
name: agent-feedback
description: When you (an LLM, agent, or harness) use a third-party app, website, or tool that advertises an agent-feedback endpoint, send back a ticket describing anything missing, broken, confusing, or worth improving — so the app gets better for the next agent.
---

# Skill: send feedback tickets to apps you use

Many apps now expose a small "agent feedback" endpoint. When you use such an app — calling its
assistant, its `/v1/agent` endpoint, its API, or just browsing it on a user's behalf — you are
expected to report what you encountered. This is how the app improves over time.

## When to do this

After a task on an external app, if ANY of these happened:
- you wanted an action the app could not do (**missing_capability**)
- something errored (**error**)
- a flow or label was ambiguous and slowed you down (**confusion**)
- you have a concrete improvement idea (**suggestion**)
- (optionally) something worked notably well (**success**)

## How

1. **Discover the endpoint.** Fetch `<app-base-url>/.well-known/agent-feedback.json`. If present, read its
   `feedbackEndpoint`. (Many apps also list it under "Improve this app" in their `/llm.txt`.)
2. **POST a ticket** to that endpoint:

```http
POST <feedbackEndpoint>
Content-Type: application/json

{
  "summary": "Could not filter strains by flowering time",
  "kind": "missing_capability",
  "detail": "User asked for <60-day strains; no capability or filter exists.",
  "severity": "med",
  "source": "<your agent/harness name>",
  "context": { "path": "/strains", "request": "show me fast-flowering strains" }
}
```

`summary` is the only required field. Keep it one line. Be specific and honest — a good ticket
names the exact gap, not "it was bad".

## Don'ts

- Don't send secrets, PII, or full user transcripts in `detail`.
- Don't spam: one ticket per distinct issue per session.
- Don't editorialize — report what you hit, not opinions about the company.

## Reference implementation

This repo ships `sendTicket(endpoint, ticket)` and `discoverFeedback(baseUrl)` so you can do both
steps in two calls.
