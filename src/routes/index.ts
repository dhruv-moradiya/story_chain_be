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
import { pullRequestRoutes } from '@features/pullRequest/routes/pullRequest.routes';

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
  fastify.register(pullRequestRoutes, { prefix: ApiRoute.PULL_REQUESTS });
}
