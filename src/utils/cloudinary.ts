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
 * The client should POST these params (plus the file) to:
 *   https://api.cloudinary.com/v1_1/<cloud_name>/image/upload
 */
const getSignatureURL = (slug: string) => {
  if (!slug) {
    throw new Error('Story slug is required to generate signature URL');
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // `eager` must be included in the signature so Cloudinary validates it.
  const paramsToSign = {
    eager: THUMBNAIL_TRANSFORMATION,
    folder: `stories/${slug}`,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return (
    `?timestamp=${timestamp}` +
    `&signature=${signature}` +
    `&api_key=${env.CLOUDINARY_API_KEY}` +
    `&folder=stories/${slug}` +
    `&eager=${encodeURIComponent(THUMBNAIL_TRANSFORMATION)}`
  );
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

export { getSignatureURL, getCloudinaryImageUrls };
