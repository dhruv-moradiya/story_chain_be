import { v2 as cloudinary } from 'cloudinary';
import { env } from '@config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Cloudinary Transformation Presets & Quality Modes
 */
const CLOUDINARY_TRANSFORMATIONS = {
  DEFAULT: 'q_auto,f_auto',
  AUTO_GOOD: 'q_auto:good,f_auto',
  AUTO_ECO: 'q_auto:eco,f_auto',
  AUTO_LOW: 'q_auto:low,f_auto',
} as const;

type TCloudinaryQualityMode = 'auto' | 'auto:good' | 'auto:eco' | 'auto:low';

/**
 * Image transformation applied as default eager transformation on upload.
 */
const THUMBNAIL_TRANSFORMATION = CLOUDINARY_TRANSFORMATIONS.DEFAULT;

/**
 * Returns signed query-string params for a direct client-side upload to Cloudinary.
 * Includes an `eager` transformation so Cloudinary also stores a thumbnail/derived
 * variant the moment the upload completes.
 *
 * @param folderPath - Cloudinary folder to upload into.
 * @param quality - Optional quality mode (e.g. 'auto:eco', 'auto:good'). Uses THUMBNAIL_TRANSFORMATION if not provided.
 */
const getSignatureURL = (folderPath: string, quality?: TCloudinaryQualityMode) => {
  if (!folderPath) {
    throw new Error('folderPath is required to generate a Cloudinary signature URL');
  }

  const eagerTransformation = quality ? `q_${quality},f_auto` : THUMBNAIL_TRANSFORMATION;
  const timestamp = Math.floor(Date.now() / 1000);

  // `eager` must be included in the signature so Cloudinary validates it.
  const paramsToSign = {
    eager: eagerTransformation,
    folder: folderPath,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return (
    `?timestamp=${timestamp}` +
    `&signature=${signature}` +
    `&api_key=${env.CLOUDINARY_API_KEY}` +
    `&folder=${folderPath}` +
    `&eager=${encodeURIComponent(eagerTransformation)}`
  );
};

// ---------------------------------------------------------------------------
// Convenience wrappers — keep call-sites readable without exposing folder
// path logic to every controller.
// ---------------------------------------------------------------------------

/** Signature URL scoped to a specific story's folder. */
const getStoryUploadSignature = (storySlug: string, quality?: TCloudinaryQualityMode) => {
  if (!storySlug) throw new Error('storySlug is required');
  return getSignatureURL(`stories/${storySlug}`, quality);
};

/** Signature URL scoped to a specific bundle's folder. */
const getBundleUploadSignature = (quality?: TCloudinaryQualityMode) => {
  return getSignatureURL(`bundles`, quality);
};

/** Signature URL scoped to a specific character's folder. */
const getCharacterUploadSignature = (storySlug: string, quality?: TCloudinaryQualityMode) => {
  if (!storySlug) throw new Error('characterId and storySlug are required');
  return getSignatureURL(`${storySlug}/characters`, quality);
};

/** Signature URL scoped to a specific story's gallery folder. */
const getGalleryImageUploadSignature = (storySlug: string, quality?: TCloudinaryQualityMode) => {
  if (!storySlug) throw new Error('storySlug is required');
  return getSignatureURL(`stories/${storySlug}/gallery`, quality);
};

/**
 * Given a Cloudinary public_id (returned by the client after a successful upload),
 * builds both the original and thumbnail URLs with configurable quality settings.
 *
 * @example
 * const { originalUrl, thumbnailUrl } = getCloudinaryImageUrls('stories/my-slug/image123');
 */
const getCloudinaryImageUrls = (
  publicId: string,
  options?: { quality?: TCloudinaryQualityMode; thumbnailQuality?: TCloudinaryQualityMode }
) => {
  const originalUrl = cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: options?.quality || 'auto',
  });

  const thumbnailUrl = cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: options?.thumbnailQuality || 'auto:eco',
  });

  return { originalUrl, thumbnailUrl };
};

/**
 * Deletes a Cloudinary asset by its public ID.
 *
 * The `resource_type` defaults to `'image'`; pass `'video'` or `'raw'`
 * when deleting non-image assets.
 *
 * @param publicId    - The Cloudinary public_id of the asset to delete.
 * @param resourceType - The resource type: `'image'` | `'video'` | `'raw'`.
 *                       Defaults to `'image'`.
 * @returns The Cloudinary API result object `{ result: 'ok' | 'not found' }`.
 *
 * @throws  When the Cloudinary API call fails (network error, invalid
 *          credentials, etc.).
 *
 * @example
 * // Delete an image
 * await deleteCloudinaryAsset('stories/my-slug/image123');
 *
 * // Delete a video
 * await deleteCloudinaryAsset('stories/my-slug/intro_video', 'video');
 */
const deleteCloudinaryAsset = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
) => {
  if (!publicId) {
    throw new Error('publicId is required to delete a Cloudinary asset');
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });

  return result;
};

/**
 * Given a Cloudinary public_id or image URL, generates a reduced-quality image URL
 * supporting different quality modes ('auto', 'auto:good', 'auto:eco', 'auto:low').
 */
const getReducedQualityImageUrl = (
  publicIdOrUrl: string,
  qualityMode: TCloudinaryQualityMode = 'auto:eco'
): string => {
  if (!publicIdOrUrl) return publicIdOrUrl;

  if (!publicIdOrUrl.startsWith('http://') && !publicIdOrUrl.startsWith('https://')) {
    return cloudinary.url(publicIdOrUrl, {
      secure: true,
      fetch_format: 'auto',
      quality: qualityMode,
    });
  }

  if (publicIdOrUrl.includes('/upload/') && !publicIdOrUrl.includes('/q_')) {
    return publicIdOrUrl.replace('/upload/', `/upload/q_${qualityMode},f_auto/`);
  }

  return publicIdOrUrl;
};

export {
  THUMBNAIL_TRANSFORMATION,
  CLOUDINARY_TRANSFORMATIONS,
  getSignatureURL,
  getStoryUploadSignature,
  getBundleUploadSignature,
  getCharacterUploadSignature,
  getGalleryImageUploadSignature,
  getCloudinaryImageUrls,
  getReducedQualityImageUrl,
  deleteCloudinaryAsset,
};
export type { TCloudinaryQualityMode };
