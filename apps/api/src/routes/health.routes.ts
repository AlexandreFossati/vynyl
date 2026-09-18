import { Router } from 'express';
import type { HealthHandler } from '../handlers/health.handler';

// Mounted at /health, outside /api so the rate limiter never blocks a probe.
export function createHealthRouter(deps: { healthHandler: HealthHandler }): Router {
  const router = Router();

  router.get('/', deps.healthHandler.check);

  return router;
}
