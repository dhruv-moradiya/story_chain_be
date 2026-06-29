import { FastifyInstance } from 'fastify';
import { userRoutes } from '@features/user/routes/user.routes';
import { storyRoutes } from '@features/story/routes/story.routes';
import { chapterRoutes } from '@features/chapter/routes/chapter.routes';
import { notificationRoutes } from '@features/notification/routes/notification.router';
import { chapterAutoSaveRoutes } from '@features/chapterAutoSave/routes/chapterAutoSave.routes';
import { readingHistoryRoutes } from '@/features/readingHistory/routes/readingHistory.router';
import { bookmarkRoutes } from '@/features/bookmark/routes/bookmark.routes';
import { commentRoutes } from '@/features/comment/routes/comment.router';
import { commentVoteRoutes } from '@/features/commentVote/routes/commentVote.route';
import { prQueryRoutes } from '@/features/pullRequest/routes/prQuery.routes';
import { pullRequestRoutes } from '@features/pullRequest/routes/pullRequest.routes';
import { prManagementRoutes } from '@features/pullRequest/routes/prManagement.routes';
import { analyticsRoutes } from '@/features/readingHistory/routes/analytics.router';
import { coinBundleRoutes } from '@/features/coinBundle/routes/coinBundle.routes';
import { coinOrderRoutes } from '@/features/coinOrder/routes/coinOrder.route';
import { walletRoutes } from '@/features/wallet/routes/waller.route';

enum ApiRoute {
  USERS = '/api/users',
  STORIES = '/api/stories',
  CHAPTERS = '/api/chapters',
  NOTIFICATIONS = '/api/notifications',
  CHAPTER_AUTOSAVE = '/api/auto-save',
  READING_HISTORY = '/api/reading-history',
  BOOKMARKS = '/api/bookmarks',
  COMMENTS = '/api/comments',
  COMMENT_VOTES = '/api/comment-votes',
  PULL_REQUESTS = '/api/pull-requests',
  ANALYTICS = '/api/analytics',
  COIN_BUNDLES = '/api/coin-bundles',
  COIN_ORDER = '/api/coin-orders',
  WALLET = '/api/wallet',
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: ApiRoute.USERS });
  fastify.register(storyRoutes, { prefix: ApiRoute.STORIES });
  fastify.register(chapterRoutes, { prefix: ApiRoute.CHAPTERS });
  fastify.register(notificationRoutes, { prefix: ApiRoute.NOTIFICATIONS });
  fastify.register(chapterAutoSaveRoutes, { prefix: ApiRoute.CHAPTER_AUTOSAVE });
  fastify.register(readingHistoryRoutes, { prefix: ApiRoute.READING_HISTORY });
  fastify.register(bookmarkRoutes, { prefix: ApiRoute.BOOKMARKS });
  fastify.register(commentRoutes, { prefix: ApiRoute.COMMENTS });
  fastify.register(commentVoteRoutes, { prefix: ApiRoute.COMMENT_VOTES });
  fastify.register(prQueryRoutes, { prefix: ApiRoute.PULL_REQUESTS });
  fastify.register(pullRequestRoutes, { prefix: ApiRoute.PULL_REQUESTS });
  fastify.register(prManagementRoutes, { prefix: ApiRoute.PULL_REQUESTS });
  fastify.register(analyticsRoutes, { prefix: ApiRoute.ANALYTICS });
  fastify.register(coinBundleRoutes, { prefix: ApiRoute.COIN_BUNDLES });
  fastify.register(coinOrderRoutes, { prefix: ApiRoute.COIN_ORDER });
  fastify.register(walletRoutes, { prefix: ApiRoute.WALLET });
}
