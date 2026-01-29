# Event-Driven Architecture Guide

## Table of Contents

1. [Overview](#overview)
2. [Why Event-Driven Architecture](#why-event-driven-architecture)
3. [Architecture Patterns](#architecture-patterns)
4. [Implementation Strategy](#implementation-strategy)
5. [Core Components](#core-components)
6. [Event Catalog](#event-catalog)
7. [Code Implementation](#code-implementation)
8. [Best Practices](#best-practices)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring & Observability](#monitoring--observability)
11. [Migration Plan](#migration-plan)

---

## Overview

This document outlines the implementation of Event-Driven Architecture (EDA) for the StoryChain backend. The goal is to decouple services, improve scalability, and enable asynchronous processing while maintaining data consistency.

### Current Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Controller │───▶│   Service   │───▶│ Repository  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   Direct Method Calls
                   (Tightly Coupled)
```

### Target Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Controller │───▶│   Service   │───▶│ Repository  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Event Bus   │
                   └─────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ Handler 1 │   │ Handler 2 │   │ Handler 3 │
    │(Notif.)   │   │(Gamify)   │   │(Analytics)│
    └───────────┘   └───────────┘   └───────────┘
```

---

## Why Event-Driven Architecture

### Problems with Current Approach

1. **Tight Coupling**: Services directly call each other
2. **Synchronous Blocking**: All operations happen in request cycle
3. **Difficult Scaling**: Can't scale individual concerns
4. **Poor Fault Isolation**: One failure affects entire request
5. **Complex Testing**: Hard to test side effects in isolation

### Benefits of EDA

| Benefit              | Description                                       |
| -------------------- | ------------------------------------------------- |
| **Loose Coupling**   | Services communicate via events, not direct calls |
| **Scalability**      | Scale event handlers independently                |
| **Resilience**       | Failed handlers don't block main flow             |
| **Auditability**     | Events provide natural audit trail                |
| **Extensibility**    | Add new handlers without modifying existing code  |
| **Async Processing** | Offload heavy tasks from request cycle            |

---

## Architecture Patterns

### Pattern 1: Event Notification

Used for: Notifying other parts of the system that something happened.

```typescript
// Producer: Publishes event after action completes
await storyRepository.create(story);
await eventBus.publish(new StoryCreatedEvent(story));

// Consumer: Reacts to event
eventBus.subscribe('story.created', async (event) => {
  await notificationService.notifyFollowers(event.payload);
});
```

### Pattern 2: Event-Carried State Transfer

Used for: Passing data to consumers without requiring them to query back.

```typescript
// Event carries all necessary data
const event = new ChapterPublishedEvent({
  chapterId: chapter._id,
  storyId: chapter.storyId,
  authorId: chapter.authorId,
  title: chapter.title,
  content: chapter.content,
  parentChapterId: chapter.parentChapterId,
  // Include related data to avoid queries
  story: {
    title: story.title,
    genre: story.genre,
  },
  author: {
    username: author.username,
  },
});
```

### Pattern 3: Event Sourcing (Future Consideration)

Used for: Full audit trail and ability to reconstruct state.

```typescript
// Store events as source of truth
await eventStore.append('story-123', [
  new StoryCreatedEvent({ ... }),
  new StoryTitleUpdatedEvent({ ... }),
  new ChapterAddedEvent({ ... }),
]);

// Reconstruct state by replaying events
const story = await eventStore.aggregate('story-123', StoryAggregate);
```

---

## Implementation Strategy

### Technology Stack

| Component          | Technology                 | Reason                                        |
| ------------------ | -------------------------- | --------------------------------------------- |
| **Event Bus**      | BullMQ (already installed) | Redis-backed, reliable, supports delayed jobs |
| **Message Broker** | Redis (already configured) | Low latency, persistence, pub/sub             |
| **Event Store**    | MongoDB (existing)         | Flexible schema, already in use               |

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Controllers │  │  Services   │  │ Repositories│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Event Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Event Bus   │  │Event Store  │  │ Event Types │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Handler Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Notification │  │Gamification │  │  Analytics  │         │
│  │  Handler    │  │  Handler    │  │   Handler   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Event Base Class

```typescript
// src/events/base/event.base.ts

import { randomUUID } from 'crypto';

export interface IEventMetadata {
  eventId: string;
  eventType: string;
  timestamp: Date;
  version: number;
  correlationId?: string;
  causationId?: string;
  userId?: string;
}

export abstract class DomainEvent<T = unknown> {
  public readonly metadata: IEventMetadata;
  public readonly payload: T;

  constructor(eventType: string, payload: T, options?: Partial<IEventMetadata>) {
    this.metadata = {
      eventId: options?.eventId ?? randomUUID(),
      eventType,
      timestamp: options?.timestamp ?? new Date(),
      version: options?.version ?? 1,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      userId: options?.userId,
    };
    this.payload = payload;
  }

  toJSON(): Record<string, unknown> {
    return {
      metadata: this.metadata,
      payload: this.payload,
    };
  }
}
```

### 2. Event Bus Interface

```typescript
// src/events/bus/event-bus.interface.ts

import { DomainEvent } from '../base/event.base';

export interface IEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface IEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  publishMany<T extends DomainEvent>(events: T[]): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void;
  unsubscribe(eventType: string, handler: IEventHandler): void;
}
```

### 3. BullMQ Event Bus Implementation

```typescript
// src/events/bus/bullmq-event-bus.ts

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { DomainEvent } from '../base/event.base';
import { IEventBus, IEventHandler } from './event-bus.interface';
import { logger } from '../../utils/logger';

export class BullMQEventBus implements IEventBus {
  private readonly queue: Queue;
  private readonly workers: Map<string, Worker> = new Map();
  private readonly handlers: Map<string, Set<IEventHandler>> = new Map();
  private readonly connection: Redis;

  constructor(connection: Redis, queueName = 'domain-events') {
    this.connection = connection;
    this.queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const { eventType } = event.metadata;

    await this.queue.add(eventType, event.toJSON(), {
      jobId: event.metadata.eventId,
    });

    logger.info('Event published', {
      eventId: event.metadata.eventId,
      eventType,
    });
  }

  async publishMany<T extends DomainEvent>(events: T[]): Promise<void> {
    const jobs = events.map((event) => ({
      name: event.metadata.eventType,
      data: event.toJSON(),
      opts: { jobId: event.metadata.eventId },
    }));

    await this.queue.addBulk(jobs);

    logger.info('Events published in bulk', { count: events.length });
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
      this.createWorker(eventType);
    }

    this.handlers.get(eventType)!.add(handler as IEventHandler);

    logger.info('Handler subscribed', {
      eventType,
      handlerName: handler.constructor.name,
    });
  }

  unsubscribe(eventType: string, handler: IEventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }

  private createWorker(eventType: string): void {
    const worker = new Worker(
      this.queue.name,
      async (job: Job) => {
        if (job.name !== eventType) return;

        const handlers = this.handlers.get(eventType);
        if (!handlers || handlers.size === 0) return;

        const results = await Promise.allSettled(
          Array.from(handlers).map((handler) => handler.handle(job.data as DomainEvent))
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          logger.error('Some handlers failed', {
            eventType,
            failures: failures.map((f) => (f as PromiseRejectedResult).reason),
          });
        }
      },
      { connection: this.connection }
    );

    worker.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job?.id,
        eventType,
        error: error.message,
      });
    });

    this.workers.set(eventType, worker);
  }

  async close(): Promise<void> {
    await this.queue.close();
    for (const worker of this.workers.values()) {
      await worker.close();
    }
  }
}
```

### 4. In-Memory Event Bus (for testing/development)

```typescript
// src/events/bus/memory-event-bus.ts

import { DomainEvent } from '../base/event.base';
import { IEventBus, IEventHandler } from './event-bus.interface';
import { logger } from '../../utils/logger';

export class InMemoryEventBus implements IEventBus {
  private readonly handlers: Map<string, Set<IEventHandler>> = new Map();
  private readonly publishedEvents: DomainEvent[] = [];

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    this.publishedEvents.push(event);

    const { eventType } = event.metadata;
    const eventHandlers = this.handlers.get(eventType);

    if (!eventHandlers || eventHandlers.size === 0) {
      logger.warn('No handlers for event', { eventType });
      return;
    }

    await Promise.all(Array.from(eventHandlers).map((handler) => handler.handle(event)));
  }

  async publishMany<T extends DomainEvent>(events: T[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as IEventHandler);
  }

  unsubscribe(eventType: string, handler: IEventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }

  // Test utilities
  getPublishedEvents(): DomainEvent[] {
    return [...this.publishedEvents];
  }

  clearPublishedEvents(): void {
    this.publishedEvents.length = 0;
  }
}
```

### 5. Event Store (for persistence and replay)

```typescript
// src/events/store/event-store.ts

import mongoose, { Schema, Document, ClientSession } from 'mongoose';
import { DomainEvent, IEventMetadata } from '../base/event.base';
import { logger } from '../../utils/logger';

interface IStoredEvent extends Document {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  metadata: IEventMetadata;
  sequence: number;
}

const StoredEventSchema = new Schema<IStoredEvent>(
  {
    aggregateId: { type: String, required: true, index: true },
    aggregateType: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    eventData: { type: Schema.Types.Mixed, required: true },
    metadata: {
      eventId: { type: String, required: true, unique: true },
      eventType: { type: String, required: true },
      timestamp: { type: Date, required: true },
      version: { type: Number, required: true },
      correlationId: { type: String },
      causationId: { type: String },
      userId: { type: String },
    },
    sequence: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

StoredEventSchema.index({ aggregateId: 1, sequence: 1 }, { unique: true });
StoredEventSchema.index({ 'metadata.timestamp': -1 });
StoredEventSchema.index({ 'metadata.correlationId': 1 });

const StoredEventModel = mongoose.model<IStoredEvent>('StoredEvent', StoredEventSchema);

export class EventStore {
  async append(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion?: number,
    session?: ClientSession
  ): Promise<void> {
    const lastEvent = await StoredEventModel.findOne({ aggregateId }).sort({ sequence: -1 }).lean();

    const currentVersion = lastEvent?.sequence ?? -1;

    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, but found ${currentVersion}`
      );
    }

    const storedEvents = events.map((event, index) => ({
      aggregateId,
      aggregateType,
      eventType: event.metadata.eventType,
      eventData: event.toJSON(),
      metadata: event.metadata,
      sequence: currentVersion + index + 1,
    }));

    await StoredEventModel.insertMany(storedEvents, { session });

    logger.info('Events appended to store', {
      aggregateId,
      count: events.length,
    });
  }

  async getEvents(aggregateId: string, fromSequence = 0): Promise<IStoredEvent[]> {
    return StoredEventModel.find({
      aggregateId,
      sequence: { $gte: fromSequence },
    })
      .sort({ sequence: 1 })
      .lean();
  }

  async getEventsByType(
    eventType: string,
    options: {
      from?: Date;
      to?: Date;
      limit?: number;
    } = {}
  ): Promise<IStoredEvent[]> {
    const query: Record<string, unknown> = { eventType };

    if (options.from || options.to) {
      query['metadata.timestamp'] = {};
      if (options.from) {
        (query['metadata.timestamp'] as Record<string, Date>).$gte = options.from;
      }
      if (options.to) {
        (query['metadata.timestamp'] as Record<string, Date>).$lte = options.to;
      }
    }

    return StoredEventModel.find(query)
      .sort({ 'metadata.timestamp': -1 })
      .limit(options.limit ?? 100)
      .lean();
  }

  async getEventsByCorrelationId(correlationId: string): Promise<IStoredEvent[]> {
    return StoredEventModel.find({ 'metadata.correlationId': correlationId })
      .sort({ 'metadata.timestamp': 1 })
      .lean();
  }
}
```

---

## Event Catalog

### Story Domain Events

| Event                     | Trigger                | Payload                         | Handlers                              |
| ------------------------- | ---------------------- | ------------------------------- | ------------------------------------- |
| `story.created`           | Story creation         | storyId, authorId, title, genre | Notification, Analytics, Gamification |
| `story.published`         | Story published        | storyId, authorId               | Notification, Search Index            |
| `story.updated`           | Story metadata changed | storyId, changes                | Search Index                          |
| `story.deleted`           | Story deleted          | storyId, authorId               | Cleanup, Analytics                    |
| `story.milestone_reached` | Vote/read milestone    | storyId, milestone, count       | Notification, Gamification            |

### Chapter Domain Events

| Event               | Trigger             | Payload                                       | Handlers                   |
| ------------------- | ------------------- | --------------------------------------------- | -------------------------- |
| `chapter.created`   | New chapter         | chapterId, storyId, authorId, parentChapterId | Notification, Analytics    |
| `chapter.published` | Chapter published   | chapterId, storyId                            | Notification, Search Index |
| `chapter.branched`  | Branch created      | chapterId, parentChapterId, storyId           | Notification, Gamification |
| `chapter.updated`   | Chapter edited      | chapterId, changes                            | Version History            |
| `chapter.autosaved` | Auto-save triggered | chapterId, content                            | None (fire-and-forget)     |

### User Domain Events

| Event                  | Trigger               | Payload                | Handlers                  |
| ---------------------- | --------------------- | ---------------------- | ------------------------- |
| `user.registered`      | New user signup       | userId, username       | Welcome Email, Analytics  |
| `user.profile_updated` | Profile changed       | userId, changes        | Search Index              |
| `user.level_up`        | XP threshold reached  | userId, newLevel       | Notification, Badge Check |
| `user.badge_earned`    | Badge criteria met    | userId, badgeId        | Notification              |
| `user.followed`        | User followed another | followerId, followedId | Notification              |

### Collaboration Domain Events

| Event                       | Trigger             | Payload                             | Handlers              |
| --------------------------- | ------------------- | ----------------------------------- | --------------------- |
| `collaborator.invited`      | Invitation sent     | storyId, inviterId, inviteeId, role | Notification, Email   |
| `collaborator.joined`       | Invitation accepted | storyId, userId, role               | Notification          |
| `collaborator.left`         | Collaborator left   | storyId, userId                     | Notification, Cleanup |
| `collaborator.role_changed` | Role updated        | storyId, userId, oldRole, newRole   | Notification          |

### Pull Request Domain Events

| Event         | Trigger          | Payload                  | Handlers                   |
| ------------- | ---------------- | ------------------------ | -------------------------- |
| `pr.created`  | New PR submitted | prId, storyId, authorId  | Notification               |
| `pr.reviewed` | PR reviewed      | prId, reviewerId, status | Notification               |
| `pr.approved` | PR approved      | prId, approverId         | Notification, Gamification |
| `pr.merged`   | PR merged        | prId, storyId            | Notification, Analytics    |
| `pr.rejected` | PR rejected      | prId, reason             | Notification               |

### Engagement Domain Events

| Event              | Trigger                  | Payload                                   | Handlers                          |
| ------------------ | ------------------------ | ----------------------------------------- | --------------------------------- |
| `vote.cast`        | Vote on content          | targetType, targetId, voterId, voteType   | Notification, Analytics, Trending |
| `comment.created`  | New comment              | commentId, targetType, targetId, authorId | Notification                      |
| `bookmark.created` | Content bookmarked       | userId, targetType, targetId              | Analytics                         |
| `reading.progress` | Reading progress updated | userId, chapterId, progress               | Analytics, Recommendations        |

---

## Code Implementation

### Event Definitions

```typescript
// src/events/domain/story.events.ts

import { DomainEvent } from '../base/event.base';

// Event Types Enum
export enum StoryEventType {
  CREATED = 'story.created',
  PUBLISHED = 'story.published',
  UPDATED = 'story.updated',
  DELETED = 'story.deleted',
  MILESTONE_REACHED = 'story.milestone_reached',
}

// Payload Interfaces
export interface StoryCreatedPayload {
  storyId: string;
  authorId: string;
  title: string;
  genre: string;
  isPublic: boolean;
}

export interface StoryPublishedPayload {
  storyId: string;
  authorId: string;
  title: string;
  followers: string[];
}

export interface StoryMilestonePayload {
  storyId: string;
  authorId: string;
  milestoneType: 'votes' | 'reads' | 'branches';
  count: number;
  threshold: number;
}

// Event Classes
export class StoryCreatedEvent extends DomainEvent<StoryCreatedPayload> {
  constructor(payload: StoryCreatedPayload, userId?: string) {
    super(StoryEventType.CREATED, payload, { userId });
  }
}

export class StoryPublishedEvent extends DomainEvent<StoryPublishedPayload> {
  constructor(payload: StoryPublishedPayload, userId?: string) {
    super(StoryEventType.PUBLISHED, payload, { userId });
  }
}

export class StoryMilestoneReachedEvent extends DomainEvent<StoryMilestonePayload> {
  constructor(payload: StoryMilestonePayload, userId?: string) {
    super(StoryEventType.MILESTONE_REACHED, payload, { userId });
  }
}
```

```typescript
// src/events/domain/chapter.events.ts

import { DomainEvent } from '../base/event.base';

export enum ChapterEventType {
  CREATED = 'chapter.created',
  PUBLISHED = 'chapter.published',
  BRANCHED = 'chapter.branched',
  UPDATED = 'chapter.updated',
}

export interface ChapterCreatedPayload {
  chapterId: string;
  storyId: string;
  authorId: string;
  title: string;
  parentChapterId?: string;
  isBranch: boolean;
}

export interface ChapterBranchedPayload {
  chapterId: string;
  storyId: string;
  authorId: string;
  parentChapterId: string;
  parentAuthorId: string;
  title: string;
}

export class ChapterCreatedEvent extends DomainEvent<ChapterCreatedPayload> {
  constructor(payload: ChapterCreatedPayload, userId?: string) {
    super(ChapterEventType.CREATED, payload, { userId });
  }
}

export class ChapterBranchedEvent extends DomainEvent<ChapterBranchedPayload> {
  constructor(payload: ChapterBranchedPayload, userId?: string) {
    super(ChapterEventType.BRANCHED, payload, { userId });
  }
}
```

```typescript
// src/events/domain/user.events.ts

import { DomainEvent } from '../base/event.base';

export enum UserEventType {
  REGISTERED = 'user.registered',
  PROFILE_UPDATED = 'user.profile_updated',
  LEVEL_UP = 'user.level_up',
  BADGE_EARNED = 'user.badge_earned',
  FOLLOWED = 'user.followed',
}

export interface UserLevelUpPayload {
  userId: string;
  username: string;
  previousLevel: number;
  newLevel: number;
  totalXp: number;
}

export interface UserBadgeEarnedPayload {
  userId: string;
  username: string;
  badgeId: string;
  badgeName: string;
}

export interface UserFollowedPayload {
  followerId: string;
  followerUsername: string;
  followedId: string;
  followedUsername: string;
}

export class UserLevelUpEvent extends DomainEvent<UserLevelUpPayload> {
  constructor(payload: UserLevelUpPayload) {
    super(UserEventType.LEVEL_UP, payload, { userId: payload.userId });
  }
}

export class UserBadgeEarnedEvent extends DomainEvent<UserBadgeEarnedPayload> {
  constructor(payload: UserBadgeEarnedPayload) {
    super(UserEventType.BADGE_EARNED, payload, { userId: payload.userId });
  }
}

export class UserFollowedEvent extends DomainEvent<UserFollowedPayload> {
  constructor(payload: UserFollowedPayload) {
    super(UserEventType.FOLLOWED, payload, { userId: payload.followerId });
  }
}
```

### Event Handlers

```typescript
// src/events/handlers/notification.handler.ts

import { IEventHandler } from '../bus/event-bus.interface';
import { StoryCreatedEvent, StoryMilestoneReachedEvent } from '../domain/story.events';
import { ChapterBranchedEvent } from '../domain/chapter.events';
import { UserFollowedEvent, UserLevelUpEvent } from '../domain/user.events';
import { NotificationFactoryService } from '../../services/notificationFactory.service';
import { NotificationRepository } from '../../features/notification/repository/notification.repository';
import { logger } from '../../utils/logger';

export class StoryCreatedNotificationHandler implements IEventHandler<StoryCreatedEvent> {
  constructor(
    private notificationFactory: NotificationFactoryService,
    private notificationRepository: NotificationRepository
  ) {}

  async handle(event: StoryCreatedEvent): Promise<void> {
    const { storyId, authorId, title } = event.payload;

    logger.info('Handling story created notification', {
      eventId: event.metadata.eventId,
      storyId,
    });

    // Create notifications for followers
    // This is handled asynchronously, separate from the main request
  }
}

export class ChapterBranchNotificationHandler implements IEventHandler<ChapterBranchedEvent> {
  constructor(
    private notificationFactory: NotificationFactoryService,
    private notificationRepository: NotificationRepository
  ) {}

  async handle(event: ChapterBranchedEvent): Promise<void> {
    const { chapterId, storyId, authorId, parentAuthorId, title } = event.payload;

    logger.info('Handling chapter branched notification', {
      eventId: event.metadata.eventId,
      chapterId,
    });

    // Don't notify if user branched their own chapter
    if (authorId === parentAuthorId) return;

    const notification = this.notificationFactory.create('NEW_BRANCH', {
      storyId,
      branchUserId: authorId,
      branchTitle: title,
    });

    await this.notificationRepository.create({
      ...notification,
      userId: parentAuthorId,
    });
  }
}

export class UserFollowedNotificationHandler implements IEventHandler<UserFollowedEvent> {
  constructor(
    private notificationFactory: NotificationFactoryService,
    private notificationRepository: NotificationRepository
  ) {}

  async handle(event: UserFollowedEvent): Promise<void> {
    const { followerId, followerUsername, followedId } = event.payload;

    logger.info('Handling user followed notification', {
      eventId: event.metadata.eventId,
      followerId,
      followedId,
    });

    const notification = this.notificationFactory.create('NEW_FOLLOWER', {
      followerUserId: followerId,
      followerUsername,
    });

    await this.notificationRepository.create({
      ...notification,
      userId: followedId,
    });
  }
}

export class MilestoneNotificationHandler implements IEventHandler<StoryMilestoneReachedEvent> {
  constructor(
    private notificationFactory: NotificationFactoryService,
    private notificationRepository: NotificationRepository
  ) {}

  async handle(event: StoryMilestoneReachedEvent): Promise<void> {
    const { storyId, authorId, milestoneType, count, threshold } = event.payload;

    logger.info('Handling milestone notification', {
      eventId: event.metadata.eventId,
      storyId,
      milestoneType,
      threshold,
    });

    const notification = this.notificationFactory.create('STORY_MILESTONE', {
      storyId,
      milestoneType,
      count,
      threshold,
    });

    await this.notificationRepository.create({
      ...notification,
      userId: authorId,
    });
  }
}
```

```typescript
// src/events/handlers/gamification.handler.ts

import { IEventHandler } from '../bus/event-bus.interface';
import { StoryCreatedEvent } from '../domain/story.events';
import { ChapterCreatedEvent, ChapterBranchedEvent } from '../domain/chapter.events';
import { UserRepository } from '../../features/user/repository/user.repository';
import { XP_REWARDS, LEVELS, BADGES } from '../../constants';
import { logger } from '../../utils/logger';
import { IEventBus } from '../bus/event-bus.interface';
import { UserLevelUpEvent, UserBadgeEarnedEvent } from '../domain/user.events';

export class GamificationHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: IEventBus
  ) {}

  async handleStoryCreated(event: StoryCreatedEvent): Promise<void> {
    const { authorId } = event.payload;

    logger.info('Awarding XP for story creation', {
      eventId: event.metadata.eventId,
      authorId,
    });

    await this.awardXp(authorId, XP_REWARDS.STORY_CREATION);
    await this.checkBadges(authorId, 'stories_created');
  }

  async handleChapterCreated(event: ChapterCreatedEvent): Promise<void> {
    const { authorId, isBranch } = event.payload;

    const xpAmount = isBranch ? XP_REWARDS.BRANCH_CREATION : XP_REWARDS.CHAPTER_CREATION;

    logger.info('Awarding XP for chapter creation', {
      eventId: event.metadata.eventId,
      authorId,
      isBranch,
    });

    await this.awardXp(authorId, xpAmount);
    await this.checkBadges(authorId, isBranch ? 'branches_created' : 'chapters_created');
  }

  private async awardXp(userId: string, amount: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) return;

    const previousLevel = this.calculateLevel(user.stats.xp);
    const newXp = user.stats.xp + amount;
    const newLevel = this.calculateLevel(newXp);

    await this.userRepository.update(userId, {
      'stats.xp': newXp,
      'stats.level': newLevel,
    });

    if (newLevel > previousLevel) {
      await this.eventBus.publish(
        new UserLevelUpEvent({
          userId,
          username: user.username,
          previousLevel,
          newLevel,
          totalXp: newXp,
        })
      );
    }
  }

  private calculateLevel(xp: number): number {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].threshold) {
        return LEVELS[i].level;
      }
    }
    return 1;
  }

  private async checkBadges(userId: string, action: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) return;

    for (const badge of BADGES) {
      if (user.badges.includes(badge.id)) continue;

      const isEligible = this.checkBadgeEligibility(user, badge);
      if (isEligible) {
        await this.userRepository.update(userId, {
          $push: { badges: badge.id },
        });

        await this.eventBus.publish(
          new UserBadgeEarnedEvent({
            userId,
            username: user.username,
            badgeId: badge.id,
            badgeName: badge.name,
          })
        );
      }
    }
  }

  private checkBadgeEligibility(user: any, badge: any): boolean {
    // Implement badge eligibility logic
    return false;
  }
}
```

```typescript
// src/events/handlers/analytics.handler.ts

import { IEventHandler } from '../bus/event-bus.interface';
import { DomainEvent } from '../base/event.base';
import { logger } from '../../utils/logger';

interface AnalyticsPayload {
  eventType: string;
  timestamp: Date;
  userId?: string;
  metadata: Record<string, unknown>;
}

export class AnalyticsHandler implements IEventHandler {
  async handle(event: DomainEvent): Promise<void> {
    const analyticsPayload: AnalyticsPayload = {
      eventType: event.metadata.eventType,
      timestamp: event.metadata.timestamp,
      userId: event.metadata.userId,
      metadata: event.payload as Record<string, unknown>,
    };

    logger.info('Analytics event', analyticsPayload);

    // Here you could:
    // 1. Send to analytics service (Mixpanel, Amplitude, etc.)
    // 2. Store in analytics database
    // 3. Update real-time dashboards
    // 4. Feed into recommendation engine
  }
}
```

### Service Integration

```typescript
// src/events/index.ts - Event System Initialization

import { Redis } from 'ioredis';
import { BullMQEventBus } from './bus/bullmq-event-bus';
import { InMemoryEventBus } from './bus/memory-event-bus';
import { EventStore } from './store/event-store';
import { IEventBus } from './bus/event-bus.interface';

// Event Types
export * from './domain/story.events';
export * from './domain/chapter.events';
export * from './domain/user.events';

// Handlers
export * from './handlers/notification.handler';
export * from './handlers/gamification.handler';
export * from './handlers/analytics.handler';

// Singleton instances
let eventBus: IEventBus;
let eventStore: EventStore;

export function initializeEventSystem(redis: Redis): {
  eventBus: IEventBus;
  eventStore: EventStore;
} {
  const isProduction = process.env.NODE_ENV === 'production';

  eventBus = isProduction ? new BullMQEventBus(redis) : new InMemoryEventBus();

  eventStore = new EventStore();

  return { eventBus, eventStore };
}

export function getEventBus(): IEventBus {
  if (!eventBus) {
    throw new Error('Event system not initialized');
  }
  return eventBus;
}

export function getEventStore(): EventStore {
  if (!eventStore) {
    throw new Error('Event system not initialized');
  }
  return eventStore;
}
```

```typescript
// src/events/bootstrap.ts - Handler Registration

import { IEventBus } from './bus/event-bus.interface';
import { StoryEventType } from './domain/story.events';
import { ChapterEventType } from './domain/chapter.events';
import { UserEventType } from './domain/user.events';
import {
  StoryCreatedNotificationHandler,
  ChapterBranchNotificationHandler,
  UserFollowedNotificationHandler,
  MilestoneNotificationHandler,
} from './handlers/notification.handler';
import { GamificationHandler } from './handlers/gamification.handler';
import { AnalyticsHandler } from './handlers/analytics.handler';
import { NotificationFactoryService } from '../services/notificationFactory.service';
import { NotificationRepository } from '../features/notification/repository/notification.repository';
import { UserRepository } from '../features/user/repository/user.repository';

export function registerEventHandlers(eventBus: IEventBus): void {
  // Initialize dependencies
  const notificationFactory = new NotificationFactoryService();
  const notificationRepository = new NotificationRepository();
  const userRepository = new UserRepository();

  // Notification Handlers
  const storyCreatedNotifHandler = new StoryCreatedNotificationHandler(
    notificationFactory,
    notificationRepository
  );
  const chapterBranchNotifHandler = new ChapterBranchNotificationHandler(
    notificationFactory,
    notificationRepository
  );
  const userFollowedNotifHandler = new UserFollowedNotificationHandler(
    notificationFactory,
    notificationRepository
  );
  const milestoneNotifHandler = new MilestoneNotificationHandler(
    notificationFactory,
    notificationRepository
  );

  // Gamification Handler
  const gamificationHandler = new GamificationHandler(userRepository, eventBus);

  // Analytics Handler
  const analyticsHandler = new AnalyticsHandler();

  // Register Story Events
  eventBus.subscribe(StoryEventType.CREATED, storyCreatedNotifHandler);
  eventBus.subscribe(StoryEventType.CREATED, {
    handle: (e) => gamificationHandler.handleStoryCreated(e),
  });
  eventBus.subscribe(StoryEventType.CREATED, analyticsHandler);
  eventBus.subscribe(StoryEventType.MILESTONE_REACHED, milestoneNotifHandler);

  // Register Chapter Events
  eventBus.subscribe(ChapterEventType.BRANCHED, chapterBranchNotifHandler);
  eventBus.subscribe(ChapterEventType.CREATED, {
    handle: (e) => gamificationHandler.handleChapterCreated(e),
  });
  eventBus.subscribe(ChapterEventType.CREATED, analyticsHandler);

  // Register User Events
  eventBus.subscribe(UserEventType.FOLLOWED, userFollowedNotifHandler);
  eventBus.subscribe(UserEventType.LEVEL_UP, analyticsHandler);
  eventBus.subscribe(UserEventType.BADGE_EARNED, analyticsHandler);
}
```

### Updated Service Example

```typescript
// src/features/story/story.service.ts (Updated)

import { StoryRepository } from './repository/story.repository';
import { getEventBus } from '../../events';
import { StoryCreatedEvent, StoryPublishedEvent } from '../../events/domain/story.events';
import { withTransaction } from '../../utils/withTransaction';
import { logger } from '../../utils/logger';

export class StoryService {
  constructor(private storyRepository: StoryRepository) {}

  async createStory(data: CreateStoryDto, userId: string): Promise<Story> {
    return withTransaction(async (session) => {
      // 1. Create the story (main business logic)
      const story = await this.storyRepository.create(
        {
          ...data,
          authorId: userId,
          status: 'draft',
        },
        session
      );

      // 2. Publish event (after successful creation)
      const eventBus = getEventBus();
      await eventBus.publish(
        new StoryCreatedEvent(
          {
            storyId: story._id.toString(),
            authorId: userId,
            title: story.title,
            genre: story.genre,
            isPublic: story.isPublic,
          },
          userId
        )
      );

      logger.info('Story created and event published', {
        storyId: story._id,
        userId,
      });

      return story;
    });
  }

  async publishStory(storyId: string, userId: string): Promise<Story> {
    return withTransaction(async (session) => {
      const story = await this.storyRepository.update(
        storyId,
        { status: 'published', publishedAt: new Date() },
        session
      );

      // Get follower IDs for the notification
      const followers = await this.getAuthorFollowers(userId);

      const eventBus = getEventBus();
      await eventBus.publish(
        new StoryPublishedEvent(
          {
            storyId,
            authorId: userId,
            title: story.title,
            followers: followers.map((f) => f._id.toString()),
          },
          userId
        )
      );

      return story;
    });
  }

  private async getAuthorFollowers(authorId: string): Promise<any[]> {
    // Implementation
    return [];
  }
}
```

---

## Best Practices

### 1. Event Design

```typescript
// DO: Use past tense for event names
'story.created';
'chapter.published';
'user.followed';

// DON'T: Use imperative or present tense
'story.create';
'chapter.publishing';
'user.follow';
```

```typescript
// DO: Include all necessary data in event payload
new StoryCreatedEvent({
  storyId: story._id,
  authorId: story.authorId,
  title: story.title,
  genre: story.genre,
  // Include data handlers need
});

// DON'T: Force handlers to query for data
new StoryCreatedEvent({
  storyId: story._id,
  // Handler has to query for everything else
});
```

### 2. Idempotency

```typescript
// DO: Make handlers idempotent
class NotificationHandler {
  async handle(event: UserFollowedEvent): Promise<void> {
    const exists = await this.notificationRepo.findByEventId(event.metadata.eventId);

    if (exists) {
      logger.info('Notification already created, skipping', {
        eventId: event.metadata.eventId,
      });
      return;
    }

    await this.notificationRepo.create({
      ...notification,
      eventId: event.metadata.eventId, // Store for idempotency check
    });
  }
}
```

### 3. Error Handling

```typescript
// DO: Handle errors gracefully, don't break the chain
class ResilientHandler implements IEventHandler {
  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.processEvent(event);
    } catch (error) {
      logger.error('Handler failed', {
        eventId: event.metadata.eventId,
        error: error.message,
      });

      // Re-throw for retry mechanism
      throw error;
    }
  }
}
```

### 4. Event Ordering

```typescript
// DO: Use correlation IDs to track related events
const correlationId = randomUUID();

await eventBus.publish(new StoryCreatedEvent(payload, { correlationId }));
await eventBus.publish(
  new ChapterCreatedEvent(payload, {
    correlationId,
    causationId: storyEventId, // Links to causing event
  })
);
```

### 5. Versioning

```typescript
// DO: Version your events for backward compatibility
export class StoryCreatedEventV1 extends DomainEvent<StoryCreatedPayloadV1> {
  constructor(payload: StoryCreatedPayloadV1) {
    super('story.created', payload, { version: 1 });
  }
}

export class StoryCreatedEventV2 extends DomainEvent<StoryCreatedPayloadV2> {
  constructor(payload: StoryCreatedPayloadV2) {
    super('story.created', payload, { version: 2 });
  }
}

// Handler supports multiple versions
class StoryCreatedHandler {
  async handle(event: DomainEvent): Promise<void> {
    switch (event.metadata.version) {
      case 1:
        return this.handleV1(event as StoryCreatedEventV1);
      case 2:
        return this.handleV2(event as StoryCreatedEventV2);
      default:
        throw new Error(`Unsupported event version: ${event.metadata.version}`);
    }
  }
}
```

### 6. Transaction Outbox Pattern

For guaranteed event delivery:

```typescript
// src/events/outbox/outbox.model.ts

const OutboxSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['pending', 'published', 'failed'],
    default: 'pending',
  },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  publishedAt: { type: Date },
});

// In service: write to outbox in same transaction
async createStory(data: CreateStoryDto): Promise<Story> {
  return withTransaction(async (session) => {
    const story = await this.storyRepository.create(data, session);

    // Write event to outbox (same transaction)
    await OutboxModel.create([{
      eventId: randomUUID(),
      eventType: 'story.created',
      payload: { storyId: story._id, ... },
    }], { session });

    return story;
  });
}

// Separate worker publishes from outbox
class OutboxPublisher {
  async publishPending(): Promise<void> {
    const pending = await OutboxModel.find({ status: 'pending' }).limit(100);

    for (const item of pending) {
      try {
        await eventBus.publish(item.toEvent());
        await item.updateOne({ status: 'published', publishedAt: new Date() });
      } catch (error) {
        await item.updateOne({ $inc: { retryCount: 1 } });
      }
    }
  }
}
```

---

## Testing Strategy

### Unit Testing Handlers

```typescript
// src/events/handlers/__tests__/notification.handler.test.ts

import { InMemoryEventBus } from '../../bus/memory-event-bus';
import { StoryCreatedNotificationHandler } from '../notification.handler';
import { StoryCreatedEvent } from '../../domain/story.events';

describe('StoryCreatedNotificationHandler', () => {
  let handler: StoryCreatedNotificationHandler;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let mockNotificationFactory: jest.Mocked<NotificationFactoryService>;

  beforeEach(() => {
    mockNotificationRepo = {
      create: jest.fn(),
      findByEventId: jest.fn(),
    } as any;

    mockNotificationFactory = {
      create: jest.fn().mockReturnValue({
        type: 'STORY_CREATED',
        message: 'New story created',
      }),
    } as any;

    handler = new StoryCreatedNotificationHandler(mockNotificationFactory, mockNotificationRepo);
  });

  it('should create notification for story creation', async () => {
    const event = new StoryCreatedEvent({
      storyId: 'story-123',
      authorId: 'user-456',
      title: 'Test Story',
      genre: 'fantasy',
      isPublic: true,
    });

    await handler.handle(event);

    expect(mockNotificationFactory.create).toHaveBeenCalledWith(
      'STORY_CREATED',
      expect.any(Object)
    );
  });

  it('should be idempotent', async () => {
    const event = new StoryCreatedEvent({
      storyId: 'story-123',
      authorId: 'user-456',
      title: 'Test Story',
      genre: 'fantasy',
      isPublic: true,
    });

    mockNotificationRepo.findByEventId.mockResolvedValue({ id: 'existing' });

    await handler.handle(event);

    expect(mockNotificationRepo.create).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
// src/events/__tests__/event-flow.integration.test.ts

import { InMemoryEventBus } from '../bus/memory-event-bus';
import { registerEventHandlers } from '../bootstrap';
import { StoryCreatedEvent } from '../domain/story.events';

describe('Event Flow Integration', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
    registerEventHandlers(eventBus);
  });

  it('should process story creation through all handlers', async () => {
    const event = new StoryCreatedEvent({
      storyId: 'story-123',
      authorId: 'user-456',
      title: 'Test Story',
      genre: 'fantasy',
      isPublic: true,
    });

    await eventBus.publish(event);

    // Verify all expected side effects
    const publishedEvents = eventBus.getPublishedEvents();
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0].metadata.eventType).toBe('story.created');
  });
});
```

### E2E Testing

```typescript
// src/events/__tests__/event-e2e.test.ts

describe('Event E2E Tests', () => {
  it('should create story and trigger notifications', async () => {
    // Create story via API
    const response = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Story', genre: 'fantasy' });

    expect(response.status).toBe(201);

    // Wait for async event processing
    await sleep(100);

    // Verify notification was created
    const notifications = await NotificationModel.find({
      'metadata.storyId': response.body.data._id,
    });

    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

---

## Monitoring & Observability

### Event Metrics

```typescript
// src/events/metrics/event-metrics.ts

import { Counter, Histogram } from 'prom-client';

export const eventPublishedCounter = new Counter({
  name: 'events_published_total',
  help: 'Total number of events published',
  labelNames: ['event_type'],
});

export const eventProcessedCounter = new Counter({
  name: 'events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['event_type', 'handler', 'status'],
});

export const eventProcessingDuration = new Histogram({
  name: 'event_processing_duration_seconds',
  help: 'Event processing duration in seconds',
  labelNames: ['event_type', 'handler'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Usage in handler
class InstrumentedHandler implements IEventHandler {
  async handle(event: DomainEvent): Promise<void> {
    const timer = eventProcessingDuration.startTimer({
      event_type: event.metadata.eventType,
      handler: this.constructor.name,
    });

    try {
      await this.innerHandler.handle(event);
      eventProcessedCounter.inc({
        event_type: event.metadata.eventType,
        handler: this.constructor.name,
        status: 'success',
      });
    } catch (error) {
      eventProcessedCounter.inc({
        event_type: event.metadata.eventType,
        handler: this.constructor.name,
        status: 'failure',
      });
      throw error;
    } finally {
      timer();
    }
  }
}
```

### Logging Standards

```typescript
// Structured logging for events
logger.info('Event published', {
  eventId: event.metadata.eventId,
  eventType: event.metadata.eventType,
  correlationId: event.metadata.correlationId,
  userId: event.metadata.userId,
});

logger.info('Event processed', {
  eventId: event.metadata.eventId,
  eventType: event.metadata.eventType,
  handler: 'NotificationHandler',
  duration: processingTime,
});

logger.error('Event processing failed', {
  eventId: event.metadata.eventId,
  eventType: event.metadata.eventType,
  handler: 'NotificationHandler',
  error: error.message,
  stack: error.stack,
});
```

### Dead Letter Queue

```typescript
// src/events/dlq/dead-letter-queue.ts

import { Queue } from 'bullmq';

export class DeadLetterQueue {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('dead-letter-queue', { connection });
  }

  async add(event: DomainEvent, error: Error, handler: string): Promise<void> {
    await this.queue.add('failed-event', {
      event: event.toJSON(),
      error: {
        message: error.message,
        stack: error.stack,
      },
      handler,
      failedAt: new Date(),
    });
  }

  async getFailedEvents(limit = 100): Promise<any[]> {
    const jobs = await this.queue.getJobs(['waiting', 'delayed'], 0, limit);
    return jobs.map((job) => job.data);
  }

  async retry(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      // Re-publish to main event bus
      await getEventBus().publish(job.data.event);
      await job.remove();
    }
  }
}
```

---

## Migration Plan

### Phase 1: Foundation (Week 1-2)

1. **Set up event infrastructure**
   - Create base event classes
   - Implement BullMQ event bus
   - Set up event store
   - Add monitoring/metrics

2. **Create initial events**
   - Story domain events
   - Chapter domain events
   - User domain events

### Phase 2: Notification Migration (Week 3-4)

1. **Migrate notification creation**
   - Replace direct notification calls with events
   - Create notification handlers
   - Test thoroughly

2. **Events to migrate:**
   - `story.created` → Notify followers
   - `chapter.branched` → Notify parent author
   - `user.followed` → Notify followed user
   - `pr.created` → Notify story collaborators

### Phase 3: Gamification Migration (Week 5-6)

1. **Migrate XP/badge logic**
   - Create gamification handlers
   - Move XP calculations to event handlers
   - Implement badge checking

2. **Events to handle:**
   - `story.created` → Award XP
   - `chapter.created` → Award XP
   - `vote.cast` → Award XP
   - All events → Check badge eligibility

### Phase 4: Analytics & Cleanup (Week 7-8)

1. **Add analytics handlers**
   - Create analytics event handlers
   - Set up analytics pipeline

2. **Cleanup & optimization**
   - Remove deprecated code
   - Optimize event processing
   - Performance testing
   - Documentation update

### Migration Checklist

```markdown
- [ ] Event infrastructure setup
- [ ] Base classes implemented
- [ ] Event bus (BullMQ) configured
- [ ] Event store created
- [ ] Monitoring added
- [ ] Story events defined
- [ ] Chapter events defined
- [ ] User events defined
- [ ] Collaboration events defined
- [ ] PR events defined
- [ ] Notification handlers migrated
- [ ] Gamification handlers migrated
- [ ] Analytics handlers added
- [ ] Tests written
- [ ] Documentation updated
- [ ] Performance validated
- [ ] Production deployed
```

---

## File Structure

```
src/
├── events/
│   ├── index.ts                 # Main exports & initialization
│   ├── bootstrap.ts             # Handler registration
│   │
│   ├── base/
│   │   └── event.base.ts        # Base event class
│   │
│   ├── bus/
│   │   ├── event-bus.interface.ts
│   │   ├── bullmq-event-bus.ts  # Production implementation
│   │   └── memory-event-bus.ts  # Testing implementation
│   │
│   ├── store/
│   │   └── event-store.ts       # Event persistence
│   │
│   ├── domain/
│   │   ├── story.events.ts
│   │   ├── chapter.events.ts
│   │   ├── user.events.ts
│   │   ├── collaboration.events.ts
│   │   └── pr.events.ts
│   │
│   ├── handlers/
│   │   ├── notification.handler.ts
│   │   ├── gamification.handler.ts
│   │   ├── analytics.handler.ts
│   │   └── __tests__/
│   │
│   ├── outbox/
│   │   ├── outbox.model.ts
│   │   └── outbox.publisher.ts
│   │
│   ├── dlq/
│   │   └── dead-letter-queue.ts
│   │
│   └── metrics/
│       └── event-metrics.ts
```

---

## Summary

This event-driven architecture provides:

- **Decoupled services** through event-based communication
- **Scalable handlers** that can be independently scaled
- **Reliable delivery** with BullMQ retry mechanisms
- **Full auditability** through event store
- **Easy extensibility** by adding new handlers
- **Robust testing** with in-memory event bus
- **Comprehensive monitoring** with metrics and logging

The implementation leverages existing infrastructure (BullMQ, Redis, MongoDB) while introducing clean abstractions that make the system more maintainable and scalable.
