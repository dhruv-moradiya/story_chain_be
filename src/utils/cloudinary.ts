import { v2 as cloudinary } from 'cloudinary';
import { env } from '@config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const getSignatureURL = (slug: string) => {
  if (!slug) {
    throw new Error('Story slug is required to generate signature URL');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder: `stories/${slug}`,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return `?timestamp=${timestamp}&signature=${signature}&api_key=${env.CLOUDINARY_API_KEY}&folder=stories/${slug}`;
};

export { getSignatureURL };
