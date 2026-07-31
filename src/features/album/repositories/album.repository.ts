import { BaseRepository } from '@/utils/baseClass';
import { Album } from '@/models/album.model';
import { IAlbum, IAlbumDoc } from '../types/album.types';
import { singleton } from 'tsyringe';
import { FilterQuery } from 'mongoose';

@singleton()
export class AlbumRepository extends BaseRepository<IAlbum, IAlbumDoc> {
  constructor() {
    super(Album);
  }

  async findByStorySlug(storySlug: string, query: { visibility?: string } = {}): Promise<IAlbum[]> {
    const filter: FilterQuery<IAlbumDoc> = { storySlug };

    if (query.visibility) {
      filter.visibility = query.visibility;
    }

    return this.findMany({
      filter,
      options: { sort: { sortOrder: 1, updatedAt: -1 } },
    });
  }

  async createSingle(album: Partial<IAlbumDoc>): Promise<IAlbum> {
    const doc = await this.model.create(album);
    return doc.toObject() as IAlbum;
  }

  async setImageCount(albumId: string, imageCount: number): Promise<IAlbum | null> {
    return (await this.findOneAndUpdate({
      filter: { _id: albumId },
      update: { imageCount },
      options: { new: true },
    })) as IAlbum | null;
  }
}
