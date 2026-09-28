---
name: Hindsight and Groq integration
description: Current external-service choices and the persistent-memory setup required by IncidentIQ.
---

IncidentIQ uses the official Hindsight TypeScript client for persistent incident memory and Groq's OpenAI-compatible chat completions endpoint for analysis. The Hindsight bank must be created or updated before demo seeding and outcome retention; recall remains a direct read and reports an explicit no-memory warning when unavailable.

**Why:** Hindsight Cloud currently exposes bank initialization as a distinct documented SDK operation, while Groq remains available without the Replit-managed AI upgrade.

**How to apply:** Keep API keys server-side in Replit Secrets, use the configured bank ID, and never synthesize recalled memories when Hindsight is unavailable.