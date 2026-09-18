import type { RequestHandler } from 'express';
import type { HealthService } from '../services/health.service';

export interface HealthHandler {
  check: RequestHandler;
}

// Probes (load balancers, orchestrators) read the status code, and their body is not the API's
// error envelope, so this handler answers failures itself instead of forwarding them. The cause
// is logged, never sent. no-store keeps a stale answer out of any cache.
export function createHealthHandler(deps: { healthService: HealthService }): HealthHandler {
  const { healthService } = deps;

  return {
    check: async (req, res) => {
      res.set('Cache-Control', 'no-store');
      try {
        await healthService.check();
        res.json({ status: 'ok' });
      } catch (error) {
        req.log.error({ err: error }, 'Health check failed');
        res.status(503).json({ status: 'unavailable' });
      }
    },
  };
}
