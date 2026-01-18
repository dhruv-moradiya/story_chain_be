import { DependencyContainer } from 'tsyringe';

/**
 * Type helper for resolving dependencies
 */
export type ResolveType<T> = T extends new (...args: unknown[]) => infer R ? R : T;

/**
 * Container configuration options
 */
export interface ContainerConfig {
  enableLogging?: boolean;
  environment?: 'development' | 'production' | 'test';
}

/**
 * Module registration interface
 */
export interface IModule {
  register(container: DependencyContainer): void;
}
