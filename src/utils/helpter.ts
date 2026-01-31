import mongoose from 'mongoose';

export const validateObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export function createSlug(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}
