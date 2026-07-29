import { ImageAssetSchema } from '@/models/shared/imageAsset.schema';
import {
  APPEARANCE_ROLES,
  CHARACTER_GENDERS,
  CHARACTER_ROLES,
  CHARACTER_STATUSES,
  RELATIONSHIP_TYPES,
} from '@features/character/types/character-enum';
import { ICharacterDoc } from '@features/character/types/character.types';
import mongoose, { Schema } from 'mongoose';

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

const chapterAppearanceSchema = new Schema(
  {
    chapterSlug: { type: String, required: true },
    role: { type: String, enum: APPEARANCE_ROLES },
    description: { type: String, maxlength: 300 },
  },
  { _id: true }
);

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
      bravery: { type: Number, min: 1, max: 10 },
      intelligence: { type: Number, min: 1, max: 10 },
      loyalty: { type: Number, min: 1, max: 10 },
      cunning: { type: Number, min: 1, max: 10 },
      empathy: { type: Number, min: 1, max: 10 },
      ambition: { type: Number, min: 1, max: 10 },
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
