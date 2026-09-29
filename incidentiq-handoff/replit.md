# IncidentIQ

An AI incident response workspace that recalls operational history from Hindsight, analyzes incidents with Groq, and retains outcomes for future investigations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/incidentiq/src/pages/workspace.tsx` — investigation workspace and retain workflow
- `artifacts/incidentiq/src/pages/history.tsx` — searchable Hindsight memory browser
- `artifacts/api-server/src/lib/incidentiq.ts` — Hindsight SDK, Groq API, demo memory seed, and analysis orchestration
- `artifacts/api-server/src/routes/incidents.ts` — incident and memory endpoints
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `README.md` — setup, architecture, and demo instructions

## Architecture decisions

- Hindsight is the persistent incident-memory system; there is no local vector database or fake recall fallback.
- The workspace uses the existing shared Express API service and OpenAPI/codegen workflow.
- Groq is called server-side through its OpenAI-compatible chat completions endpoint; `GROQ_API_KEY` never reaches the browser.
- Demo memory seeding explicitly creates or updates the configured Hindsight bank before retaining the eight incident records.

## Product

IncidentIQ lets responders submit an incident, inspect Groq's structured analysis, see the Hindsight memories that shaped it, browse historical incident memory, and retain confirmed outcomes for future investigations.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
