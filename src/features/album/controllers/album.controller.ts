import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { ApiResponse } from '@/utils/apiResponse';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { AlbumService } from '../services/album.service';
import {
  TAlbumCreateSchema,
  TAlbumAddImagesSchema,
  TAlbumUpdateSchema,
  TAlbumQuerySchema,
} from '@/schema/request/album.schema';
import { TStorySlugSchema } from '@/schema/request/story.schema';

@singleton()
export class AlbumController extends BaseModule {
  constructor(
    @inject(TOKENS.AlbumService)
    private readonly albumService: AlbumService
  ) {
    super();
  }

  createAlbum = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TAlbumCreateSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const album = await this.albumService.createAlbum(slug, userId, request.body);

      this.logInfo(`Created album "${album.title}" for story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(album, 'Album created successfully'));
    }
  );

  addImagesToAlbum = catchAsync(
    async (
      request: FastifyRequest<{ Params: { albumId: string }; Body: TAlbumAddImagesSchema }>,
      reply: FastifyReply
    ) => {
      const { albumId } = request.params;
      const { clerkId: userId } = request.user;

      const updatedAlbum = await this.albumService.addImagesToAlbum(albumId, userId, request.body);

      this.logInfo(`Added ${request.body.imageIds.length} images to album ${albumId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.ok(updatedAlbum, 'Images added to album successfully'));
    }
  );

  getAlbumsByStory = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Querystring: TAlbumQuerySchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const albums = await this.albumService.getAlbumsByStory(slug, userId, request.query);

      this.logInfo(`Fetched ${albums.length} albums for story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(albums, 'List of albums retrieved successfully'));
    }
  );

  getAlbumById = catchAsync(
    async (request: FastifyRequest<{ Params: { albumId: string } }>, reply: FastifyReply) => {
      const { albumId } = request.params;
      const { clerkId: userId } = request.user;

      const albumDetails = await this.albumService.getAlbumById(albumId, userId);

      this.logInfo(`Fetched details for album ${albumId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(albumDetails, 'Album details retrieved successfully'));
    }
  );

  updateAlbum = catchAsync(
    async (
      request: FastifyRequest<{ Params: { albumId: string }; Body: TAlbumUpdateSchema }>,
      reply: FastifyReply
    ) => {
      const { albumId } = request.params;
      const { clerkId: userId } = request.user;

      const updatedAlbum = await this.albumService.updateAlbum(albumId, userId, request.body);

      this.logInfo(`Updated album ${albumId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(updatedAlbum, 'Album updated successfully'));
    }
  );

  deleteAlbum = catchAsync(
    async (request: FastifyRequest<{ Params: { albumId: string } }>, reply: FastifyReply) => {
      const { albumId } = request.params;
      const { clerkId: userId } = request.user;

      await this.albumService.deleteAlbum(albumId, userId);

      this.logInfo(`Deleted album ${albumId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.deleted('Album deleted successfully'));
    }
  );
}
