import mongoose, { Schema } from 'mongoose';
import { ICharacterDoc } from '@features/character/types/character.types';
import {
  CHARACTER_ROLES,
  CHARACTER_GENDERS,
  CHARACTER_STATUSES,
  ATTRIBUTE_LEVELS,
  RELATIONSHIP_TYPES,
  APPEARANCE_ROLES,
} from '@features/character/types/character-enum';
import { ImageAssetSchema } from '@/models/shared/imageAsset.schema';

// ── Embedded: Relationship ────────────────────────────────────────────────────
const relationshipSchema = new Schema(
  {
    toCharacterId: { type: Schema.Types.ObjectId, required: true, ref: 'Character' },
    relationshipType: { type: String, enum: RELATIONSHIP_TYPES },
    label: { type: String, maxlength: 100 },
    description: { type: String, maxlength: 300 },
    strengthPercentage: { type: Number, min: 0, max: 100, default: 50 },
  },
  { _id: true }
);

// ── Embedded: Chapter Appearance ──────────────────────────────────────────────
const chapterAppearanceSchema = new Schema(
  {
    chapterSlug: { type: String, required: true },
    role: { type: String, enum: APPEARANCE_ROLES },
    description: { type: String, maxlength: 300 },
  },
  { _id: true }
);

// ── Root Schema ───────────────────────────────────────────────────────────────
const characterSchema = new Schema<ICharacterDoc>(
  {
    storySlug: { type: String, required: true, ref: 'Story', index: true },
    createdBy: { type: String, required: true, ref: 'User' },

    // Basic Information
    image: ImageAssetSchema,
    fullName: { type: String, required: true, maxlength: 200 },
    nickname: { type: String, maxlength: 100 },
    roleInStory: { type: String, enum: CHARACTER_ROLES, required: true, index: true },
    age: { type: Number, min: 0, max: 999 },
    gender: { type: String, enum: CHARACTER_GENDERS },
    nationality: { type: String, maxlength: 150 },
    occupation: { type: String, maxlength: 150 },
    statusInStory: { type: String, enum: CHARACTER_STATUSES },

    // About
    biography: { type: String, maxlength: 1000 },
    personality: { type: String, maxlength: 500 },
    motivationGoal: { type: String, maxlength: 500 },

    // Personal Details
    languages: { type: [String], default: [] },
    birthplace: { type: String, maxlength: 200 },
    family: { type: String, maxlength: 500 },
    education: { type: String, maxlength: 500 },

    // Additional Details
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    greatestFear: { type: String, maxlength: 300 },
    habitsQuirks: { type: String, maxlength: 300 },
    secrets: { type: String, maxlength: 500 },

    // Appearance
    appearance: {
      height: { type: String, maxlength: 50 },
      build: { type: String, maxlength: 50 },
      hair: { type: String, maxlength: 100 },
      eyes: { type: String, maxlength: 100 },
      distinctiveFeatures: { type: String, maxlength: 300 },
      clothingStyle: { type: String, maxlength: 300 },
    },

    // Attributes (radar chart)
    attributes: {
      bravery: { type: String, enum: ATTRIBUTE_LEVELS },
      intelligence: { type: String, enum: ATTRIBUTE_LEVELS },
      loyalty: { type: String, enum: ATTRIBUTE_LEVELS },
      cunning: { type: String, enum: ATTRIBUTE_LEVELS },
      empathy: { type: String, enum: ATTRIBUTE_LEVELS },
      ambition: { type: String, enum: ATTRIBUTE_LEVELS },
    },

    // Detail extras
    quote: { type: String, maxlength: 300 },
    quickFacts: { type: [String], default: [] },
    firstAppearsChapterSlug: { type: String },

    tags: { type: [String], default: [] },

    // Embedded arrays
    relationships: { type: [relationshipSchema], default: [] },
    appearances: { type: [chapterAppearanceSchema], default: [] },
  },
  { timestamps: true }
);

// Indexes
characterSchema.index({ storySlug: 1, roleInStory: 1 });
characterSchema.index({ storySlug: 1, createdAt: -1 });
characterSchema.index({ storySlug: 1, fullName: 1 }); // powers relationship search picker
characterSchema.index({ 'appearances.chapterSlug': 1 }, { sparse: true }); // query "who appears in chapter X"

const Character = mongoose.model<ICharacterDoc>('Character', characterSchema);

export { Character };
