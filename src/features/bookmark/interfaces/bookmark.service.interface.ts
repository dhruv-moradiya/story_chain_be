import { CreateBookmarkInput } from '../schema/bookmark.schema';

export interface IBookmarkService {
  toggleBookmark(userId: string, input: CreateBookmarkInput): Promise<{ isBookmarked: boolean }>;
}
