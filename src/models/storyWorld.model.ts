import mongoose, { Schema } from 'mongoose';
import { IStoryWorldDoc } from '@features/storyWorld/types/storyWorld.types';
import { LOCATION_TYPES, FACTION_ALIGNMENTS } from '@features/storyWorld/types/storyWorld-enum';
import { ImageAssetSchema } from '@/models/shared/imageAsset.schema';

// ── Embedded: Location ────────────────────────────────────────────────────────
const locationSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    type: { type: String, enum: LOCATION_TYPES },
    description: { type: String, maxlength: 500 },
    coordinates: { type: String, maxlength: 200 },
    image: ImageAssetSchema,
    sortOrder: { type: Number, default: 0 },
    tags: [String],
  },
  { _id: true }
);

// ── Embedded: Faction ────────────────────────────────────────────────────────
const factionSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    alignment: { type: String, enum: FACTION_ALIGNMENTS },
    description: { type: String, maxlength: 500 },
    icon: { type: String, maxlength: 50 },
    sortOrder: { type: Number, default: 0 },
    tags: [String],
  },
  { _id: true }
);

// ── Embedded: Timeline Event ─────────────────────────────────────────────────
const timelineEventSchema = new Schema(
  {
    year: { type: String, required: true, maxlength: 50 },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, maxlength: 500 },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

// ── Root Schema ───────────────────────────────────────────────────────────────
const storyWorldSchema = new Schema<IStoryWorldDoc>(
  {
    storySlug: {
      type: String,
      required: true,
      unique: true,
      ref: 'Story',
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
    },

    // World Overview
    timePeriod: { type: String, maxlength: 100 },
    location: { type: String, maxlength: 200 },
    genre: { type: String, maxlength: 100 },
    atmosphere: { type: String, maxlength: 200 },
    worldDescription: { type: String, maxlength: 3000 },
    keyWorldElements: { type: [String], default: [] },

    // Embedded arrays
    locations: { type: [locationSchema], default: [] },
    factions: { type: [factionSchema], default: [] },
    timelineEvents: { type: [timelineEventSchema], default: [] },
  },
  { timestamps: true }
);

const StoryWorld = mongoose.model<IStoryWorldDoc>('StoryWorld', storyWorldSchema);

export { StoryWorld };
