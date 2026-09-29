import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getIntegrationConfig } from "../lib/incidentiq";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const config = getIntegrationConfig();
  const data = HealthCheckResponse.parse({
    status: "ok",
    hindsightConfigured: config.hindsightConfigured,
    llmConfigured: config.groqConfigured,
    memoryBankId: config.hindsightBankId,
  });
  res.json(data);
});

router.get("/health", (_req, res) => {
  const config = getIntegrationConfig();
  const data = HealthCheckResponse.parse({
    status: "ok",
    hindsightConfigured: config.hindsightConfigured,
    llmConfigured: config.groqConfigured,
    memoryBankId: config.hindsightBankId,
  });
  res.json(data);
});

export default router;
