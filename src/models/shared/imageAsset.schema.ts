import { Schema } from 'mongoose';
import { IImageAsset } from '@/types';

/**
 * Reusable sub-schema for Cloudinary image assets.
 * Stores the CDN URL and the public_id needed for deletion & on-the-fly transforms.
 *
 * Use { _id: false } so embedding this doesn't add a redundant ObjectId field.
 */
export const ImageAssetSchema = new Schema<IImageAsset>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);
