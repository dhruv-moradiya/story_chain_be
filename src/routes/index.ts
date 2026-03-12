import { FastifyInstance } from 'fastify';
import { userRoutes } from '@features/user/routes/user.routes';
import { storyRoutes } from '@features/story/routes/story.routes';
import { chapterRoutes } from '@features/chapter/routes/chapter.routes';
import { notificationRoutes } from '@features/notification/routes/notification.router';
import { chapterAutoSaveRoutes } from '@features/chapterAutoSave/routes/chapterAutoSave.routes';
import { readingHistoryRoutes } from '@/features/readingHistory/routes/readingHistory.router';
import { bookmarkRoutes } from '@/features/bookmark/routes/bookmark.routes';
import { commentRoutes } from '@/features/comment/routes/comment.router';
import { pullRequestRoutes } from '@/features/pullRequest/routes/pullRequest.routes';
import { prCommentroutes } from '@/features/prComment/routes/prComment.router';
import { prReviewRoutes } from '@/features/prReview/routes/prReview.router';
import { prVoteRoutes } from '@/features/prVote/routes/prVote.router';

enum ApiRoute {
  USERS = '/api/users',
  STORIES = '/api/stories',
  CHAPTERS = '/api/chapters',
  NOTIFICATIONS = '/api/notifications',
  CHAPTER_AUTOSAVE = '/api/auto-save',
  READING_HISTORY = '/api/reading-history',
  BOOKMARKS = '/api/bookmarks',
  COMMENTS = '/api/comments',
  PULL_REQUESTS = '/api/pull-requests',
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
  fastify.register(pullRequestRoutes, { prefix: ApiRoute.PULL_REQUESTS });
  fastify.register(prCommentroutes, { prefix: ApiRoute.PULL_REQUESTS });
  fastify.register(prReviewRoutes, { prefix: ApiRoute.PULL_REQUESTS });
  fastify.register(prVoteRoutes, { prefix: ApiRoute.PULL_REQUESTS });
}
