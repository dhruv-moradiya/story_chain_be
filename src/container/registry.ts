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
import { StoryService } from '@features/story/services/story.service';
import { StoryCollaboratorService } from '@features/storyCollaborator/services/storyCollaborator.service';
import { NotificationService } from '@features/notification/services/notification.service';
import { ChapterAutoSaveService } from '@features/chapterAutoSave/services/chapterAutoSave.service';
import { ChapterService } from '@features/chapter/services/chapter.service';

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
  container.register(TOKENS.StoryCollaboratorService, { useClass: StoryCollaboratorService });
  container.register(TOKENS.ChapterService, { useClass: ChapterService });
  container.register(TOKENS.StoryService, { useClass: StoryService });
  container.register(TOKENS.ChapterAutoSaveService, { useClass: ChapterAutoSaveService });

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
