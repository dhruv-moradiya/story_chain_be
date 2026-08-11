import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from '@config/env';

export const registerSwagger = async (app: FastifyInstance): Promise<void> => {
  // Register OpenAPI schema generator
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'StoryChain API',
        description: 'API documentation for StoryChain - A collaborative storytelling platform',
        version: '1.0.0',
      },
      servers: [
        {
          url:
            env.NODE_ENV === 'production'
              ? env.RAILWAY_URL || 'https://api.storychain.com'
              : `http://localhost:${env.PORT || 3000}`,
          description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
        },
      ],
      tags: [
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Stories', description: 'Story management endpoints' },
        { name: 'Chapters', description: 'Chapter management endpoints' },
        { name: 'Chapter Auto-Save', description: 'Auto-save functionality for chapters' },
        { name: 'Story Collaborators', description: 'Collaborator management endpoints' },
        { name: 'Comments', description: 'Comment management endpoints' },
        { name: 'Votes', description: 'Voting endpoints' },
        { name: 'Bookmarks', description: 'Bookmark management endpoints' },
        { name: 'Follows', description: 'Follow/unfollow endpoints' },
        { name: 'Notifications', description: 'Notification management endpoints' },
        { name: 'Pull Requests', description: 'Pull request management endpoints' },
        { name: 'PR Comments', description: 'Pull request comment endpoints' },
        { name: 'PR Votes', description: 'Pull request voting endpoints' },
        { name: 'PR Reviews', description: 'Pull request review endpoints' },
        { name: 'Reports', description: 'Content reporting endpoints' },
        { name: 'Reading History', description: 'Reading history tracking endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your Clerk JWT token',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  // Register Swagger UI
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
};
