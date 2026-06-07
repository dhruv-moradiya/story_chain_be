import { objectIdSchema, dateSchema, ImageSchema } from './common.js';
import { createResponses, apiArrayResponse, apiResponse } from './helpers.js';

const CoinBundleRestrictionsSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      description: 'Restriction type (unlimited, one_time, daily, monthly, lifetime)',
    },
    dailyLimit: { type: 'number', nullable: true },
    monthlyLimit: { type: 'number', nullable: true },
    lifetimeLimit: { type: 'number', nullable: true },
    firstPurchaseOnly: { type: 'boolean' },
    perUserLimit: { type: 'number', nullable: true },
  },
};

export const CoinBundleSchema = {
  type: 'object',
  properties: {
    _id: objectIdSchema,

    // Identity
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    bundleType: { type: 'string' },

    // Coins
    baseCoins: { type: 'number' },
    bonusCoins: { type: 'number' },
    totalCoins: { type: 'number' },

    // Pricing
    inrPrice: { type: 'number', description: 'Price in INR paise' },
    usdPrice: { type: 'number', description: 'Price in USD cents' },
    currencies: { type: 'array', items: { type: 'string' } },

    // Display
    thumbnail: { ...ImageSchema, nullable: true },
    isFeatured: { type: 'boolean' },
    isPopular: { type: 'boolean' },
    displayOrder: { type: 'number' },
    promotionalBadge: { type: 'string', nullable: true },
    marketingTagline: { type: 'string', nullable: true },

    // Visibility & Lifecycle
    isActive: { type: 'boolean' },
    isDeleted: { type: 'boolean' },
    deletedAt: { ...dateSchema, nullable: true },
    startDate: { ...dateSchema, nullable: true },
    endDate: { ...dateSchema, nullable: true },
    startTime: { type: 'string', nullable: true },
    endTime: { type: 'string', nullable: true },
    timezone: { type: 'string' },

    // Purchase Restrictions
    restrictions: CoinBundleRestrictionsSchema,

    // Audit
    createdBy: { type: 'string' },
    updatedBy: { type: 'string', nullable: true },

    createdAt: dateSchema,
    updatedAt: dateSchema,
  },
};

export const CoinBundleResponses = {
  coinBundleCreated: createResponses(CoinBundleSchema, 'Coin bundle created successfully'),
  coinBundleAdminList: {
    200: apiArrayResponse(CoinBundleSchema, 'Coin bundles list fetched successfully'),
  },
  coinBundleUpdated: {
    200: apiResponse(CoinBundleSchema, 'Coin bundle updated successfully'),
  },
  coinBundleToggleActive: {
    200: apiResponse(
      {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          isActive: { type: 'boolean' },
          updatedAt: dateSchema,
        },
      },
      'isActive toggled successfully'
    ),
  },
  coinBundleDisplayOrder: {
    200: apiResponse(
      {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          displayOrder: { type: 'number' },
          updatedAt: dateSchema,
        },
      },
      'displayOrder updated successfully'
    ),
  },
  coinBundleThumbnailUpdated: {
    200: apiResponse(
      {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          thumbnail: { ...ImageSchema, nullable: true },
          updatedAt: dateSchema,
        },
      },
      'Coin bundle thumbnail updated successfully'
    ),
  },
  coinBundleDeleted: {
    200: apiResponse(
      {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          isDeleted: { type: 'boolean', const: true },
          deletedAt: dateSchema,
          deletedBy: { type: 'string' },
        },
      },
      'Coin bundle soft-deleted successfully'
    ),
  },
  signatureUrl: {
    200: apiResponse(
      {
        type: 'object',
        properties: {
          uploadURL: { type: 'string' },
        },
      },
      'Upload signature generated successfully'
    ),
  },
};
