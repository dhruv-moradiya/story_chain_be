export const TOKENS = {
  // ═══════════════════════════════════════════
  // CONFIG SERVICES
  // ═══════════════════════════════════════════
  ConfigService: Symbol.for('ConfigService'),
  DatabaseService: Symbol.for('DatabaseService'),
  RedisService: Symbol.for('RedisService'),

  // ═══════════════════════════════════════════
  // TRANSFORMERS
  // ═══════════════════════════════════════════
  WebhookTransformer: Symbol.for('WebhookTransformer'),

  // ═══════════════════════════════════════════
  // SHARED SERVICES
  // ═══════════════════════════════════════════
  CacheService: Symbol.for('CacheService'),
  EmailService: Symbol.for('EmailService'),
  QueueService: Symbol.for('QueueService'),
  InviteTokenService: Symbol.for('InviteTokenService'),
  NotificationFactoryService: Symbol.for('NotificationFactoryService'),
  StoryGuardService: Symbol.for('StoryGuardService'),

  // ═══════════════════════════════════════════
  // REPOSITORIES
  // ═══════════════════════════════════════════
  UserRepository: Symbol.for('UserRepository'),
  StoryRepository: Symbol.for('StoryRepository'),
  ChapterRepository: Symbol.for('ChapterRepository'),
  ChapterVersionRepository: Symbol.for('ChapterVersionRepository'),
  ChapterAutoSaveRepository: Symbol.for('ChapterAutoSaveRepository'),
  PullRequestRepository: Symbol.for('PullRequestRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  PlatformRoleRepository: Symbol.for('PlatformRoleRepository'),
  StoryCollaboratorRepository: Symbol.for('StoryCollaboratorRepository'),

  // ═══════════════════════════════════════════
  // FEATURE SERVICES
  // ═══════════════════════════════════════════
  UserService: Symbol.for('UserService'),
  StoryCrudService: Symbol.for('StoryCrudService'),
  StoryQueryService: Symbol.for('StoryQueryService'),
  StoryMediaService: Symbol.for('StoryMediaService'),
  StoryPublishingService: Symbol.for('StoryPublishingService'),
  ChapterService: Symbol.for('ChapterService'),
  ChapterVersionService: Symbol.for('ChapterVersionService'),
  AutoSaveQueryService: Symbol.for('AutoSaveQueryService'),
  AutoSaveLifecycleService: Symbol.for('AutoSaveLifecycleService'),
  AutoSaveContentService: Symbol.for('AutoSaveContentService'),
  AutoSaveConversionService: Symbol.for('AutoSaveConversionService'),
  CollaboratorQueryService: Symbol.for('CollaboratorQueryService'),
  CollaboratorInvitationService: Symbol.for('CollaboratorInvitationService'),
  CollaboratorLifecycleService: Symbol.for('CollaboratorLifecycleService'),
  CommentService: Symbol.for('CommentService'),
  VoteService: Symbol.for('VoteService'),
  BookmarkService: Symbol.for('BookmarkService'),
  FollowService: Symbol.for('FollowService'),
  NotificationService: Symbol.for('NotificationService'),
  PullRequestService: Symbol.for('PullRequestService'),
  PrCommentService: Symbol.for('PrCommentService'),
  PrReviewService: Symbol.for('PrReviewService'),
  PrVoteService: Symbol.for('PrVoteService'),
  ReportService: Symbol.for('ReportService'),
  ReadingHistoryService: Symbol.for('ReadingHistoryService'),
  SessionService: Symbol.for('SessionService'),
  PlatformRoleService: Symbol.for('PlatformRoleService'),

  // ═══════════════════════════════════════════
  // CONTROLLERS
  // ═══════════════════════════════════════════
  UserController: Symbol.for('UserController'),
  UserWebhookController: Symbol.for('UserWebhookController'),
  StoryController: Symbol.for('StoryController'),
  ChapterController: Symbol.for('ChapterController'),
  ChapterVersionController: Symbol.for('ChapterVersionController'),
  ChapterAutoSaveController: Symbol.for('ChapterAutoSaveController'),
  CommentController: Symbol.for('CommentController'),
  VoteController: Symbol.for('VoteController'),
  BookmarkController: Symbol.for('BookmarkController'),
  FollowController: Symbol.for('FollowController'),
  NotificationController: Symbol.for('NotificationController'),
  PullRequestController: Symbol.for('PullRequestController'),
  PrCommentController: Symbol.for('PrCommentController'),
  PrReviewController: Symbol.for('PrReviewController'),
  PrVoteController: Symbol.for('PrVoteController'),
  ReportController: Symbol.for('ReportController'),
  ReadingHistoryController: Symbol.for('ReadingHistoryController'),
  SessionController: Symbol.for('SessionController'),
  StoryCollaboratorController: Symbol.for('StoryCollaboratorController'),

  // ═══════════════════════════════════════════
  // MIDDLEWARE FACTORIES
  // ═══════════════════════════════════════════
  AuthMiddlewareFactory: Symbol.for('AuthMiddlewareFactory'),
  StoryRoleMiddlewareFactory: Symbol.for('StoryRoleMiddlewareFactory'),
  PlatformRoleMiddlewareFactory: Symbol.for('PlatformRoleMiddlewareFactory'),
} as const;

export type TokenKeys = keyof typeof TOKENS;
export type TokenValues = (typeof TOKENS)[TokenKeys];
