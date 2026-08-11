import { EventEmitter } from 'events';
import { singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { IEventBusService, IEventPayloadMap, EventPayload, EventHandler } from './event-bus.types';

/**
 * EventBusService - Type-safe In-Memory Domain Event Bus
 *
 * @description
 * Lightweight, fully strongly-typed event publisher/subscriber module for domain events
 * such as Gamification, XP, Activity tracking, and Notifications.
 *
 * Built on Node's native EventEmitter with zero external dependencies and isolated async error handling.
 *
 * @example
 * // Emitting an event
 * this.eventBusService.emit(APP_EVENTS.CHAPTER_READ, {
 *   userId: 'user_123',
 *   storySlug: 'my-story',
 *   chapterSlug: 'ch-1',
 *   readDurationSeconds: 120,
 *   completed: true,
 * });
 *
 * // Subscribing to an event
 * this.eventBusService.on(APP_EVENTS.CHAPTER_READ, async (payload) => {
 *   await this.gamificationService.processReadXp(payload);
 * });
 */
@singleton()
export class EventBusService extends BaseModule implements IEventBusService {
  private readonly emitter: EventEmitter;

  constructor() {
    super();
    this.emitter = new EventEmitter();
    // Allow up to 100 listeners per event to avoid MaxListenersExceededWarning
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit a strongly-typed event with its corresponding payload.
   *
   * @param event - Registered event name
   * @param payload - Payload object matching the event schema
   */
  emit<K extends keyof IEventPayloadMap>(event: K, payload: EventPayload<K>): boolean {
    this.logInfo(`Event emitted: "${event}"`, { payload });
    return this.emitter.emit(event, payload);
  }

  /**
   * Register a persistent handler for a strongly-typed event.
   * Asynchronous handlers are safely wrapped to prevent unhandled promise rejections.
   *
   * @param event - Registered event name
   * @param handler - Callback function receiving typed payload
   */
  on<K extends keyof IEventPayloadMap>(event: K, handler: EventHandler<K>): this {
    const wrappedHandler = async (payload: EventPayload<K>) => {
      try {
        await handler(payload);
      } catch (error) {
        this.logError(`Error in listener for event "${event}"`, error);
      }
    };

    // Store reference to original handler on wrapper for clean off() removal
    wrappedHandler._original = handler;

    this.emitter.on(event, wrappedHandler);
    this.logDebug(`Registered listener for event: "${event}"`);
    return this;
  }

  /**
   * Register a one-time handler for a strongly-typed event.
   *
   * @param event - Registered event name
   * @param handler - Callback function receiving typed payload
   */
  once<K extends keyof IEventPayloadMap>(event: K, handler: EventHandler<K>): this {
    const wrappedHandler = async (payload: EventPayload<K>) => {
      try {
        await handler(payload);
      } catch (error) {
        this.logError(`Error in one-time listener for event "${event}"`, error);
      }
    };

    wrappedHandler._original = handler;

    this.emitter.once(event, wrappedHandler);
    this.logDebug(`Registered one-time listener for event: "${event}"`);
    return this;
  }

  /**
   * Remove a previously registered event listener.
   *
   * @param event - Registered event name
   * @param handler - Callback handler reference to remove
   */
  off<K extends keyof IEventPayloadMap>(event: K, handler: EventHandler<K>): this {
    const listeners = this.emitter.listeners(event);
    for (const listener of listeners) {
      if (listener === handler || (listener as any)._original === handler) {
        this.emitter.off(event, listener as (...args: any[]) => void);
        this.logDebug(`Removed listener for event: "${event}"`);
        break;
      }
    }
    return this;
  }

  /**
   * Remove all listeners for a specific event or all events if omitted.
   */
  removeAllListeners<K extends keyof IEventPayloadMap>(event?: K): this {
    if (event) {
      this.emitter.removeAllListeners(event);
      this.logDebug(`Removed all listeners for event: "${event}"`);
    } else {
      this.emitter.removeAllListeners();
      this.logDebug('Removed all listeners for all events');
    }
    return this;
  }

  /**
   * Return total subscriber count for a specific event.
   */
  listenerCount<K extends keyof IEventPayloadMap>(event: K): number {
    return this.emitter.listenerCount(event);
  }
}
