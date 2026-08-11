# Type-Safe EventBus Architecture

## Overview

The `EventBusService` is a lightweight, strongly-typed in-memory event publisher/subscriber system built on top of Node.js native `EventEmitter` and integrated into TSyringe DI.

It provides zero-latency domain event delivery for Gamification, XP calculations, User events, and Notifications.

---

## Files

- [event-bus.types.ts](file:///Users/user/Documents/dhruv/story_chain_be/src/infrastructure/events/event-bus.types.ts): Event names enum (`APP_EVENTS`) and strongly-typed payload map (`IEventPayloadMap`).
- [event-bus.service.ts](file:///Users/user/Documents/dhruv/story_chain_be/src/infrastructure/events/event-bus.service.ts): `EventBusService` singleton with async error isolation.
- [tokens.ts](file:///Users/user/Documents/dhruv/story_chain_be/src/container/tokens.ts): `TOKENS.EventBusService`
- [registry.ts](file:///Users/user/Documents/dhruv/story_chain_be/src/container/registry.ts): TSyringe singleton registration.

---

## How to Emit Events

Inject `TOKENS.EventBusService` into any service or controller and call `.emit()`:

```typescript
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { EventBusService, APP_EVENTS } from '@infrastructure/events';

@singleton()
export class ReadingHistoryService {
  constructor(
    @inject(TOKENS.EventBusService) private readonly eventBus: EventBusService
  ) {}

  async recordReadSession(userId: string, chapterSlug: string, durationSeconds: number) {
    // Business logic...

    // Emit event (Typescript strictly enforces the payload schema!)
    this.eventBus.emit(APP_EVENTS.CHAPTER_READ, {
      userId,
      storySlug: 'adventure-story',
      chapterSlug,
      readDurationSeconds: durationSeconds,
      completed: true,
    });
  }
}
```

---

## How to Subscribe to Events

Subscribe using `.on()` or `.once()`:

```typescript
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { EventBusService, APP_EVENTS } from '@infrastructure/events';

@singleton()
export class GamificationEventListener {
  constructor(
    @inject(TOKENS.EventBusService) private readonly eventBus: EventBusService
  ) {}

  public registerListeners(): void {
    // Strongly typed payload parameter automatically inferred by TS
    this.eventBus.on(APP_EVENTS.CHAPTER_READ, async (payload) => {
      console.log(`Processing XP for user ${payload.userId} who read ${payload.chapterSlug}`);
    });
  }
}
```

---

## Adding New Events

To add a new event to the system:

1. Open [event-bus.types.ts](file:///Users/user/Documents/dhruv/story_chain_be/src/infrastructure/events/event-bus.types.ts).
2. Add the key to `APP_EVENTS`:
   ```typescript
   export const APP_EVENTS = {
     // ...
     BADGE_UNLOCKED: 'gamification:badge_unlocked',
   } as const;
   ```
3. Add the payload schema to `IEventPayloadMap`:
   ```typescript
   export interface IEventPayloadMap {
     // ...
     [APP_EVENTS.BADGE_UNLOCKED]: {
       userId: string;
       badgeId: string;
       unlockedAt: Date;
     };
   }
   ```
4. TypeScript will automatically enforce this payload shape across all `.emit()`, `.on()`, and `.once()` calls across your entire codebase!
