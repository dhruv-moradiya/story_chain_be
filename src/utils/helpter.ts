import mongoose from 'mongoose';
import { slugify } from 'transliteration';

export const validateObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export interface CreateSlugOptions {
  addSuffix?: boolean;
}

export function createSlug(input: string, options: CreateSlugOptions = {}): string {
  const { addSuffix = true } = options;

  const base = slugify(input, {
    lowercase: true,
    separator: '-',
  });

  if (addSuffix) {
    const suffix = crypto.randomUUID().slice(0, 6);
    return `${base}-${suffix}`;
  }

  return base;
}

export function formatPaginatedResponse<T>(
  docs: T[],
  totalDocs: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(totalDocs / limit);
  const pagingCounter = (page - 1) * limit + 1;
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
  const prevPage = hasPrevPage ? page - 1 : null;
  const nextPage = hasNextPage ? page + 1 : null;

  return {
    docs,
    totalDocs,
    limit,
    totalPages,
    page,
    pagingCounter,
    hasPrevPage,
    hasNextPage,
    prevPage,
    nextPage,
  };
}
