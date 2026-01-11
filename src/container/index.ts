import 'reflect-metadata';

// ═══════════════════════════════════════════
// CONFIG SERVICES (must be first)
// ═══════════════════════════════════════════
import '@config/services/config.service';
import '@config/services/database.service';
import '@config/services/redis.service';

// ═══════════════════════════════════════════
// SHARED SERVICES
// ═══════════════════════════════════════════
// import '@shared/services/cache.service';
// import '@shared/services/email.service';
// import '@shared/services/queue.service';

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════
import { container } from 'tsyringe';

export { container };
export { TOKENS } from './tokens';
export type { ContainerConfig, IModule } from './types';
