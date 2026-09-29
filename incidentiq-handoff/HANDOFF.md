# IncidentIQ Handoff

## Current status

IncidentIQ is an existing React/Vite frontend with a shared Express/TypeScript API service. The frontend runs in the managed workflow, and the API server builds and starts successfully.

The investigation request is wired as:

```text
Incident form
  -> POST /api/incidents/investigate
  -> Hindsight bank verification
  -> Hindsight client.recall(bankId, query, options)
  -> Groq POST /openai/v1/chat/completions
  -> JSON analysis validation
  -> InvestigationResponse
  -> visible analysis, memories, warnings, and memory trace
```

## Root cause found in this session

The original frontend message was caused by Groq returning:

```text
HTTP 401
code: invalid_api_key
message: Invalid API Key
```

The Hindsight seed request also exposed an independent credentials problem:

```text
HTTP 401
Authentication failed: Invalid API key format
```

The first live run showed invalid provider credentials. After the secrets were replaced through the secure flow, both providers authenticated successfully. Secret values were never printed or copied into this handoff.

The Groq URL, bearer authorization format, JSON request shape, and configured model are correct. Current Groq documentation lists `openai/gpt-oss-120b` as an available model, so changing the model would not fix the observed 401.

## Changes made

- Added current Hindsight bank verification with `client.getBankConfig(bankId)` before recall.
- Kept the official recall call:

  ```ts
  client.recall(bankId, query, {
    maxTokens: 4096,
    budget: "mid",
    includeEntities: false,
  })
  ```

- Added redacted Groq upstream diagnostics with provider, HTTP status, error code, and safe message.
- Added truthful Hindsight authentication diagnostics to status, investigation warnings, and history warnings.
- Added safe API response text for Groq authentication failure:
  `Groq authentication failed. Verify GROQ_API_KEY in Replit Secrets.`
- No API key is sent to the browser or written to logs.

## Environment variables

Use Replit Secrets or another secure secret manager. Never commit actual values.

```text
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=incidentiq-demo
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

The current Replit environment has valid provider credentials configured in Replit Secrets. Keep the actual values out of source control and handoff files.

## API endpoints

- `GET /api/health`
- `GET /api/memory/status`
- `POST /api/incidents/investigate`
- `POST /api/incidents/retain`
- `GET /api/incidents/memories?query=...`
- `POST /api/incidents/seed-demo`

## Demo verification

After replacing both secrets:

1. Restart the API workflow.
2. Confirm `GET /api/memory/status` reports the `incidentiq-demo` bank.
3. Run `POST /api/incidents/seed-demo`; it should retain eight incidents.
4. Submit `INC-115`:

   ```json
   {
     "incidentId": "INC-115",
     "service": "Payment API",
     "severity": "SEV-2",
     "error": "HTTP 500 errors and database connection timeouts",
     "symptoms": "intermittent payment failures, HTTP 500 errors, database connection timeouts",
     "description": "The Payment API is intermittently failing with HTTP 500 errors. Database connections are timing out and payment requests are failing for some customers."
   }
   ```

5. Confirm Hindsight recalls `INC-101` or another relevant memory.
6. Confirm the returned analysis includes the Hindsight memory context and visible trace.
7. Retain a confirmed outcome through the UI.
8. Confirm the retained outcome appears through history search.

## Verification completed in Replit

- API typecheck: passed.
- API build: passed.
- Frontend typecheck: passed.
- Frontend production build: passed with `PORT=5173 BASE_PATH=/incidentiq`.
- Hindsight SDK contract: verified against the current official TypeScript SDK documentation and installed `@vectorize-io/hindsight-client@0.10.1` types.
- Groq API contract and model availability: verified against current Groq documentation.
- Live investigation request before credential replacement: correctly returned a safe 502 because the Groq key was invalid.
- Live demo seed request before credential replacement: correctly returned a safe 502 because the Hindsight key format was invalid.
- Live demo seed after credential replacement: passed and retained all eight demo incidents.
- Complete `INC-115` flow: passed. Hindsight recalled six memories including `INC-101`, Groq generated structured analysis from recalled context, the outcome was retained, and history returned the retained `INC-115` records.

## Install and run

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/incidentiq run dev
```

The managed workspace workflows already provide the required `PORT` and `BASE_PATH` values for preview.

## Important files

- `artifacts/incidentiq/src/pages/workspace.tsx`
- `artifacts/incidentiq/src/pages/history.tsx`
- `artifacts/api-server/src/lib/incidentiq.ts`
- `artifacts/api-server/src/routes/incidents.ts`
- `artifacts/api-server/src/routes/health.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-zod/src/generated/api.ts`
- `README.md`
- `.env.example`