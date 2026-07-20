import { BaseRepository } from '@/utils/baseClass';
import { GalleryImage } from '@/models/galleryImage.model';
import { IGalleryImage, IGalleryImageDoc } from '../types/galleryImage.types';
import { singleton } from 'tsyringe';
import { FilterQuery } from 'mongoose';

@singleton()
export class GalleryImageRepository extends BaseRepository<IGalleryImage, IGalleryImageDoc> {
  constructor() {
    super(GalleryImage);
  }

  async findByStorySlug(
    storySlug: string,
    query: { category?: string; isMoodboard?: boolean; chapterSlug?: string } = {}
  ): Promise<IGalleryImage[]> {
    const filter: FilterQuery<IGalleryImageDoc> = { storySlug };

    if (query.category) filter.category = query.category;
    if (query.isMoodboard !== undefined) filter.isMoodboard = query.isMoodboard;
    if (query.chapterSlug) filter.chapterSlug = query.chapterSlug;

    return this.findMany({
      filter,
      options: { sort: { sortOrder: 1, createdAt: -1 } },
    });
  }

  async bulkCreate(images: Partial<IGalleryImageDoc>[]): Promise<IGalleryImage[]> {
    const inserted = await this.model.insertMany(images, { lean: true });
    return inserted as IGalleryImage[];
  }
}
