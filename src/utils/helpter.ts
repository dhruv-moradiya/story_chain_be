import mongoose from 'mongoose';

export const validateObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export interface CreateSlugOptions {
  addSuffix?: boolean;
}

export function createSlug(input: string, options: CreateSlugOptions = {}): string {
  const { addSuffix = true } = options;

  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (addSuffix) {
    const suffix = crypto.randomUUID().slice(0, 6);
    return `${base}-${suffix}`;
  }

  return base;
}
