import { v2 as cloudinary } from 'cloudinary';
import { env } from '@config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Thumbnail transformation applied as an eager transformation on upload.
 * Cloudinary will generate this derived version automatically right after
 * the client finishes uploading the original image.
 *
 * w_400,h_300  → resize to 400×300
 * c_fill       → crop to fill the exact dimensions
 * q_auto       → auto-optimize quality
 * f_auto       → auto-choose best format (webp / avif on modern browsers)
 */
const THUMBNAIL_TRANSFORMATION = 'w_400,h_300,c_fill,q_auto,f_auto';

/**
 * Returns signed query-string params for a direct client-side upload to Cloudinary.
 * Includes an `eager` transformation so Cloudinary also stores a thumbnail
 * variant the moment the upload completes.
 *
 * Pass any folder path you need — the function is not tied to stories.
 *
 * @param folderPath - Cloudinary folder to upload into.
 *   Built-in helpers (`getStoryUploadSignature`, `getBundleUploadSignature`,
 *   `getCharacterUploadSignature`) construct this for you, or you can supply
 *   a fully custom path.
 *
 * @example
 * // Stories
 * getSignatureURL(`stories/${storySlug}`)
 *
 * // Bundles
 * getSignatureURL(`bundles/${bundleId}`)
 *
 * // Characters
 * getSignatureURL(`characters/${characterId}`)
 *
 * // Fully custom path
 * getSignatureURL('marketing/banners/2025')
 *
 * The client should POST these params (plus the file) to:
 *   https://api.cloudinary.com/v1_1/<cloud_name>/image/upload
 */
const getSignatureURL = (folderPath: string) => {
  if (!folderPath) {
    throw new Error('folderPath is required to generate a Cloudinary signature URL');
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // `eager` must be included in the signature so Cloudinary validates it.
  const paramsToSign = {
    eager: THUMBNAIL_TRANSFORMATION,
    folder: folderPath,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return (
    `?timestamp=${timestamp}` +
    `&signature=${signature}` +
    `&api_key=${env.CLOUDINARY_API_KEY}` +
    `&folder=${folderPath}` +
    `&eager=${encodeURIComponent(THUMBNAIL_TRANSFORMATION)}`
  );
};

// ---------------------------------------------------------------------------
// Convenience wrappers — keep call-sites readable without exposing folder
// path logic to every controller.
// ---------------------------------------------------------------------------

/** Signature URL scoped to a specific story's folder. */
const getStoryUploadSignature = (storySlug: string) => {
  if (!storySlug) throw new Error('storySlug is required');
  return getSignatureURL(`stories/${storySlug}`);
};

/** Signature URL scoped to a specific bundle's folder. */
const getBundleUploadSignature = () => {
  return getSignatureURL(`bundles`);
};

/** Signature URL scoped to a specific character's folder. */
const getCharacterUploadSignature = (characterId: string) => {
  if (!characterId) throw new Error('characterId is required');
  return getSignatureURL(`characters/${characterId}`);
};

/**
 * Given a Cloudinary public_id (returned by the client after a successful upload),
 * builds both the original and thumbnail URLs so you can persist them in the DB.
 *
 * @example
 * const { originalUrl, thumbnailUrl } = getCloudinaryImageUrls('stories/my-slug/image123');
 */
const getCloudinaryImageUrls = (publicId: string) => {
  const originalUrl = cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
  });

  const thumbnailUrl = cloudinary.url(publicId, {
    secure: true,
    width: 400,
    height: 300,
    crop: 'fill',
    fetch_format: 'auto',
    quality: 'auto',
  });

  return { originalUrl, thumbnailUrl };
};

export {
  getSignatureURL,
  getStoryUploadSignature,
  getBundleUploadSignature,
  getCharacterUploadSignature,
  getCloudinaryImageUrls,
};
