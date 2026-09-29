import { HindsightClient, type RecallResult } from "@vectorize-io/hindsight-client";
import type { IncidentInput, Memory, OutcomeInput } from "@workspace/api-zod";

export const DEMO_INCIDENTS: Array<OutcomeInput & Pick<IncidentInput, "service" | "severity" | "error" | "symptoms" | "description">> = [
  {
    incidentId: "INC-101",
    service: "Payment API",
    severity: "SEV-1",
    error: "HTTP 500",
    symptoms: "Database connection timeouts under elevated payment traffic.",
    description: "Payment requests failed intermittently during a traffic spike.",
    actualRootCause: "Database connection pool exhaustion caused by a connection leak.",
    resolution: "Increased the connection pool size and fixed the connection leak.",
    outcome: "Payment success rate returned to normal and error volume cleared.",
    lessonsLearned: "Monitor pool utilization and investigate connection leaks after deployments.",
  },
  {
    incidentId: "INC-102",
    service: "Authentication Service",
    severity: "SEV-2",
    error: "JWT validation failures",
    symptoms: "Users were logged out and could not refresh sessions after a key rotation.",
    description: "A signing key rotation caused refresh tokens to fail validation.",
    actualRootCause: "One authentication replica had stale key material.",
    resolution: "Restarted the stale replica and added key rotation propagation checks.",
    outcome: "Login and session refresh recovered for all regions.",
    lessonsLearned: "Validate key material consistency across replicas before completing rotation.",
  },
  {
    incidentId: "INC-103",
    service: "Order Service",
    severity: "SEV-2",
    error: "HTTP 409",
    symptoms: "Duplicate order submissions appeared during retry storms.",
    description: "Clients retried requests after slow responses and created duplicate order records.",
    actualRootCause: "The create-order endpoint did not enforce idempotency keys.",
    resolution: "Added idempotency-key enforcement backed by a unique database constraint.",
    outcome: "Retry storms no longer create duplicate orders.",
    lessonsLearned: "Every externally retried write should be idempotent at the API boundary.",
  },
  {
    incidentId: "INC-104",
    service: "Notification Service",
    severity: "SEV-3",
    error: "Queue lag exceeded threshold",
    symptoms: "Email and SMS notifications arrived 20 minutes late.",
    description: "A consumer deployment reduced effective worker concurrency.",
    actualRootCause: "A worker autoscaling metric ignored messages waiting in the retry queue.",
    resolution: "Corrected the scaling metric and replayed the delayed notification queue.",
    outcome: "Notification latency returned below two minutes.",
    lessonsLearned: "Autoscaling signals must include retry and dead-letter queue depth.",
  },
  {
    incidentId: "INC-105",
    service: "Database Service",
    severity: "SEV-1",
    error: "Read replica replication delay",
    symptoms: "Read-after-write checks returned stale order status for several regions.",
    description: "A long-running migration saturated replication bandwidth.",
    actualRootCause: "The migration ran without a replica-safe execution plan.",
    resolution: "Paused the migration, promoted a healthy replica, and reran in smaller batches.",
    outcome: "Replication delay cleared and stale reads stopped.",
    lessonsLearned: "Run large migrations in bounded batches and monitor replica lag continuously.",
  },
  {
    incidentId: "INC-106",
    service: "Payment API",
    severity: "SEV-2",
    error: "HTTP 504",
    symptoms: "Payment authorization requests timed out at the gateway.",
    description: "The upstream fraud provider increased response latency.",
    actualRootCause: "The fraud-provider client lacked a bounded timeout and circuit breaker.",
    resolution: "Added a deadline, circuit breaker, and asynchronous retry path.",
    outcome: "Gateway timeouts dropped to baseline during provider latency spikes.",
    lessonsLearned: "External dependencies need explicit deadlines and failure isolation.",
  },
  {
    incidentId: "INC-107",
    service: "Order Service",
    severity: "SEV-3",
    error: "Inventory reservation mismatch",
    symptoms: "Some orders showed confirmed items that were unavailable in the warehouse.",
    description: "A cache invalidation race served stale inventory during a catalog import.",
    actualRootCause: "Inventory cache invalidation ran before the import transaction committed.",
    resolution: "Moved invalidation after commit and added version checks on reservations.",
    outcome: "Reservation accuracy returned to 100 percent.",
    lessonsLearned: "Invalidate derived state only after the source transaction commits.",
  },
  {
    incidentId: "INC-108",
    service: "Authentication Service",
    severity: "SEV-3",
    error: "Elevated login latency",
    symptoms: "Login p95 latency increased after a new device-risk rule launched.",
    description: "Risk evaluation performed a serial lookup for every device signal.",
    actualRootCause: "The new risk rule made sequential calls to the profile store.",
    resolution: "Parallelized lookups and added a short-lived risk decision cache.",
    outcome: "Login p95 returned below the 300ms target.",
    lessonsLearned: "Review fan-out and serial dependency costs before enabling new auth rules.",
  },
];

const hindsightBaseUrl = process.env.HINDSIGHT_API_URL ?? "https://api.hindsight.vectorize.io";
const hindsightBankId = process.env.HINDSIGHT_BANK_ID ?? "incidentiq-demo";
const hindsightApiKey = process.env.HINDSIGHT_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

export function getIntegrationConfig() {
  return {
    hindsightBaseUrl,
    hindsightBankId,
    hindsightConfigured: Boolean(hindsightApiKey),
    groqModel,
    groqConfigured: Boolean(groqApiKey),
  };
}

function getHindsightClient() {
  if (!hindsightApiKey) {
    return null;
  }

  return new HindsightClient({
    baseUrl: hindsightBaseUrl,
    apiKey: hindsightApiKey,
    userAgent: "incidentiq/1.0",
  });
}

async function ensureHindsightBank(client: HindsightClient) {
  await client.createBank(hindsightBankId, {
    name: "IncidentIQ",
    background: "Persistent operational memory for software incident response teams.",
    retainMission:
      "Extract incident identifiers, services, symptoms, root causes, resolutions, and lessons learned from operational reports.",
  });
}

async function verifyHindsightBank(client: HindsightClient) {
  await client.getBankConfig(hindsightBankId);
}

function redactProviderMessage(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value
    .replace(/\b(?:gsk|sk)-[A-Za-z0-9_-]+\b/gi, "[REDACTED]")
    .replace(/\b(?:api[_ -]?key|token|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, 240);
}

function hindsightFailureMessage(error: unknown) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const status = typeof record.statusCode === "number" ? record.statusCode : undefined;
  const details = redactProviderMessage(record.details) ?? redactProviderMessage(record.message);
  return `Hindsight bank verification failed${status ? ` with HTTP ${status}` : ""}${details ? `: ${details}` : "."}`;
}

export class ProviderRequestError extends Error {
  constructor(
    public readonly provider: "Groq" | "Hindsight",
    public readonly status: number | undefined,
    public readonly code: string | undefined,
    public readonly safeMessage: string | undefined,
  ) {
    super(`${provider} request failed${status ? ` with HTTP ${status}` : ""}`);
    this.name = "ProviderRequestError";
  }
}

async function providerErrorFromResponse(provider: "Groq" | "Hindsight", response: Response) {
  const rawBody = await response.text();
  let parsed: { error?: { code?: unknown; type?: unknown; message?: unknown } } = {};

  try {
    parsed = JSON.parse(rawBody) as typeof parsed;
  } catch {
    // Keep the response body out of logs when the provider does not return JSON.
  }

  const error = parsed.error;
  return new ProviderRequestError(
    provider,
    response.status,
    typeof error?.code === "string" ? error.code : typeof error?.type === "string" ? error.type : undefined,
    redactProviderMessage(error?.message),
  );
}

function scoreFor(result: RecallResult) {
  const score = result.scores?.final;
  return typeof score === "number" ? Math.max(0, Math.min(1, score)) : 0.5;
}

function incidentIdFrom(result: RecallResult) {
  return result.metadata?.incidentId ?? result.document_id ?? null;
}

function relevanceReason(incident: IncidentInput, result: RecallResult) {
  const text = result.text.toLowerCase();
  const matches = [
    incident.service.toLowerCase(),
    incident.error.toLowerCase(),
    ...incident.symptoms.toLowerCase().split(/\W+/).filter((word) => word.length > 4),
  ].filter((term) => term && text.includes(term));

  if (matches.length === 0) {
    return "Hindsight ranked this memory as related to the incident query.";
  }

  return `Matches ${[...new Set(matches)].slice(0, 3).join(", ")} in the current incident context.`;
}

export function toMemory(incident: IncidentInput, result: RecallResult): Memory {
  return {
    id: result.id,
    incidentId: incidentIdFrom(result),
    text: result.text,
    relevance: scoreFor(result),
    whyRelevant: relevanceReason(incident, result),
  };
}

export async function recallIncidentMemories(incident: IncidentInput) {
  const client = getHindsightClient();
  if (!client) {
    return {
      memories: [] as Memory[],
      warning: "Hindsight is not configured. Add HINDSIGHT_API_KEY to enable persistent recall.",
    };
  }

  const query = [
    `Production incident ${incident.incidentId} in ${incident.service}.`,
    `Error: ${incident.error}.`,
    `Symptoms: ${incident.symptoms}.`,
    `Description: ${incident.description}.`,
    "Find similar historical software incidents, root causes, resolutions, and operational lessons.",
  ].join(" ");

  try {
    await verifyHindsightBank(client);
    const response = await client.recall(hindsightBankId, query, {
      maxTokens: 4096,
      budget: "mid",
      includeEntities: false,
    });

    return {
      memories: response.results.slice(0, 6).map((result) => toMemory(incident, result)),
      warning: undefined,
    };
  } catch (error) {
    return {
      memories: [] as Memory[],
      warning: `${hindsightFailureMessage(error)} No historical memory was used.`,
    };
  }
}

export async function listIncidentMemories(query: string) {
  const client = getHindsightClient();
  if (!client) {
    return {
      memories: [] as Memory[],
      warning: "Hindsight is not configured. Add HINDSIGHT_API_KEY to browse memory.",
    };
  }

  try {
    await verifyHindsightBank(client);
    const response = await client.recall(hindsightBankId, query, {
      maxTokens: 4096,
      budget: "low",
      includeEntities: false,
    });
    const placeholderIncident: IncidentInput = {
      incidentId: "history",
      service: "software operations",
      severity: "SEV-3",
      error: query,
      symptoms: query,
      description: query,
    };

    return {
      memories: response.results.slice(0, 30).map((result) => toMemory(placeholderIncident, result)),
      warning: undefined,
    };
  } catch (error) {
    return {
      memories: [] as Memory[],
      warning: `${hindsightFailureMessage(error)} History could not be loaded.`,
    };
  }
}

export async function retainOutcome(outcome: OutcomeInput) {
  const client = getHindsightClient();
  if (!client) {
    throw new Error("Hindsight is not configured. Add HINDSIGHT_API_KEY before retaining outcomes.");
  }

  await ensureHindsightBank(client);
  const content = [
    `Incident ID: ${outcome.incidentId}`,
    `Actual root cause: ${outcome.actualRootCause}`,
    `Resolution: ${outcome.resolution}`,
    `Outcome: ${outcome.outcome}`,
    `Lessons learned: ${outcome.lessonsLearned}`,
  ].join("\n");

  await client.retain(hindsightBankId, content, {
    documentId: outcome.incidentId,
    metadata: { incidentId: outcome.incidentId, source: "incidentiq" },
    tags: ["incident", "incidentiq"],
    updateMode: "replace",
  });
}

export async function seedDemoMemories() {
  const client = getHindsightClient();
  if (!client) {
    throw new Error("Hindsight is not configured. Add HINDSIGHT_API_KEY before seeding demo memories.");
  }

  await ensureHindsightBank(client);
  for (const incident of DEMO_INCIDENTS) {
    const content = [
      `Incident ID: ${incident.incidentId}`,
      `Service: ${incident.service}`,
      `Severity: ${incident.severity}`,
      `Error: ${incident.error}`,
      `Symptoms: ${incident.symptoms}`,
      `Description: ${incident.description}`,
      `Root cause: ${incident.actualRootCause}`,
      `Resolution: ${incident.resolution}`,
      `Lessons learned: ${incident.lessonsLearned}`,
    ].join("\n");

    await client.retain(hindsightBankId, content, {
      documentId: incident.incidentId,
      metadata: { incidentId: incident.incidentId, service: incident.service, source: "incidentiq-demo" },
      tags: ["incident", "incidentiq", "demo"],
      updateMode: "replace",
    });
  }
}

function safeJson(content: string) {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as {
      summary?: string;
      probableRootCauses?: string[];
      investigationSteps?: string[];
      recommendedResolution?: string;
      confidence?: number;
    };
  } catch {
    return null;
  }
}

export async function analyzeWithGroq(incident: IncidentInput, memories: Memory[]) {
  if (!groqApiKey) {
    throw new Error("Groq is not configured. Add GROQ_API_KEY before investigating an incident.");
  }

  const memoryContext = memories.length
    ? memories.map((memory) => `Memory ${memory.incidentId ?? memory.id}:\n${memory.text}`).join("\n\n")
    : "No relevant historical incidents were found in memory.";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [
        {
          role: "system",
          content:
            "You are IncidentIQ, a production incident response agent. Use only the current incident and the supplied Hindsight memories. Never claim a memory was recalled when none was supplied. Return only valid JSON with keys summary, probableRootCauses (array of strings), investigationSteps (array of strings), recommendedResolution, confidence (number from 0 to 1). Make recommendations specific and operational.",
        },
        {
          role: "user",
          content: `Current incident:\n${JSON.stringify(incident, null, 2)}\n\nRecalled Hindsight memories:\n${memoryContext}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1400,
    }),
  });

  if (!response.ok) {
    throw await providerErrorFromResponse("Groq", response);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq returned an empty analysis.");
  }

  return safeJson(content) ?? {
    summary: content,
    probableRootCauses: ["Review the full Groq analysis for the leading hypothesis."],
    investigationSteps: ["Validate the hypotheses against live telemetry and the recalled Hindsight evidence."],
    recommendedResolution: "Use the investigation steps to confirm the root cause before applying a change.",
    confidence: 0.5,
  };
}

export async function verifyHindsightConnection() {
  const client = getHindsightClient();
  if (!client) {
    return {
      configured: false,
      message: "Hindsight API key is not configured.",
    };
  }

  try {
    await client.getVersion();
    await verifyHindsightBank(client);
    return {
      configured: true,
      message: `Connected to Hindsight Cloud memory bank ${hindsightBankId}.`,
    };
  } catch (error) {
    return {
      configured: true,
      message: hindsightFailureMessage(error),
    };
  }
}