import 'reflect-metadata';

// Export tokens first (no dependencies)
export { TOKENS } from './tokens';
export type { ContainerConfig, IModule } from './types';

// Then import and initialize registry
import { container, registerServices } from './registry';

// Initialize all services
registerServices();

export { container };
