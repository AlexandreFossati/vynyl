import type { HealthRepository } from '../repositories/health.repository';

export interface HealthService {
  // Resolves when the API can serve requests; rejects with the underlying failure otherwise.
  check(): Promise<void>;
}

export function createHealthService(deps: { healthRepository: HealthRepository }): HealthService {
  const { healthRepository } = deps;

  return {
    check: () => healthRepository.ping(),
  };
}
