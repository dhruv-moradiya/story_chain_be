import 'reflect-metadata';

import { container, Lifecycle } from 'tsyringe';
import { TOKENS } from './tokens';

// ═══════════════════════════════════════════
// CONFIG SERVICES
// ═══════════════════════════════════════════
import { ConfigService } from '@config/services/config.service';
import { DatabaseService } from '@config/services/database.service';
import { RedisService } from '@config/services/redis.service';

// ═══════════════════════════════════════════
// CACHING & QUEUE SERVICES
// ═══════════════════════════════════════════
import { CacheService } from '@infrastructure/cache/cache.service';
import { QueueService } from '@infrastructure/queue/queue.service';
import { WorkerService } from '@infrastructure/queue/worker.service';
import { SchedulerService } from '@infrastructure/scheduler/scheduler.service';
import { NotificationWorker } from '@features/notification/workers/notification.worker';
import { StoryCacheService } from '@infrastructure/cache/story-cache.service';
import { CommentVoteCacheService } from '@infrastructure/cache/commentVoteCacheService';
import { ChapterCommentVoteQueue } from '@infrastructure/domains/chapterCommentVote.queue';

// ═══════════════════════════════════════════
// TRANSFORMERS
// ═══════════════════════════════════════════
import { WebhookTransformer } from '@features/user/builders/webhook.transformer';

// ═══════════════════════════════════════════
// REPOSITORIES
// ═══════════════════════════════════════════
import { UserRepository } from '@features/user/repositories/user.repository';
import { PlatformRoleRepository } from '@features/platformRole/repositories/platformRole.repository';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { StoryCollaboratorRepository } from '@features/storyCollaborator/repositories/storyCollaborator.repository';
import { NotificationRepository } from '@features/notification/repositories/notification.repository';
import { ChapterAutoSaveRepository } from '@features/chapterAutoSave/repositories/chapterAutoSave.repository';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { ReadingHistoryRepository } from '@/features/readingHistory/repositories/readingHistory.repository';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';
import { PullRequestRepository } from '@features/pullRequest/repositories/pullRequest.repository';
import { PRTimelineRepository } from '@features/prTimeline/repositories/prTimeline.repository';
import { PRReviewRepository } from '@features/prReview/repositories/prReview.repository';
import { PRCommentRepository } from '@features/prComment/repositories/prComment.repository';

// ═══════════════════════════════════════════
// FEATURE SERVICES
// ═══════════════════════════════════════════
import { PlatformRoleService } from '@features/platformRole/services/platformRole.service';
import { UserService } from '@features/user/services/user.service';
import { StoryCrudService } from '@/features/story/services/story-crud.service';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { StoryMediaService } from '@/features/story/services/story-media.service';
import { StoryPublishingService } from '@/features/story/services/story-publishing.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { CollaboratorInvitationService } from '@features/storyCollaborator/services/collaborator-invitation.service';
import { CollaboratorLifecycleService } from '@features/storyCollaborator/services/collaborator-lifecycle.service';
import { NotificationService } from '@features/notification/services/notification.service';
import { AutoSaveQueryService } from '@features/chapterAutoSave/services/autosave-query.service';
import { AutoSaveLifecycleService } from '@features/chapterAutoSave/services/autosave-lifecycle.service';
import { AutoSaveContentService } from '@features/chapterAutoSave/services/autosave-content.service';
import { AutoSaveConversionService } from '@features/chapterAutoSave/services/autosave-conversion.service';

import { ChapterCrudService } from '@features/chapter/services/chapter-crud.service';
import { ChapterCreationService } from '@features/chapter/services/chapter-creation.service';
import { ChapterQueryService } from '@features/chapter/services/chapter-query.service';

import { ReadingHistoryService } from '@/features/readingHistory/services/readingHistory.service';
import { BookmarkService } from '@/features/bookmark/services/bookmark.service';

import { CommentVoteService } from '@/features/commentVote/services/commentVote.service';
import { PullRequestCommandService } from '@features/pullRequest/services/pullRequest-command.service';
import { PRUpdateService } from '@features/pullRequest/services/pr-update.service';
import { PRMergeService } from '@features/pullRequest/services/pr-merge.service';
import { PRReviewService } from '@features/prReview/services/prReview.service';
import { PRCommentService } from '@features/prComment/services/prComment.service';
import { PRQueryService } from '@features/pullRequest/services/pr-query.service';

// ═══════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════
import { UserController } from '@features/user/controllers/user.controller';
import { UserWebhookController } from '@features/user/controllers/user.webhook.controller';
import { StoryController } from '@features/story/controllers/story.controller';
import { ChapterController } from '@features/chapter/controllers/chapter.controller';
import { ChapterAutoSaveController } from '@features/chapterAutoSave/controllers/chapterAutoSave.controller';
import { NotificationController } from '@features/notification/controllers/notification.controller';
import { StoryCollaboratorController } from '@features/storyCollaborator/controllers/storyCollaborator.controller';
import { ReadingHistoryController } from '@/features/readingHistory/controllers/readingHistory.controller';
import { BookmarkController } from '@/features/bookmark/controllers/bookmark.controller';
import { CommentController } from '@/features/comment/controllers/comment.controller';
import { CommentService } from '@/features/comment/services/comment.service';
import { CommentRepository } from '@/features/comment/repositories/comment.repository';
import { PullRequestController } from '@features/pullRequest/controllers/pullRequest.controller';
import { PRManagementController } from '@features/pullRequest/controllers/prManagement.controller';
import { PRQueryController } from '@features/pullRequest/controllers/prQuery.controller';

// ═══════════════════════════════════════════
// MIDDLEWARE FACTORIES
// ═══════════════════════════════════════════
import { AuthMiddlewareFactory } from '@middleware/factories/auth.middleware.factory';
import { StoryRoleMiddlewareFactory } from '@middleware/factories/storyRole.middleware.factory';
import { PlatformRoleMiddlewareFactory } from '@middleware/factories/platformRole.middleware.factory';

/**
 * Register all services with the DI container.
 * Services are registered in dependency order.
 */
export function registerServices(): void {
  // ═══════════════════════════════════════════
  // CONFIG SERVICES (register first - no dependencies)
  // ═══════════════════════════════════════════
  container.register(
    TOKENS.ConfigService,
    { useClass: ConfigService },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.DatabaseService,
    { useClass: DatabaseService },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.RedisService,
    { useClass: RedisService },
    { lifecycle: Lifecycle.Singleton }
  );

  // ═══════════════════════════════════════════
  // CACHING & QUEUE SERVICES
  // ═══════════════════════════════════════════
  container.register(
    TOKENS.CacheService,
    { useClass: CacheService },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.QueueService,
    { useClass: QueueService },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.WorkerService,
    { useClass: WorkerService },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.SchedulerService,
    { useClass: SchedulerService },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.NotificationWorker,
    { useClass: NotificationWorker },
    { lifecycle: Lifecycle.Singleton }
  );
  container.register(
    TOKENS.ChapterCommentVoteQueue,
    { useClass: ChapterCommentVoteQueue },
    { lifecycle: Lifecycle.Singleton }
  );

  container.register(TOKENS.StoryCacheService, { useClass: StoryCacheService });
  container.register(TOKENS.CommentVoteCacheService, { useClass: CommentVoteCacheService });

  // ═══════════════════════════════════════════
  // TRANSFORMERS
  // ═══════════════════════════════════════════
  container.register(TOKENS.WebhookTransformer, { useClass: WebhookTransformer });

  // ═══════════════════════════════════════════
  // REPOSITORIES
  // ═══════════════════════════════════════════
  container.register(TOKENS.UserRepository, { useClass: UserRepository });
  container.register(TOKENS.PlatformRoleRepository, { useClass: PlatformRoleRepository });
  container.register(TOKENS.StoryRepository, { useClass: StoryRepository });
  container.register(TOKENS.StoryCollaboratorRepository, {
    useClass: StoryCollaboratorRepository,
  });
  container.register(TOKENS.NotificationRepository, { useClass: NotificationRepository });
  container.register(TOKENS.ChapterAutoSaveRepository, { useClass: ChapterAutoSaveRepository });
  container.register(TOKENS.ChapterRepository, { useClass: ChapterRepository });
  container.register(TOKENS.ReadingHistoryRepository, { useClass: ReadingHistoryRepository });
  container.register(TOKENS.CommentRepository, { useClass: CommentRepository });
  container.register(TOKENS.CommentVoteRepository, { useClass: CommentVoteRepository });
  container.register(TOKENS.PullRequestRepository, { useClass: PullRequestRepository });
  container.register(TOKENS.PRTimelineRepository, { useClass: PRTimelineRepository });
  container.register(TOKENS.PRReviewRepository, { useClass: PRReviewRepository });
  container.register(TOKENS.PRCommentRepository, { useClass: PRCommentRepository });

  // ═══════════════════════════════════════════
  // FEATURE SERVICES
  // ═══════════════════════════════════════════
  container.register(TOKENS.PlatformRoleService, { useClass: PlatformRoleService });
  container.register(TOKENS.UserService, { useClass: UserService });
  container.register(TOKENS.NotificationService, { useClass: NotificationService });
  container.register(TOKENS.CollaboratorQueryService, { useClass: CollaboratorQueryService });
  container.register(TOKENS.CollaboratorInvitationService, {
    useClass: CollaboratorInvitationService,
  });
  container.register(TOKENS.CollaboratorLifecycleService, {
    useClass: CollaboratorLifecycleService,
  });

  container.register(TOKENS.ChapterCrudService, { useClass: ChapterCrudService });
  container.register(TOKENS.ChapterCreationService, { useClass: ChapterCreationService });
  container.register(TOKENS.ChapterQueryService, { useClass: ChapterQueryService });
  container.register(TOKENS.StoryCrudService, { useClass: StoryCrudService });
  container.register(TOKENS.StoryQueryService, { useClass: StoryQueryService });
  container.register(TOKENS.StoryMediaService, { useClass: StoryMediaService });
  container.register(TOKENS.StoryPublishingService, { useClass: StoryPublishingService });
  container.register(TOKENS.AutoSaveQueryService, { useClass: AutoSaveQueryService });
  container.register(TOKENS.AutoSaveLifecycleService, { useClass: AutoSaveLifecycleService });
  container.register(TOKENS.AutoSaveContentService, { useClass: AutoSaveContentService });
  container.register(TOKENS.AutoSaveConversionService, { useClass: AutoSaveConversionService });
  container.register(TOKENS.ReadingHistoryService, { useClass: ReadingHistoryService });
  container.register(TOKENS.BookmarkService, { useClass: BookmarkService });
  container.register(TOKENS.CommentService, { useClass: CommentService });
  container.register(TOKENS.CommentVoteService, { useClass: CommentVoteService });
  container.register(TOKENS.PullRequestCommandService, { useClass: PullRequestCommandService });
  container.register(TOKENS.PRUpdateService, { useClass: PRUpdateService });
  container.register(TOKENS.PRMergeService, { useClass: PRMergeService });
  container.register(TOKENS.PRReviewService, { useClass: PRReviewService });
  container.register(TOKENS.PRCommentService, { useClass: PRCommentService });
  container.register(TOKENS.PRQueryService, { useClass: PRQueryService });

  // ═══════════════════════════════════════════
  // CONTROLLERS
  // ═══════════════════════════════════════════
  container.register(TOKENS.UserController, { useClass: UserController });
  container.register(TOKENS.UserWebhookController, { useClass: UserWebhookController });
  container.register(TOKENS.StoryController, { useClass: StoryController });
  container.register(TOKENS.ChapterController, { useClass: ChapterController });
  container.register(TOKENS.ChapterAutoSaveController, { useClass: ChapterAutoSaveController });
  container.register(TOKENS.NotificationController, { useClass: NotificationController });
  container.register(TOKENS.StoryCollaboratorController, {
    useClass: StoryCollaboratorController,
  });
  container.register(TOKENS.ReadingHistoryController, { useClass: ReadingHistoryController });
  container.register(TOKENS.BookmarkController, { useClass: BookmarkController });
  container.register(TOKENS.CommentController, { useClass: CommentController });
  container.register(TOKENS.PullRequestController, { useClass: PullRequestController });
  container.register(TOKENS.PRManagementController, { useClass: PRManagementController });
  container.register(TOKENS.PRQueryController, { useClass: PRQueryController });

  // ═══════════════════════════════════════════
  // MIDDLEWARE FACTORIES
  // ═══════════════════════════════════════════
  container.register(TOKENS.AuthMiddlewareFactory, { useClass: AuthMiddlewareFactory });
  container.register(TOKENS.StoryRoleMiddlewareFactory, { useClass: StoryRoleMiddlewareFactory });
  container.register(TOKENS.PlatformRoleMiddlewareFactory, {
    useClass: PlatformRoleMiddlewareFactory,
  });
}

export { container };
