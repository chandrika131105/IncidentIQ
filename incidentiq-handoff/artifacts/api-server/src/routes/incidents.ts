import { Router, type IRouter } from "express";
import {
  InvestigateIncidentBody,
  InvestigateIncidentResponse,
  ListIncidentMemoriesQueryParams,
  ListIncidentMemoriesResponse,
  GetMemoryStatusResponse,
  RetainIncidentOutcomeBody,
  RetainIncidentOutcomeResponse,
  SeedDemoMemoriesResponse,
} from "@workspace/api-zod";
import {
  analyzeWithGroq,
  getIntegrationConfig,
  listIncidentMemories,
  recallIncidentMemories,
  retainOutcome,
  seedDemoMemories,
  verifyHindsightConnection,
  ProviderRequestError,
} from "../lib/incidentiq";

const router: IRouter = Router();

router.get("/memory/status", async (_req, res): Promise<void> => {
  const config = getIntegrationConfig();
  const connection = await verifyHindsightConnection();
  const response = GetMemoryStatusResponse.parse({
    provider: "Hindsight",
    configured: connection.configured,
    bankId: config.hindsightBankId,
    message: connection.message,
  });
  res.json(response);
});

router.post("/incidents/investigate", async (req, res): Promise<void> => {
  const parsed = InvestigateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid incident payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = getIntegrationConfig();
  if (!config.groqConfigured) {
    res.status(503).json({ error: "Groq is not configured. Add GROQ_API_KEY to investigate incidents." });
    return;
  }

  const recall = await recallIncidentMemories(parsed.data);
  try {
    const generated = await analyzeWithGroq(parsed.data, recall.memories);
    const response = InvestigateIncidentResponse.parse({
      analysis: {
        incident: parsed.data,
        summary: generated.summary ?? "Groq did not provide a summary.",
        probableRootCauses: generated.probableRootCauses ?? [],
        investigationSteps: generated.investigationSteps ?? [],
        recommendedResolution: generated.recommendedResolution ?? "No resolution was returned.",
        confidence: generated.confidence ?? 0.5,
        severity: parsed.data.severity,
        recalledMemories: recall.memories,
        memoryCount: recall.memories.length,
        generatedBy: `Groq · ${config.groqModel}`,
      },
      trace: [
        "Current incident received",
        recall.memories.length ? `Hindsight recall returned ${recall.memories.length} memories` : "Hindsight recall returned no relevant memories",
        `Groq generated the incident analysis using ${recall.memories.length ? "recalled memory and current context" : "current incident context"}`,
        "Recommendations ready for review",
      ],
      warnings: [
        ...(recall.warning ? [recall.warning] : []),
        ...(recall.memories.length === 0 ? ["No relevant historical incidents were found in memory."] : []),
      ],
    });
    res.json(response);
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      req.log.error(
        {
          provider: error.provider,
          status: error.status,
          code: error.code,
          providerMessage: error.safeMessage,
        },
        "Incident analysis upstream request failed",
      );
      res.status(502).json({
        error:
          error.status === 401 && error.provider === "Groq"
            ? "Groq authentication failed. Verify GROQ_API_KEY in Replit Secrets."
            : "Groq could not generate an incident analysis right now.",
      });
      return;
    }

    req.log.error({ err: error }, "Incident analysis failed");
    res.status(502).json({ error: "Groq could not generate an incident analysis right now." });
  }
});

router.post("/incidents/retain", async (req, res): Promise<void> => {
  const parsed = RetainIncidentOutcomeBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid incident outcome payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await retainOutcome(parsed.data);
    res.json(
      RetainIncidentOutcomeResponse.parse({
        retained: true,
        incidentId: parsed.data.incidentId,
        message: "Outcome retained in Hindsight for future investigations.",
      }),
    );
  } catch (error) {
    req.log.error(
      error instanceof ProviderRequestError
        ? {
            provider: error.provider,
            status: error.status,
            code: error.code,
            providerMessage: error.safeMessage,
          }
        : { err: error },
      "Failed to retain incident outcome",
    );
    res.status(502).json({ error: "Hindsight could not retain this incident outcome." });
  }
});

router.get("/incidents/memories", async (req, res): Promise<void> => {
  const parsed = ListIncidentMemoriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await listIncidentMemories(parsed.data.query);
  res.json(
    ListIncidentMemoriesResponse.parse({
      memories: result.memories,
      count: result.memories.length,
      source: result.warning ?? "Hindsight",
    }),
  );
});

router.post("/incidents/seed-demo", async (req, res): Promise<void> => {
  try {
    await seedDemoMemories();
    res.json(
      SeedDemoMemoriesResponse.parse({
        retained: 8,
        incidentIds: ["INC-101", "INC-102", "INC-103", "INC-104", "INC-105", "INC-106", "INC-107", "INC-108"],
        message: "Eight demo incidents were retained in Hindsight.",
      }),
    );
  } catch (error) {
    req.log.error(
      error instanceof ProviderRequestError
        ? {
            provider: error.provider,
            status: error.status,
            code: error.code,
            providerMessage: error.safeMessage,
          }
        : { err: error },
      "Failed to seed Hindsight demo memories",
    );
    res.status(502).json({ error: "Hindsight could not seed the demo memories." });
  }
});

export default router;