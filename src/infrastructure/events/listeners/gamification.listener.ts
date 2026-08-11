import { container, inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { EventBusService } from '../event-bus.service';
import { APP_EVENTS, EventPayload } from '../event-bus.types';
import { GamificationService } from '@/features/gamification/services/gamification.service.js';

/**
 * GamificationEventListener
 *
 * @description
 * Listens to domain events on the EventBus and processes gamification, XP awards,
 * level progression, and badge achievements.
 */
@singleton()
export class GamificationEventListener extends BaseModule {
  constructor(
    @inject(TOKENS.EventBusService)
    private readonly eventBus: EventBusService,
    @inject(TOKENS.GamificationService)
    private readonly gamificationService: GamificationService
  ) {
    super();
  }

  /**
   * Static initializer method to resolve the instance from TSyringe container
   * and register all event listeners.
   */
  public static initialize(): GamificationEventListener {
    const listener = container.resolve(GamificationEventListener);
    listener.registerListeners();
    return listener;
  }

  /**
   * Register all gamification-related event listeners
   */
  public registerListeners(): void {
    this.logInfo('Initializing Gamification Event Listeners...');

    // 1. Chapter Read Listener
    this.eventBus.on(APP_EVENTS.CHAPTER_READ, async (payload) => {
      await this.handleChapterRead(payload);
    });

    // 2. Chapter Published Listener
    this.eventBus.on(APP_EVENTS.CHAPTER_PUBLISHED, async (payload) => {
      await this.handleChapterPublished(payload);
    });

    // 3. Story Created Listener
    this.eventBus.on(APP_EVENTS.STORY_CREATED, async (payload) => {
      await this.handleStoryCreated(payload);
    });

    // 4. Comment Added Listener
    this.eventBus.on(APP_EVENTS.COMMENT_ADDED, async (payload) => {
      await this.handleCommentAdded(payload);
    });

    // 5. Vote Cast Listener
    this.eventBus.on(APP_EVENTS.VOTE_CAST, async (payload) => {
      await this.handleVoteCast(payload);
    });

    // 6. Pull Request Merged Listener
    this.eventBus.on(APP_EVENTS.PR_MERGED, async (payload) => {
      await this.handlePRMerged(payload);
    });

    this.logInfo('✅ Gamification Event Listeners initialized successfully');
  }

  // ═══════════════════════════════════════════
  // EVENT HANDLER BOILERPLATE METHODS
  // ═══════════════════════════════════════════

  private async handleChapterRead(
    payload: EventPayload<typeof APP_EVENTS.CHAPTER_READ>
  ): Promise<void> {
    this.logInfo(
      `[Gamification] Handling CHAPTER_READ for user: ${payload.userId}, story: ${payload.storySlug}`,
      payload
    );
    await this.gamificationService.evaluateStoryReadMilestones(payload.storySlug);
  }

  private async handleChapterPublished(
    payload: EventPayload<typeof APP_EVENTS.CHAPTER_PUBLISHED>
  ): Promise<void> {
    this.logInfo(
      `[Gamification] Handling CHAPTER_PUBLISHED for author: ${payload.authorId}`,
      payload
    );
    // TODO: Award author publishing XP & check achievement badges
  }

  private async handleStoryCreated(
    payload: EventPayload<typeof APP_EVENTS.STORY_CREATED>
  ): Promise<void> {
    this.logInfo(`[Gamification] Handling STORY_CREATED for author: ${payload.authorId}`, payload);
    // TODO: Award story creator XP
  }

  private async handleCommentAdded(
    payload: EventPayload<typeof APP_EVENTS.COMMENT_ADDED>
  ): Promise<void> {
    this.logInfo(`[Gamification] Handling COMMENT_ADDED for user: ${payload.userId}`, payload);
    // TODO: Award community engagement XP
  }

  private async handleVoteCast(payload: EventPayload<typeof APP_EVENTS.VOTE_CAST>): Promise<void> {
    this.logInfo(`[Gamification] Handling VOTE_CAST by user: ${payload.userId}`, payload);
    // TODO: Process voter XP & recipient author XP
  }

  private async handlePRMerged(payload: EventPayload<typeof APP_EVENTS.PR_MERGED>): Promise<void> {
    this.logInfo(`[Gamification] Handling PR_MERGED for author: ${payload.authorId}`, payload);
    // TODO: Award contributor XP for accepted pull request
  }
}
