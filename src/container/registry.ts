import 'reflect-metadata';

import { container } from 'tsyringe';
import { TOKENS } from './tokens';

// ═══════════════════════════════════════════
// CONFIG SERVICES
// ═══════════════════════════════════════════
import { ConfigService } from '@config/services/config.service';
import { DatabaseService } from '@config/services/database.service';
import { RedisService } from '@config/services/redis.service';

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
import { ChapterQueryService } from '@features/chapter/services/chapter-query.service';

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
  container.register(TOKENS.ConfigService, { useClass: ConfigService });
  container.register(TOKENS.DatabaseService, { useClass: DatabaseService });
  container.register(TOKENS.RedisService, { useClass: RedisService });

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
  container.register(TOKENS.StoryCollaboratorRepository, { useClass: StoryCollaboratorRepository });
  container.register(TOKENS.NotificationRepository, { useClass: NotificationRepository });
  container.register(TOKENS.ChapterAutoSaveRepository, { useClass: ChapterAutoSaveRepository });
  container.register(TOKENS.ChapterRepository, { useClass: ChapterRepository });

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
  container.register(TOKENS.ChapterQueryService, { useClass: ChapterQueryService });
  container.register(TOKENS.StoryCrudService, { useClass: StoryCrudService });
  container.register(TOKENS.StoryQueryService, { useClass: StoryQueryService });
  container.register(TOKENS.StoryMediaService, { useClass: StoryMediaService });
  container.register(TOKENS.StoryPublishingService, { useClass: StoryPublishingService });
  container.register(TOKENS.AutoSaveQueryService, { useClass: AutoSaveQueryService });
  container.register(TOKENS.AutoSaveLifecycleService, { useClass: AutoSaveLifecycleService });
  container.register(TOKENS.AutoSaveContentService, { useClass: AutoSaveContentService });
  container.register(TOKENS.AutoSaveConversionService, { useClass: AutoSaveConversionService });

  // ═══════════════════════════════════════════
  // CONTROLLERS
  // ═══════════════════════════════════════════
  container.register(TOKENS.UserController, { useClass: UserController });
  container.register(TOKENS.UserWebhookController, { useClass: UserWebhookController });
  container.register(TOKENS.StoryController, { useClass: StoryController });
  container.register(TOKENS.ChapterController, { useClass: ChapterController });
  container.register(TOKENS.ChapterAutoSaveController, { useClass: ChapterAutoSaveController });
  container.register(TOKENS.NotificationController, { useClass: NotificationController });
  container.register(TOKENS.StoryCollaboratorController, { useClass: StoryCollaboratorController });

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
